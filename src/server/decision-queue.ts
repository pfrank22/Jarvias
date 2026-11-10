import type { ActionChannel, DecisionKind, Priority, ReviewReason } from "@/generated/prisma/enums";
import { missingInfo, isActive, type JobFacts } from "./job-policy";
import { REVIEW_REASON_LABEL } from "./action-policy";

export type QueueSource = "missing-info" | "select-plumber" | "review-message" | "decision";

export interface QueueItem {
  key: string;
  source: QueueSource;
  title: string;
  detail: string;
  priority: Priority;
  jobId: string | null;
  jobLabel: string | null;
  /** Action or decision id, when the item is backed by a stored record. */
  refId: string | null;
  /** Channel of the message under review (review-message items only). */
  channel: ActionChannel | null;
  dueAt: Date | null;
}

type QueueJob = JobFacts & { id: string; number: string | null };

export interface QueueInput {
  jobs: QueueJob[];
  pendingActions: {
    id: string;
    jobId: string;
    title: string;
    channel: ActionChannel;
    reviewReason: ReviewReason | null;
    dueAt: Date | null;
  }[];
  decisions: {
    id: string;
    jobId: string | null;
    kind: DecisionKind;
    title: string;
    detail: string;
    priority: Priority;
    dueAt: Date | null;
  }[];
}

const PRIORITY_RANK: Record<Priority, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export function jobLabel(job: Pick<QueueJob, "number" | "homeownerName">): string {
  return job.number ? `${job.number} · ${job.homeownerName}` : job.homeownerName;
}

/**
 * Everything waiting on the project manager, from three sources:
 * computed gaps on active jobs, messages pending approval, and stored decisions.
 * Sorted by priority, then due date (undated last).
 */
export function buildDecisionQueue(input: QueueInput): QueueItem[] {
  const jobsById = new Map(input.jobs.map((j) => [j.id, j]));
  const items: QueueItem[] = [];

  for (const job of input.jobs) {
    if (!isActive(job.stage)) continue;
    const missing = missingInfo(job);
    if (missing.length > 0) {
      items.push({
        key: `missing:${job.id}`,
        source: "missing-info",
        title: `Missing information: ${missing.map((m) => m.label.toLowerCase()).join(", ")}`,
        detail: "Add it on the job, or ask whoever sent the lead.",
        priority: "NORMAL",
        jobId: job.id,
        jobLabel: jobLabel(job),
        refId: null,
        channel: null,
        dueAt: null,
      });
    }
    if (!job.referringPlumberId) {
      items.push({
        key: `plumber:${job.id}`,
        source: "select-plumber",
        title: "Choose a plumber",
        detail: "No referring plumber was identified in the lead.",
        priority: "NORMAL",
        jobId: job.id,
        jobLabel: jobLabel(job),
        refId: null,
        channel: null,
        dueAt: null,
      });
    }
  }

  for (const action of input.pendingActions) {
    const job = jobsById.get(action.jobId);
    items.push({
      key: `action:${action.id}`,
      source: "review-message",
      title: `Review before sending: ${action.title}`,
      detail: action.reviewReason
        ? REVIEW_REASON_LABEL[action.reviewReason]
        : "Waiting for your approval",
      priority: action.reviewReason === "DELAY_OR_PROBLEM" ? "HIGH" : "NORMAL",
      jobId: action.jobId,
      jobLabel: job ? jobLabel(job) : null,
      refId: action.id,
      channel: action.channel,
      dueAt: action.dueAt,
    });
  }

  for (const d of input.decisions) {
    const job = d.jobId ? jobsById.get(d.jobId) : undefined;
    items.push({
      key: `decision:${d.id}`,
      source: "decision",
      title: d.title,
      detail: d.detail,
      priority: d.priority,
      jobId: d.jobId,
      jobLabel: job ? jobLabel(job) : null,
      refId: d.id,
      channel: null,
      dueAt: d.dueAt,
    });
  }

  return items.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity),
  );
}
