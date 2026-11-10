import { z } from "zod";
import { db } from "@/lib/db";
import { parseDollarsToCents } from "@/lib/money";
import type { ApprovalStatus } from "@/generated/prisma/enums";
import { canDecide, validateDecisionNote } from "./approval-policy";
import { conflict, forbidden, invalid, notFound } from "./errors";
import { hasRoleAtLeast, type TenantContext } from "./tenant";

export async function listApprovals(ctx: TenantContext, opts: { status?: ApprovalStatus } = {}) {
  const status = opts.status ?? "PENDING";
  return db.approval.findMany({
    where: { companyId: ctx.companyId, status },
    orderBy:
      status === "PENDING"
        ? [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }]
        : [{ decidedAt: "desc" }],
    include: {
      project: { select: { id: true, name: true, code: true } },
      requestedBy: { select: { id: true, name: true } },
      decidedBy: { select: { id: true, name: true } },
    },
  });
}

export const decisionInput = z.object({
  approvalId: z.string().min(1).max(64),
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(1000).optional(),
});
export type DecisionInput = z.infer<typeof decisionInput>;

export async function decideApproval(ctx: TenantContext, rawInput: unknown) {
  const parsed = decisionInput.safeParse(rawInput);
  if (!parsed.success) throw invalid("Invalid decision request.");
  const { approvalId, decision, note } = parsed.data;

  const noteCheck = validateDecisionNote(decision, note);
  if (!noteCheck.allowed) throw invalid(noteCheck.reason);

  return db.$transaction(async (tx) => {
    const approval = await tx.approval.findFirst({
      where: { id: approvalId, companyId: ctx.companyId },
    });
    if (!approval) throw notFound("Approval");

    const policy = canDecide({ userId: ctx.userId, role: ctx.role }, approval);
    if (!policy.allowed) throw forbidden(policy.reason);

    const status: "APPROVED" | "REJECTED" = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    // Guard on status = PENDING so two concurrent deciders cannot both win.
    const result = await tx.approval.updateMany({
      where: { id: approval.id, companyId: ctx.companyId, status: "PENDING" },
      data: {
        status,
        decidedById: ctx.userId,
        decidedAt: new Date(),
        decisionNote: note?.trim() || null,
      },
    });
    if (result.count !== 1) throw conflict("This request was decided by someone else.");

    await tx.activityLog.create({
      data: {
        companyId: ctx.companyId,
        projectId: approval.projectId,
        actorId: ctx.userId,
        action: status === "APPROVED" ? "approval.approved" : "approval.rejected",
        entityType: "Approval",
        entityId: approval.id,
        metadata: { title: approval.title, amountCents: approval.amountCents },
      },
    });

    return { id: approval.id, status };
  });
}

export async function countPendingApprovals(ctx: TenantContext): Promise<number> {
  return db.approval.count({ where: { companyId: ctx.companyId, status: "PENDING" } });
}

/** Members and above can submit requests; viewers are read-only. */
export function canRequest(role: TenantContext["role"]): boolean {
  return hasRoleAtLeast(role, "MEMBER");
}

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real YYYY-MM-DD calendar date. Rejects rollovers like 2026-02-30. */
function isCalendarDate(value: string): boolean {
  if (!dateOnly.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

export const requestInput = z.object({
  projectId: z.string().max(64).optional(),
  type: z.enum(["CHANGE_ORDER", "PURCHASE", "TIMESHEET", "INVOICE", "DOCUMENT"]),
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(120),
  description: z.string().trim().max(2000).optional(),
  amount: z.string().max(32).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  dueDate: z
    .string()
    .optional()
    .refine((v) => !v || isCalendarDate(v), { message: "Due date must be a valid date." }),
});

export async function createApprovalRequest(ctx: TenantContext, rawInput: unknown) {
  if (!canRequest(ctx.role)) throw forbidden("Viewers cannot submit approval requests.");

  const parsed = requestInput.safeParse(rawInput);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Invalid request.");
  const input = parsed.data;

  const amountCents = parseDollarsToCents(input.amount);
  if (Number.isNaN(amountCents)) {
    throw invalid("Amount must be a positive dollar value with at most two decimals.");
  }

  return db.$transaction(async (tx) => {
    let projectId: string | null = null;
    if (input.projectId) {
      // Scope by company: another company's project id behaves as missing.
      const project = await tx.project.findFirst({
        where: { id: input.projectId, companyId: ctx.companyId },
        select: { id: true },
      });
      if (!project) throw notFound("Project");
      projectId = project.id;
    }

    const approval = await tx.approval.create({
      data: {
        companyId: ctx.companyId,
        projectId,
        type: input.type,
        title: input.title,
        description: input.description ?? "",
        amountCents,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00Z`) : null,
        requestedById: ctx.userId,
      },
    });

    await tx.activityLog.create({
      data: {
        companyId: ctx.companyId,
        projectId,
        actorId: ctx.userId,
        action: "approval.requested",
        entityType: "Approval",
        entityId: approval.id,
        metadata: { title: approval.title, amountCents },
      },
    });

    return approval;
  });
}
