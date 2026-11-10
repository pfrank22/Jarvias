import { z } from "zod";
import { db } from "@/lib/db";
import type { ApprovalStatus } from "@/generated/prisma/enums";
import { canDecide, validateDecisionNote } from "./approval-policy";
import { conflict, forbidden, invalid, notFound } from "./errors";
import type { TenantContext } from "./tenant";

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
