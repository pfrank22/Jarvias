import Link from "next/link";
import { ActionButtons, ResolveDecisionForm } from "@/components/jobs";
import { QueueItemCard } from "@/components/job-ui";
import { EmptyState, PageHeader } from "@/components/ui";
import { getDecisionQueue } from "@/server/jobs";
import { getTenantContext } from "@/server/session";

export const metadata = { title: "Decisions" };

export default async function DecisionsPage() {
  const ctx = await getTenantContext();
  const queue = await getDecisionQueue(ctx);

  return (
    <>
      <PageHeader title="Needs you" subtitle={`${queue.length} items at ${ctx.companyName}`} />
      {queue.length === 0 ? (
        <EmptyState>Nothing is waiting on you.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {queue.map((item) => (
            <li key={item.key}>
              <QueueItemCard item={item}>
                {item.source === "decision" && item.refId ? (
                  <ResolveDecisionForm decisionId={item.refId} />
                ) : null}
                {item.source === "review-message" && item.refId && item.channel ? (
                  <ActionButtons
                    actionId={item.refId}
                    channel={item.channel}
                    status="PENDING_APPROVAL"
                    allowed={["SENT", "DRAFT", "CANCELLED"]}
                  />
                ) : null}
                {(item.source === "missing-info" || item.source === "select-plumber") &&
                item.jobId ? (
                  <Link
                    href={`/jobs/${item.jobId}`}
                    className="mt-3 inline-block text-sm font-medium text-brand-600"
                  >
                    Open job →
                  </Link>
                ) : null}
              </QueueItemCard>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/approvals" className="text-brand-600">
          Spending approvals →
        </Link>
      </p>
    </>
  );
}
