import Link from "next/link";
import type { ActionStatus, JobTrack } from "@/generated/prisma/enums";
import { ACTION_STATUS_LABEL } from "@/server/action-policy";
import type { QueueItem } from "@/server/decision-queue";
import { Badge, Card, PriorityBadge } from "./ui";

const ACTION_TONE: Record<ActionStatus, "slate" | "amber" | "blue" | "green" | "red"> = {
  DRAFT: "slate",
  PENDING_APPROVAL: "amber",
  SENT: "blue",
  COMPLETED: "green",
  CANCELLED: "slate",
  FAILED: "red",
};

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  return <Badge tone={ACTION_TONE[status]}>{ACTION_STATUS_LABEL[status]}</Badge>;
}

export function TrackBadge({ track }: { track: JobTrack }) {
  if (track === "RETAIL") return <Badge tone="blue">Retail</Badge>;
  if (track === "INSURANCE") return <Badge tone="green">Insurance</Badge>;
  return <Badge>Track not set</Badge>;
}

/** Hours (or days) a message has waited for a reply. */
export function waitingFor(since: Date, now: Date = new Date()): string {
  const hours = Math.floor((now.getTime() - since.getTime()) / 3_600_000);
  if (hours < 1) return "under 1 h";
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
}

const SOURCE_LABEL: Record<QueueItem["source"], string> = {
  "missing-info": "Missing info",
  "select-plumber": "Plumber",
  "review-message": "Message review",
  decision: "Decision",
};

export function QueueItemCard({ item, children }: { item: QueueItem; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {SOURCE_LABEL[item.source]}
            {item.jobLabel ? " · " : ""}
            {item.jobId && item.jobLabel ? (
              <Link href={`/jobs/${item.jobId}`} className="text-brand-600">
                {item.jobLabel}
              </Link>
            ) : null}
          </p>
          <p className="font-semibold">{item.title}</p>
          {item.detail ? <p className="mt-0.5 text-sm text-slate-600">{item.detail}</p> : null}
        </div>
        <PriorityBadge priority={item.priority} />
      </div>
      {children}
    </Card>
  );
}
