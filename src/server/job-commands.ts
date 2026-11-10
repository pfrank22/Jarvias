import { z } from "zod";
import { db } from "@/lib/db";
import { parseDollarsToCents } from "@/lib/money";
import { zonedLocalToUtc } from "@/lib/time";
import { conflict, forbidden, invalid, notFound } from "./errors";
import { canEnterStage, isActive } from "./job-policy";
import {
  adjusterEvent,
  chooseTrack,
  markCustomerAccepted,
  markEstimateSent,
  retailTotals,
  startPath,
  submissionPackage,
  validateMarginBps,
  type Change,
  type PathResult,
} from "./path-policy";
import { hasRoleAtLeast, type TenantContext } from "./tenant";

const id = z.string().min(1).max(64);
const text = (max: number) => z.string().trim().max(max);

export const jobCommand = z.discriminatedUnion("cmd", [
  z.object({
    cmd: z.literal("intake"),
    jobId: id,
    milestone: z.enum([
      "called",
      "walkScheduled",
      "walkCompleted",
      "workAuthSent",
      "workAuthSigned",
    ]),
    at: z.string().max(32).optional(),
  }),
  z.object({ cmd: z.literal("chooseTrack"), jobId: id, track: z.enum(["RETAIL", "INSURANCE"]) }),
  z.object({ cmd: z.literal("startPath"), jobId: id }),
  z.object({
    cmd: z.literal("addLine"),
    jobId: id,
    description: text(200).min(2, "Describe the line."),
    vendor: text(120).optional(),
    cost: z.string().max(32),
  }),
  z.object({ cmd: z.literal("removeLine"), jobId: id, lineId: id }),
  z.object({ cmd: z.literal("setMargin"), jobId: id, marginPct: z.string().max(10) }),
  z.object({ cmd: z.literal("setCustomerScope"), jobId: id, text: text(5000) }),
  z.object({ cmd: z.literal("estimateSent"), jobId: id }),
  z.object({ cmd: z.literal("customerAccepted"), jobId: id }),
  z.object({
    cmd: z.literal("adjuster"),
    jobId: id,
    kind: z.enum([
      "SUBMITTED",
      "RESPONSE",
      "REVISION_REQUESTED",
      "RESUBMITTED",
      "SCOPE_APPROVED",
      "AMOUNT_AGREED",
    ]),
    note: text(2000).optional(),
    amount: z.string().max(32).optional(),
  }),
  z.object({ cmd: z.literal("startBudgeting"), jobId: id }),
  z.object({
    cmd: z.literal("markLost"),
    jobId: id,
    reason: text(500).min(3, "Say why the job was lost."),
  }),
]);
export type JobCommand = z.infer<typeof jobCommand>;

function parsePercentToBps(input: string): number | null {
  const m = input
    .trim()
    .replace(/%$/, "")
    .match(/^(\d{1,2})(?:\.(\d{1,2}))?$/);
  if (!m || !m[1]) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

function must(result: PathResult): Change {
  if (!result.allowed) throw invalid(result.reason);
  return result.change;
}

/**
 * Apply one job command. All checks run inside a transaction on a fresh read, and
 * the write is guarded on the stage that was read, so two people acting at once
 * can't both move the job.
 */
export async function runJobCommand(ctx: TenantContext, raw: unknown) {
  if (!hasRoleAtLeast(ctx.role, "MANAGER")) throw forbidden("Only managers can update jobs.");
  const parsed = jobCommand.safeParse(raw);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Invalid request.");
  const c = parsed.data;

  return db.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: { id: c.jobId, companyId: ctx.companyId },
      include: {
        documents: { select: { kind: true, status: true } },
        estimateLines: { select: { id: true, costCents: true } },
      },
    });
    if (!job) throw notFound("Job");
    if (!isActive(job.stage)) throw invalid("This job is closed.");
    const now = new Date();

    let change: Change & Record<string, unknown> = {};
    let progress = true;
    let audit: Record<string, unknown> = {};

    switch (c.cmd) {
      case "intake": {
        const field = {
          called: "homeownerCalledAt",
          walkScheduled: "jobWalkScheduledFor",
          walkCompleted: "jobWalkCompletedAt",
          workAuthSent: "workAuthSentAt",
          workAuthSigned: "workAuthSignedAt",
        }[c.milestone];
        let at = now;
        if (c.milestone === "walkScheduled") {
          const when = c.at ? zonedLocalToUtc(c.at) : null;
          if (!when) throw invalid("Pick the date and time of the job walk.");
          at = when;
        }
        change = { [field]: at };
        if (c.milestone === "workAuthSigned") {
          // Keep the document tracker in step with the milestone.
          await tx.jobDocument.updateMany({
            where: {
              jobId: job.id,
              companyId: ctx.companyId,
              kind: "WORK_AUTHORIZATION",
              status: { not: "SIGNED" },
            },
            data: { status: "SIGNED" },
          });
        }
        break;
      }
      case "chooseTrack":
        change = must(chooseTrack(job, c.track));
        break;
      case "startPath":
        change = must(startPath(job));
        break;
      case "addLine": {
        if (job.track !== "RETAIL") throw invalid("Cost lines are for retail estimates.");
        const costCents = parseDollarsToCents(c.cost);
        if (costCents === null || Number.isNaN(costCents))
          throw invalid("Enter the cost in dollars, e.g. 1,250.00.");
        const line = await tx.estimateLine.create({
          data: {
            companyId: ctx.companyId,
            jobId: job.id,
            description: c.description,
            vendor: c.vendor || null,
            costCents,
          },
        });
        audit = { lineId: line.id, costCents };
        progress = false;
        break;
      }
      case "removeLine": {
        const removed = await tx.estimateLine.deleteMany({
          where: { id: c.lineId, jobId: job.id, companyId: ctx.companyId },
        });
        if (removed.count !== 1) throw notFound("Estimate line");
        audit = { lineId: c.lineId };
        progress = false;
        break;
      }
      case "setMargin": {
        if (job.track !== "RETAIL") throw invalid("The margin setting is for retail estimates.");
        const bps = parsePercentToBps(c.marginPct);
        const ok =
          bps === null
            ? { allowed: false as const, reason: "Enter a margin like 50 or 42.5." }
            : validateMarginBps(bps);
        if (!ok.allowed) throw invalid(ok.reason);
        change = { marginBps: bps as number };
        progress = false;
        break;
      }
      case "setCustomerScope":
        change = { customerScopeText: c.text };
        progress = false;
        break;
      case "estimateSent":
        change = must(markEstimateSent(job, job.estimateLines.length, now));
        break;
      case "customerAccepted": {
        const { priceCents } = retailTotals(job.estimateLines, job.marginBps);
        change = must(markCustomerAccepted(job, priceCents, now));
        break;
      }
      case "adjuster": {
        let amountCents: number | undefined;
        if (c.kind === "AMOUNT_AGREED") {
          const parsedAmount = parseDollarsToCents(c.amount);
          if (parsedAmount === null || Number.isNaN(parsedAmount) || parsedAmount === 0) {
            throw invalid("Enter the amount agreed with the adjuster.");
          }
          amountCents = parsedAmount;
        }
        const packageReady = submissionPackage(job, job.documents).every((i) => i.ok);
        change = must(adjusterEvent(job, c.kind, { now, amountCents, packageReady }));
        await tx.adjusterEvent.create({
          data: {
            companyId: ctx.companyId,
            jobId: job.id,
            kind: c.kind,
            note: c.note ?? "",
            amountCents: amountCents ?? null,
            actorId: ctx.userId,
            occurredAt: now,
          },
        });
        progress = c.kind !== "RESPONSE";
        break;
      }
      case "startBudgeting": {
        const ok = canEnterStage(job, "BUDGETING");
        if (!ok.allowed) throw invalid(ok.reason);
        change = { stage: "BUDGETING" };
        break;
      }
      case "markLost":
        change = { stage: "LOST" };
        audit = { reason: c.reason };
        break;
    }

    if (Object.keys(change).length > 0 || progress) {
      const result = await tx.job.updateMany({
        where: { id: job.id, companyId: ctx.companyId, stage: job.stage },
        data: { ...change, ...(progress ? { lastProgressAt: now } : {}) },
      });
      if (result.count !== 1)
        throw conflict("This job was changed by someone else. Refresh and try again.");
    }

    await tx.activityLog.create({
      data: {
        companyId: ctx.companyId,
        actorId: ctx.userId,
        action: `job.${c.cmd}`,
        entityType: "Job",
        entityId: job.id,
        metadata: JSON.parse(
          JSON.stringify({ ...audit, ...change, ...("kind" in c ? { kind: c.kind } : {}) }),
        ),
      },
    });
    return { jobId: job.id, cmd: c.cmd };
  });
}
