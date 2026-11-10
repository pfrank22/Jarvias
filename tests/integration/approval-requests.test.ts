import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createApprovalRequest, decideApproval, listApprovals } from "@/server/approvals";
import { ctxFor, makeCompany, makeMember, makeProject, resetDatabase } from "./helpers";

describe("createApprovalRequest", () => {
  beforeEach(resetDatabase);
  afterAll(() => db.$disconnect());

  async function setup() {
    const company = await makeCompany("Umbrella Fictional");
    const other = await makeCompany("Hooli Fictional");
    const member = await makeMember(company.id, "MEMBER");
    const viewer = await makeMember(company.id, "VIEWER");
    const manager = await makeMember(company.id, "MANAGER");
    const project = await makeProject(company.id, "UM-1");
    const otherProject = await makeProject(other.id, "HO-1");
    return {
      project,
      otherProject,
      memberCtx: ctxFor(member, company, "MEMBER"),
      viewerCtx: ctxFor(viewer, company, "VIEWER"),
      managerCtx: ctxFor(manager, company, "MANAGER"),
    };
  }

  const valid = (overrides: Record<string, unknown> = {}) => ({
    type: "PURCHASE",
    title: "Tile saw rental",
    amount: "1,234.50",
    priority: "HIGH",
    dueDate: "2026-12-01",
    ...overrides,
  });

  it("creates a pending request in the active company with an audit entry", async () => {
    const s = await setup();
    const created = await createApprovalRequest(s.memberCtx, valid({ projectId: s.project.id }));

    expect(created).toMatchObject({
      companyId: s.memberCtx.companyId,
      projectId: s.project.id,
      status: "PENDING",
      amountCents: 123_450,
      priority: "HIGH",
      requestedById: s.memberCtx.userId,
    });
    expect(created.dueDate?.toISOString()).toBe("2026-12-01T00:00:00.000Z");

    const log = await db.activityLog.findFirstOrThrow({ where: { entityId: created.id } });
    expect(log).toMatchObject({ action: "approval.requested", companyId: s.memberCtx.companyId });

    // It shows up in the queue, and the requester can't decide it but a manager can.
    expect((await listApprovals(s.memberCtx)).map((a) => a.id)).toContain(created.id);
    await expect(
      decideApproval(s.memberCtx, { approvalId: created.id, decision: "APPROVE" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      decideApproval(s.managerCtx, { approvalId: created.id, decision: "APPROVE" }),
    ).resolves.toMatchObject({ status: "APPROVED" });
  });

  it("allows requests with no project, amount or due date", async () => {
    const s = await setup();
    const created = await createApprovalRequest(
      s.memberCtx,
      valid({ amount: undefined, dueDate: undefined, projectId: undefined }),
    );
    expect(created).toMatchObject({ projectId: null, amountCents: null, dueDate: null });
  });

  it("rejects another company's project as not found and writes nothing", async () => {
    const s = await setup();
    await expect(
      createApprovalRequest(s.memberCtx, valid({ projectId: s.otherProject.id })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.approval.count()).toBe(0);
    expect(await db.activityLog.count()).toBe(0);
  });

  it("forbids viewers", async () => {
    const s = await setup();
    await expect(createApprovalRequest(s.viewerCtx, valid())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it.each([
    ["short title", { title: "ab" }],
    ["bad type", { type: "BRIBE" }],
    ["negative amount", { amount: "-10" }],
    ["three decimals", { amount: "1.005" }],
    ["bad date", { dueDate: "2026-13-45" }],
    ["non-date", { dueDate: "tomorrow" }],
    ["impossible date", { dueDate: "2026-02-30" }],
  ])("rejects invalid input: %s", async (_name, overrides) => {
    const s = await setup();
    await expect(createApprovalRequest(s.memberCtx, valid(overrides))).rejects.toMatchObject({
      code: "INVALID",
    });
  });
});
