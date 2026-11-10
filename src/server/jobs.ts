import { z } from "zod";
import { db } from "@/lib/db";
import type { ActionStatus } from "@/generated/prisma/enums";
import { canTransition } from "./action-policy";
import { buildDecisionQueue } from "./decision-queue";
import { conflict, forbidden, invalid, notFound } from "./errors";
import { daysSinceProgress, isActive, nextStep } from "./job-policy";
import { hasRoleAtLeast, type TenantContext } from "./tenant";

const OPEN_ACTION_STATUSES: ActionStatus[] = ["DRAFT", "PENDING_APPROVAL", "SENT", "FAILED"];

export async function listJobs(ctx: TenantContext) {
  const jobs = await db.job.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ lastProgressAt: "asc" }],
    include: {
      referringPlumber: { select: { id: true, name: true } },
      _count: { select: { actions: { where: { status: { in: OPEN_ACTION_STATUSES } } } } },
    },
  });
  return jobs;
}

export async function getJob(ctx: TenantContext, jobId: string) {
  const job = await db.job.findFirst({
    where: { id: jobId, companyId: ctx.companyId },
    include: {
      manager: { select: { id: true, name: true } },
      referringPlumber: { select: { id: true, name: true, phone: true, email: true } },
      mitigationContact: { select: { id: true, name: true, phone: true, email: true } },
      documents: { orderBy: [{ kind: "asc" }, { createdAt: "asc" }] },
      actions: { orderBy: [{ createdAt: "desc" }] },
      decisions: {
        where: { status: "OPEN" },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!job) throw notFound("Job");
  return job;
}

async function loadQueueInput(ctx: TenantContext) {
  const [jobs, pendingActions, decisions] = await Promise.all([
    db.job.findMany({ where: { companyId: ctx.companyId } }),
    db.jobAction.findMany({
      where: { companyId: ctx.companyId, status: "PENDING_APPROVAL" },
      select: {
        id: true,
        jobId: true,
        title: true,
        channel: true,
        reviewReason: true,
        dueAt: true,
      },
    }),
    db.decision.findMany({
      where: { companyId: ctx.companyId, status: "OPEN" },
      select: {
        id: true,
        jobId: true,
        kind: true,
        title: true,
        detail: true,
        priority: true,
        dueAt: true,
      },
    }),
  ]);
  return { jobs, pendingActions, decisions };
}

export async function getDecisionQueue(ctx: TenantContext) {
  return buildDecisionQueue(await loadQueueInput(ctx));
}

const WEEK_MS = 7 * 86_400_000;

export async function getJobDashboard(ctx: TenantContext, now: Date = new Date()) {
  const horizon = new Date(now.getTime() + WEEK_MS);
  const queueInput = await loadQueueInput(ctx);
  const [openActions, awaitingReplies] = await Promise.all([
    db.jobAction.findMany({
      where: { companyId: ctx.companyId, status: { in: ["DRAFT", "PENDING_APPROVAL", "FAILED"] } },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: 8,
      include: { job: { select: { id: true, number: true, homeownerName: true } } },
    }),
    db.jobAction.findMany({
      where: { companyId: ctx.companyId, status: "SENT", awaitingReplySince: { not: null } },
      orderBy: { awaitingReplySince: "asc" },
      include: { job: { select: { id: true, number: true, homeownerName: true } } },
    }),
  ]);

  const activeJobs = queueInput.jobs
    .filter((j) => isActive(j.stage))
    .map((j) => ({ ...j, nextStep: nextStep(j), daysStalled: daysSinceProgress(j, now) }))
    // Stalled longest first: keeping projects moving is the priority.
    .sort((a, b) => b.daysStalled - a.daysStalled);

  const calendar = [
    ...queueInput.jobs
      .filter(
        (j) => j.jobWalkScheduledFor && !j.jobWalkCompletedAt && j.jobWalkScheduledFor <= horizon,
      )
      .map((j) => ({
        key: `walk:${j.id}`,
        at: j.jobWalkScheduledFor as Date,
        title: "Job walk",
        jobId: j.id,
        jobName: j.homeownerName,
      })),
    ...openActions
      .filter((a) => a.dueAt && a.dueAt <= horizon)
      .map((a) => ({
        key: `action:${a.id}`,
        at: a.dueAt as Date,
        title: a.title,
        jobId: a.job.id,
        jobName: a.job.homeownerName,
      })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    decisions: buildDecisionQueue(queueInput),
    activeJobs,
    nextActions: openActions,
    awaitingReplies,
    calendar,
  };
}

const transitionInput = z.object({
  actionId: z.string().min(1).max(64),
  to: z.enum(["PENDING_APPROVAL", "SENT", "COMPLETED", "CANCELLED", "FAILED", "DRAFT"]),
});

/**
 * Move an action to a new state. "Sent" here means the manager confirms it was sent
 * (no messaging integration is connected); Jarvis itself sends nothing.
 */
export async function transitionAction(ctx: TenantContext, raw: unknown) {
  if (!hasRoleAtLeast(ctx.role, "MANAGER"))
    throw forbidden("Only managers can update job actions.");
  const parsed = transitionInput.safeParse(raw);
  if (!parsed.success) throw invalid("Invalid action update.");
  const { actionId, to } = parsed.data;

  return db.$transaction(async (tx) => {
    const action = await tx.jobAction.findFirst({
      where: { id: actionId, companyId: ctx.companyId },
    });
    if (!action) throw notFound("Action");
    const policy = canTransition(action, to);
    if (!policy.allowed) throw invalid(policy.reason);

    const now = new Date();
    const result = await tx.jobAction.updateMany({
      // Guard on the status we read so concurrent updates can't both apply.
      where: { id: action.id, companyId: ctx.companyId, status: action.status },
      data: {
        status: to,
        ...(to === "SENT" ? { sentAt: now } : {}),
        ...(to === "COMPLETED" ? { completedAt: now, awaitingReplySince: null } : {}),
        ...(to === "CANCELLED" ? { awaitingReplySince: null } : {}),
      },
    });
    if (result.count !== 1)
      throw conflict("This action was changed by someone else. Refresh and try again.");

    if (to === "SENT" || to === "COMPLETED") {
      await tx.job.updateMany({
        where: { id: action.jobId, companyId: ctx.companyId },
        data: { lastProgressAt: now },
      });
    }
    await tx.activityLog.create({
      data: {
        companyId: ctx.companyId,
        actorId: ctx.userId,
        action: `jobAction.${to.toLowerCase()}`,
        entityType: "JobAction",
        entityId: action.id,
        metadata: { title: action.title, from: action.status, to },
      },
    });
    return { id: action.id, status: to };
  });
}

const resolveInput = z.object({
  decisionId: z.string().min(1).max(64),
  outcome: z.enum(["RESOLVED", "DISMISSED"]),
  resolution: z.string().trim().max(1000).optional(),
});

export async function resolveDecision(ctx: TenantContext, raw: unknown) {
  if (!hasRoleAtLeast(ctx.role, "MANAGER")) throw forbidden("Only managers can resolve decisions.");
  const parsed = resolveInput.safeParse(raw);
  if (!parsed.success) throw invalid("Invalid decision update.");
  const { decisionId, outcome, resolution } = parsed.data;

  const result = await db.decision.updateMany({
    where: { id: decisionId, companyId: ctx.companyId, status: "OPEN" },
    data: { status: outcome, resolvedAt: new Date(), resolution: resolution || null },
  });
  if (result.count !== 1) {
    const exists = await db.decision.findFirst({
      where: { id: decisionId, companyId: ctx.companyId },
    });
    throw exists ? conflict("This decision was already closed.") : notFound("Decision");
  }
  return { id: decisionId, status: outcome };
}
