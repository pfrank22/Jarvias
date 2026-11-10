import type { ApprovalStatus, Role } from "@/generated/prisma/enums";
import { hasRoleAtLeast } from "./tenant";

/** Managers may approve requests up to this amount (in cents). $10,000.00 */
export const MANAGER_APPROVAL_LIMIT_CENTS = 10_000_00;

export type Decision = "APPROVE" | "REJECT";

export interface PolicyApproval {
  status: ApprovalStatus;
  amountCents: number | null;
  requestedById: string;
}

export interface PolicyActor {
  userId: string;
  role: Role;
}

export type PolicyResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Pure decision rules for the approval queue. Kept free of I/O so it can be
 * unit-tested exhaustively; the service layer enforces it inside a transaction.
 */
export function canDecide(actor: PolicyActor, approval: PolicyApproval): PolicyResult {
  if (approval.status !== "PENDING") {
    return { allowed: false, reason: "This request has already been decided." };
  }
  if (approval.requestedById === actor.userId) {
    return { allowed: false, reason: "You cannot decide on your own request." };
  }
  if (!hasRoleAtLeast(actor.role, "MANAGER")) {
    return { allowed: false, reason: "Only managers, admins and owners can decide approvals." };
  }
  if (
    actor.role === "MANAGER" &&
    approval.amountCents !== null &&
    approval.amountCents > MANAGER_APPROVAL_LIMIT_CENTS
  ) {
    return {
      allowed: false,
      reason: "This amount exceeds the manager approval limit. An admin or owner must decide.",
    };
  }
  return { allowed: true };
}

export function validateDecisionNote(decision: Decision, note: string | undefined): PolicyResult {
  const trimmed = note?.trim() ?? "";
  if (decision === "REJECT" && trimmed.length < 3) {
    return { allowed: false, reason: "Please give a reason when rejecting a request." };
  }
  if (trimmed.length > 1000) {
    return { allowed: false, reason: "Notes must be 1000 characters or fewer." };
  }
  return { allowed: true };
}
