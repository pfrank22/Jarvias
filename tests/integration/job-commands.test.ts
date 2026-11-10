import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runJobCommand } from "@/server/job-commands";
import { ctxFor, makeCompany, makeJob, makeMember, resetDatabase } from "./helpers";

async function setup(jobOverrides: Record<string, unknown> = {}) {
  const company = await makeCompany("Harborview Fictional");
  const other = await makeCompany("Elsewhere Fictional");
  const pm = await makeMember(company.id, "MANAGER");
  const viewer = await makeMember(company.id, "VIEWER");
  const job = await makeJob(company.id, { track: "UNDECIDED", stage: "INTAKE", ...jobOverrides });
  const otherJob = await makeJob(other.id);
  return {
    job,
    otherJob,
    ctx: ctxFor(pm, company, "MANAGER"),
    viewerCtx: ctxFor(viewer, company, "VIEWER"),
  };
}

const reload = (id: string) => db.job.findUniqueOrThrow({ where: { id } });

describe("job commands", () => {
  beforeEach(resetDatabase);
  afterAll(() => db.$disconnect());

  it("runs the retail path: lines, margin, sent, accepted, then budgeting", async () => {
    const { job, ctx } = await setup();
    const run = (cmd: Record<string, unknown>) => runJobCommand(ctx, { jobId: job.id, ...cmd });

    await run({ cmd: "chooseTrack", track: "RETAIL" });
    await run({ cmd: "startPath" });
    await expect(run({ cmd: "estimateSent" })).rejects.toMatchObject({ code: "INVALID" }); // no lines yet
    await run({ cmd: "addLine", description: "Drywall (fictional bid)", cost: "1,000" });
    await run({ cmd: "addLine", description: "Paint", cost: "500.00" });
    await expect(run({ cmd: "startBudgeting" })).rejects.toMatchObject({ code: "INVALID" }); // gate closed
    await run({ cmd: "estimateSent" });
    await run({ cmd: "customerAccepted" });

    const accepted = await reload(job.id);
    expect(accepted.stage).toBe("RETAIL_ACCEPTED");
    expect(accepted.contractCents).toBe(300_000); // $1,500 cost at 50% margin

    await run({ cmd: "startBudgeting" });
    expect((await reload(job.id)).stage).toBe("BUDGETING");
  });

  it("uses the per-estimate margin", async () => {
    const { job, ctx } = await setup({ track: "RETAIL", stage: "RETAIL_BIDDING" });
    const run = (cmd: Record<string, unknown>) => runJobCommand(ctx, { jobId: job.id, ...cmd });
    await run({ cmd: "addLine", description: "Tile", cost: "1000" });
    await run({ cmd: "setMargin", marginPct: "40" });
    await expect(run({ cmd: "setMargin", marginPct: "95" })).rejects.toMatchObject({
      code: "INVALID",
    });
    await run({ cmd: "estimateSent" });
    await run({ cmd: "customerAccepted" });
    expect((await reload(job.id)).contractCents).toBe(166_667);
  });

  it("runs the insurance path and opens the gate only on scope AND amount", async () => {
    const { job, ctx } = await setup({ track: "INSURANCE" });
    const run = (cmd: Record<string, unknown>) => runJobCommand(ctx, { jobId: job.id, ...cmd });

    await run({ cmd: "startPath" });
    await expect(run({ cmd: "adjuster", kind: "SUBMITTED" })).rejects.toMatchObject({
      code: "INVALID",
    }); // package incomplete

    await run({ cmd: "intake", milestone: "workAuthSigned" });
    for (const [kind, status] of [
      ["ESTIMATE", "RECEIVED"],
      ["SIGNED_CONTRACT", "SIGNED"],
      ["SUB_BID", "RECEIVED"],
    ] as const) {
      await db.jobDocument.create({
        data: { companyId: ctx.companyId, jobId: job.id, kind, status, title: kind },
      });
    }
    await run({ cmd: "adjuster", kind: "SUBMITTED" });
    await run({
      cmd: "adjuster",
      kind: "REVISION_REQUESTED",
      note: "Adjuster wants a second drywall bid",
    });
    await run({ cmd: "adjuster", kind: "RESUBMITTED" });
    await run({ cmd: "adjuster", kind: "SCOPE_APPROVED" });
    expect((await reload(job.id)).stage).toBe("INS_SUBMITTED");
    await expect(run({ cmd: "startBudgeting" })).rejects.toMatchObject({ code: "INVALID" });

    await run({ cmd: "adjuster", kind: "AMOUNT_AGREED", amount: "48,650.00" });
    const agreed = await reload(job.id);
    expect(agreed.stage).toBe("INS_AGREED");
    expect(agreed.contractCents).toBe(4_865_000);
    expect(await db.adjusterEvent.count({ where: { jobId: job.id } })).toBe(5);

    await run({ cmd: "startBudgeting" });
    expect((await reload(job.id)).stage).toBe("BUDGETING");
  });

  it("marks the tracked work authorization document signed with the milestone", async () => {
    const { job, ctx } = await setup();
    const doc = await db.jobDocument.create({
      data: {
        companyId: ctx.companyId,
        jobId: job.id,
        kind: "WORK_AUTHORIZATION",
        status: "MISSING",
        title: "WA",
      },
    });
    await runJobCommand(ctx, { jobId: job.id, cmd: "intake", milestone: "workAuthSigned" });
    expect((await db.jobDocument.findUniqueOrThrow({ where: { id: doc.id } })).status).toBe(
      "SIGNED",
    );
  });

  it("schedules a job walk in the app time zone", async () => {
    const { job, ctx } = await setup();
    await runJobCommand(ctx, {
      jobId: job.id,
      cmd: "intake",
      milestone: "walkScheduled",
      at: "2026-11-12T09:30",
    });
    expect((await reload(job.id)).jobWalkScheduledFor?.toISOString()).toBe(
      "2026-11-12T15:30:00.000Z",
    );
  });

  it("refuses other companies' jobs and lines", async () => {
    const { otherJob, ctx } = await setup();
    await expect(
      runJobCommand(ctx, { jobId: otherJob.id, cmd: "markLost", reason: "test" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    const theirs = await db.estimateLine.create({
      data: { companyId: otherJob.companyId, jobId: otherJob.id, description: "x", costCents: 1 },
    });
    const { job } = await setup();
    await expect(
      runJobCommand(ctx, { jobId: job.id, cmd: "removeLine", lineId: theirs.id }),
    ).rejects.toThrow();
    expect(await db.estimateLine.count({ where: { id: theirs.id } })).toBe(1);
  });

  it("forbids viewers and closed jobs", async () => {
    const { job, ctx, viewerCtx } = await setup();
    await expect(
      runJobCommand(viewerCtx, { jobId: job.id, cmd: "startPath" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await runJobCommand(ctx, {
      jobId: job.id,
      cmd: "markLost",
      reason: "Homeowner went with another contractor",
    });
    await expect(
      runJobCommand(ctx, { jobId: job.id, cmd: "chooseTrack", track: "RETAIL" }),
    ).rejects.toMatchObject({
      code: "INVALID",
    });
  });

  it("lets only one of two simultaneous stage changes win", async () => {
    // Whether the calls overlap (stage guard) or run back to back (policy), exactly one may succeed.
    const { job, ctx } = await setup({ track: "RETAIL" });
    const results = await Promise.allSettled([
      runJobCommand(ctx, { jobId: job.id, cmd: "startPath" }),
      runJobCommand(ctx, { jobId: job.id, cmd: "startPath" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.activityLog.count({ where: { entityId: job.id } })).toBe(1);
  });
});
