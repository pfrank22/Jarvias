import type { ActionStatus, ReviewReason } from "@/generated/prisma/enums";
import type { PolicyResult } from "./approval-policy";

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending your approval",
  SENT: "Sent",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

export const REVIEW_REASON_LABEL: Record<ReviewReason, string> = {
  PRICE_CHANGE: "Price change",
  SCHEDULE_COMMITMENT: "Schedule commitment",
  DELAY_OR_PROBLEM: "Delay or problem",
};

const ALLOWED: Record<ActionStatus, readonly ActionStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "SENT", "CANCELLED"],
  PENDING_APPROVAL: ["SENT", "DRAFT", "CANCELLED"],
  SENT: ["COMPLETED", "FAILED"],
  FAILED: ["DRAFT", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export interface PolicyAction {
  status: ActionStatus;
  reviewReason: ReviewReason | null;
}

/**
 * Action state rules:
 * - A draft can never jump to Completed: only something actually sent or done completes.
 * - Messages about price changes, schedule commitments, or delays/problems must pass
 *   "Pending your approval" before they can be sent.
 * - Terminal states (Completed, Cancelled) never change.
 */
export function canTransition(action: PolicyAction, to: ActionStatus): PolicyResult {
  if (action.status === to)
    return { allowed: false, reason: "The action is already in that state." };
  if (!ALLOWED[action.status].includes(to)) {
    return {
      allowed: false,
      reason: `An action can't go from ${ACTION_STATUS_LABEL[action.status]} to ${ACTION_STATUS_LABEL[to]}.`,
    };
  }
  if (action.status === "DRAFT" && to === "SENT" && action.reviewReason) {
    return {
      allowed: false,
      reason: `This message involves a ${REVIEW_REASON_LABEL[action.reviewReason].toLowerCase()} and needs your approval first.`,
    };
  }
  return { allowed: true };
}

/** The transitions to offer as buttons, in display order. */
export function availableTransitions(action: PolicyAction): ActionStatus[] {
  return ALLOWED[action.status].filter((to) => canTransition(action, to).allowed);
}
