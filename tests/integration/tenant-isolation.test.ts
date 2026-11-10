import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { decideApproval, listApprovals } from "@/server/approvals";
import { getDashboard } from "@/server/dashboard";
import { DomainError } from "@/server/errors";
import { getProject, listProjects } from "@/server/projects";
import {
  ctxFor,
  makeApproval,
  makeCompany,
  makeMember,
  makeProject,
  resetDatabase,
} from "./helpers";

async function setup() {
  const acme = await makeCompany("Acme Fictional");
  const globex = await makeCompany("Globex Fictional");
  const acmeOwner = await makeMember(acme.id, "OWNER");
  const acmeRequester = await makeMember(acme.id, "MEMBER");
  const globexOwner = await makeMember(globex.id, "OWNER");
  const globexRequester = await makeMember(globex.id, "MEMBER");
  const acmeProject = await makeProject(acme.id, "AC-1");
  const globexProject = await makeProject(globex.id, "GX-1");
  const acmeApproval = await makeApproval(acme.id, acmeProject.id, acmeRequester.id);
  const globexApproval = await makeApproval(globex.id, globexProject.id, globexRequester.id);
  return {
    acmeCtx: ctxFor(acmeOwner, acme, "OWNER"),
    globexCtx: ctxFor(globexOwner, globex, "OWNER"),
    acmeProject,
    globexProject,
    acmeApproval,
    globexApproval,
  };
}

const expectDomainError = async (p: Promise<unknown>, code: DomainError["code"]) => {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
};

describe("tenant isolation", () => {
  beforeEach(resetDatabase);
  afterAll(() => db.$disconnect());

  it("lists only the active company's projects", async () => {
    const s = await setup();
    const projects = await listProjects(s.acmeCtx);
    expect(projects.map((p) => p.id)).toEqual([s.acmeProject.id]);
  });

  it("treats another company's project id as not found", async () => {
    const s = await setup();
    await expectDomainError(getProject(s.acmeCtx, s.globexProject.id), "NOT_FOUND");
  });

  it("lists only the active company's approvals", async () => {
    const s = await setup();
    const approvals = await listApprovals(s.acmeCtx);
    expect(approvals.map((a) => a.id)).toEqual([s.acmeApproval.id]);
  });

  it("cannot decide another company's approval", async () => {
    const s = await setup();
    await expectDomainError(
      decideApproval(s.acmeCtx, { approvalId: s.globexApproval.id, decision: "APPROVE" }),
      "NOT_FOUND",
    );
    const untouched = await db.approval.findUniqueOrThrow({ where: { id: s.globexApproval.id } });
    expect(untouched.status).toBe("PENDING");
  });

  it("dashboard counts only the active company's data", async () => {
    const s = await setup();
    const dash = await getDashboard(s.acmeCtx);
    expect(dash.stats.activeProjects).toBe(1);
    expect(dash.stats.pendingApprovals).toBe(1);
  });

  it("database rejects a task linked to another company's project", async () => {
    const s = await setup();
    await expect(
      db.task.create({
        data: {
          companyId: s.acmeCtx.companyId,
          projectId: s.globexProject.id,
          title: "Cross-tenant",
        },
      }),
    ).rejects.toThrow();
  });
});
