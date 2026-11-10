import { db } from "@/lib/db";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { notFound } from "./errors";
import type { TenantContext } from "./tenant";

export async function listProjects(ctx: TenantContext, opts: { status?: ProjectStatus } = {}) {
  return db.project.findMany({
    where: { companyId: ctx.companyId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { tasks: true, approvals: { where: { status: "PENDING" } } } },
    },
  });
}

export async function getProject(ctx: TenantContext, projectId: string) {
  // findFirst with companyId (not findUnique on id) so a valid id from another
  // company behaves exactly like a missing one.
  const project = await db.project.findFirst({
    where: { id: projectId, companyId: ctx.companyId },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      tasks: {
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        include: { assignee: { select: { id: true, name: true } } },
      },
      approvals: {
        orderBy: { createdAt: "desc" },
        include: { requestedBy: { select: { id: true, name: true } } },
      },
      activity: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!project) throw notFound("Project");
  return project;
}
