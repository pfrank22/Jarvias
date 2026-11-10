import { db } from "@/lib/db";
import { canDecide } from "./approval-policy";
import type { TenantContext } from "./tenant";

const UPCOMING_WINDOW_DAYS = 14;

export async function getDashboard(ctx: TenantContext, now: Date = new Date()) {
  const companyId = ctx.companyId;
  const horizon = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 86_400_000);

  const [projects, pending, upcomingTasks, recentActivity] = await Promise.all([
    db.project.findMany({
      where: { companyId, status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        health: true,
        progress: true,
        budgetCents: true,
        spentCents: true,
        dueDate: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    db.approval.findMany({
      where: { companyId, status: "PENDING" },
      select: {
        id: true,
        title: true,
        type: true,
        priority: true,
        amountCents: true,
        status: true,
        requestedById: true,
        dueDate: true,
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    db.task.findMany({
      where: { companyId, status: { not: "DONE" }, dueDate: { lte: horizon } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true } },
      },
    }),
    db.activityLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { name: true } } },
    }),
  ]);

  const actor = { userId: ctx.userId, role: ctx.role };
  const awaitingMe = pending.filter((a) => canDecide(actor, a).allowed);

  return {
    stats: {
      activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
      atRiskProjects: projects.filter((p) => p.health !== "ON_TRACK").length,
      pendingApprovals: pending.length,
      awaitingMyDecision: awaitingMe.length,
      budgetCents: projects.reduce((sum, p) => sum + p.budgetCents, 0),
      spentCents: projects.reduce((sum, p) => sum + p.spentCents, 0),
    },
    attentionProjects: projects.filter((p) => p.health !== "ON_TRACK").slice(0, 5),
    topApprovals: awaitingMe.slice(0, 3),
    upcomingTasks,
    recentActivity,
  };
}
