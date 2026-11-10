import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  getDecisionQueue,
  getJob,
  getJobDashboard,
  listJobs,
  resolveDecision,
  transitionAction,
} from "@/server/jobs";
import { ctxFor, makeAction, makeCompany, makeJob, makeMember, resetDatabase } from "./helpers";

async function setup() {
  const mine = await makeCompany("Harborview Fictional");
  const other = await makeCompany("Elsewhere Fictional");
  const pm = await makeMember(mine.id, "MANAGER");
  const member = await makeMember(mine.id, "MEMBER");
  const otherPm = await makeMember(other.id, "MANAGER");
  const job = await makeJob(mine.id);
  const otherJob = await makeJob(other.id, {
    homeownerName: "Other Fictional",
    referringPlumberId: null,
  });
  return {
    job,
    otherJob,
    ctx: ctxFor(pm, mine, "MANAGER"),
    memberCtx: ctxFor(member, mine, "MEMBER"),
    otherCtx: ctxFor(otherPm, other, "MANAGER"),
  };
}

describe("jobs: tenant isolation", () => {
  beforeEach(resetDatabase);
  afterAll(() => db.$disconnect());

  it("lists only the active company's jobs", async () => {
    const s = await setup();
    expect((await listJobs(s.ctx)).map((j) => j.id)).toEqual([s.job.id]);
  });

  it("treats another company's job as not found", async () => {
    const s = await setup();
    await expect(getJob(s.ctx, s.otherJob.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("cannot change another company's action or decision", async () => {
    const s = await setup();
    const action = await makeAction(s.otherCtx.companyId, s.otherJob.id);
    const decision = await db.decision.create({
      data: {
        companyId: s.otherCtx.companyId,
        jobId: s.otherJob.id,
        kind: "OTHER",
        title: "Theirs",
      },
    });
    await expect(
      transitionAction(s.ctx, { actionId: action.id, to: "SENT" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      resolveDecision(s.ctx, { decisionId: decision.id, outcome: "RESOLVED" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await db.jobAction.findUniqueOrThrow({ where: { id: action.id } })).status).toBe(
      "DRAFT",
    );
    expect((await db.decision.findUniqueOrThrow({ where: { id: decision.id } })).status).toBe(
      "OPEN",
    );
  });

  it("builds the decision queue and dashboard from the active company only", async () => {
    const s = await setup();
    // Only the OTHER company's job lacks a plumber; my queue must not show it.
    await db.job.update({ where: { id: s.job.id }, data: { referringPlumberId: null } });
    const queue = await getDecisionQueue(s.ctx);
    expect(queue.map((q) => q.jobId)).toEqual([s.job.id]);
    const dash = await getJobDashboard(s.ctx);
    expect(dash.activeJobs.map((j) => j.id)).toEqual([s.job.id]);
  });

  it("database rejects documents or actions linked to another company's job", async () => {
    const s = await setup();
    await expect(
      db.jobDocument.create({
        data: { companyId: s.ctx.companyId, jobId: s.otherJob.id, kind: "PHOTOS", title: "x" },
      }),
    ).rejects.toThrow();
    await expect(makeAction(s.ctx.companyId, s.otherJob.id)).rejects.toThrow();
  });
});

describe("transitionAction", () => {
  beforeEach(resetDatabase);
  afterAll(() => db.$disconnect());

  it("marks a routine draft sent, records progress and an audit entry", async () => {
    const s = await setup();
    const before = await db.job.findUniqueOrThrow({ where: { id: s.job.id } });
    const action = await makeAction(s.ctx.companyId, s.job.id);
    await expect(
      transitionAction(s.ctx, { actionId: action.id, to: "SENT" }),
    ).resolves.toMatchObject({
      status: "SENT",
    });
    const row = await db.jobAction.findUniqueOrThrow({ where: { id: action.id } });
    expect(row.sentAt).not.toBeNull();
    const job = await db.job.findUniqueOrThrow({ where: { id: s.job.id } });
    expect(job.lastProgressAt.getTime()).toBeGreaterThanOrEqual(before.lastProgressAt.getTime());
    expect(await db.activityLog.count({ where: { entityId: action.id } })).toBe(1);
  });

  it("refuses to send a price-change message without approval", async () => {
    const s = await setup();
    const action = await makeAction(s.ctx.companyId, s.job.id, { reviewReason: "PRICE_CHANGE" });
    await expect(
      transitionAction(s.ctx, { actionId: action.id, to: "SENT" }),
    ).rejects.toMatchObject({
      code: "INVALID",
    });
    await transitionAction(s.ctx, { actionId: action.id, to: "PENDING_APPROVAL" });
    await expect(
      transitionAction(s.ctx, { actionId: action.id, to: "SENT" }),
    ).resolves.toMatchObject({
      status: "SENT",
    });
  });

  it("never completes a draft", async () => {
    const s = await setup();
    const action = await makeAction(s.ctx.companyId, s.job.id);
    await expect(
      transitionAction(s.ctx, { actionId: action.id, to: "COMPLETED" }),
    ).rejects.toMatchObject({
      code: "INVALID",
    });
  });

  it("forbids members", async () => {
    const s = await setup();
    const action = await makeAction(s.ctx.companyId, s.job.id);
    await expect(
      transitionAction(s.memberCtx, { actionId: action.id, to: "SENT" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets only one of two concurrent updates apply", async () => {
    const s = await setup();
    const action = await makeAction(s.ctx.companyId, s.job.id);
    const results = await Promise.allSettled([
      transitionAction(s.ctx, { actionId: action.id, to: "SENT" }),
      transitionAction(s.ctx, { actionId: action.id, to: "CANCELLED" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("resolves a decision once", async () => {
    const s = await setup();
    const d = await db.decision.create({
      data: {
        companyId: s.ctx.companyId,
        jobId: s.job.id,
        kind: "DELAY_OR_PROBLEM",
        title: "Drywall delayed",
      },
    });
    await resolveDecision(s.ctx, {
      decisionId: d.id,
      outcome: "RESOLVED",
      resolution: "Moved to Friday",
    });
    await expect(
      resolveDecision(s.ctx, { decisionId: d.id, outcome: "RESOLVED" }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
