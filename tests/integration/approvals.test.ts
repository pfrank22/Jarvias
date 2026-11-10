import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { decideApproval } from "@/server/approvals";
import { MANAGER_APPROVAL_LIMIT_CENTS } from "@/server/approval-policy";
import {
  ctxFor,
  makeApproval,
  makeCompany,
  makeMember,
  makeProject,
  resetDatabase,
} from "./helpers";

describe("decideApproval", () => {
  beforeEach(resetDatabase);
  afterAll(() => db.$disconnect());

  async function setup(amountCents: number | null = 50_000) {
    const company = await makeCompany("Initech Fictional");
    const requester = await makeMember(company.id, "MEMBER");
    const manager = await makeMember(company.id, "MANAGER");
    const admin = await makeMember(company.id, "ADMIN");
    const project = await makeProject(company.id, "IN-1");
    const approval = await makeApproval(company.id, project.id, requester.id, amountCents);
    return {
      approval,
      requesterCtx: ctxFor(requester, company, "MEMBER"),
      managerCtx: ctxFor(manager, company, "MANAGER"),
      adminCtx: ctxFor(admin, company, "ADMIN"),
    };
  }

  it("approves, records the decider and writes an audit entry", async () => {
    const s = await setup();
    const result = await decideApproval(s.managerCtx, {
      approvalId: s.approval.id,
      decision: "APPROVE",
    });
    expect(result.status).toBe("APPROVED");

    const row = await db.approval.findUniqueOrThrow({ where: { id: s.approval.id } });
    expect(row.decidedById).toBe(s.managerCtx.userId);
    expect(row.decidedAt).not.toBeNull();

    const log = await db.activityLog.findFirstOrThrow({ where: { entityId: s.approval.id } });
    expect(log.action).toBe("approval.approved");
    expect(log.companyId).toBe(s.managerCtx.companyId);
  });

  it("requires a note to reject", async () => {
    const s = await setup();
    await expect(
      decideApproval(s.managerCtx, { approvalId: s.approval.id, decision: "REJECT" }),
    ).rejects.toMatchObject({ code: "INVALID" });
    const result = await decideApproval(s.managerCtx, {
      approvalId: s.approval.id,
      decision: "REJECT",
      note: "Over budget for this phase",
    });
    expect(result.status).toBe("REJECTED");
  });

  it("forbids members from deciding", async () => {
    const s = await setup();
    await expect(
      decideApproval(s.requesterCtx, { approvalId: s.approval.id, decision: "APPROVE" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enforces the manager limit but lets an admin approve", async () => {
    const s = await setup(MANAGER_APPROVAL_LIMIT_CENTS + 1);
    await expect(
      decideApproval(s.managerCtx, { approvalId: s.approval.id, decision: "APPROVE" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await decideApproval(s.adminCtx, {
      approvalId: s.approval.id,
      decision: "APPROVE",
    });
    expect(result.status).toBe("APPROVED");
  });

  it("cannot decide the same request twice", async () => {
    const s = await setup();
    await decideApproval(s.managerCtx, { approvalId: s.approval.id, decision: "APPROVE" });
    await expect(
      decideApproval(s.adminCtx, {
        approvalId: s.approval.id,
        decision: "REJECT",
        note: "Too late",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("only one of two concurrent decisions wins", async () => {
    const s = await setup();
    const results = await Promise.allSettled([
      decideApproval(s.managerCtx, { approvalId: s.approval.id, decision: "APPROVE" }),
      decideApproval(s.adminCtx, {
        approvalId: s.approval.id,
        decision: "REJECT",
        note: "Not needed",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.activityLog.count({ where: { entityId: s.approval.id } })).toBe(1);
  });

  it("rejects malformed input", async () => {
    const s = await setup();
    await expect(
      decideApproval(s.managerCtx, { approvalId: s.approval.id, decision: "MAYBE" }),
    ).rejects.toMatchObject({
      code: "INVALID",
    });
  });
});
