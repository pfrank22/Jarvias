import Link from "next/link";
import { ActionStatusBadge, QueueItemCard, TrackBadge, waitingFor } from "@/components/job-ui";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { STAGE_LABEL } from "@/server/job-policy";
import { getJobDashboard } from "@/server/jobs";
import { getTenantContext } from "@/server/session";

export const metadata = { title: "Dashboard" };

const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const data = await getJobDashboard(ctx);
  const firstName = ctx.userName.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName}`}
        subtitle={`${data.activeJobs.length} active jobs at ${ctx.companyName}`}
      />

      <div role="note" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Preview on fictional data. Jarvis sends nothing: no email, text, Trello or Buildertrend
        integration is connected. &ldquo;I sent it&rdquo; records that you sent something yourself.
      </div>

      <SectionTitle
        action={
          <Link href="/decisions" className="text-sm font-medium text-brand-600">
            All {data.decisions.length}
          </Link>
        }
      >
        Needs you
      </SectionTitle>
      {data.decisions.length === 0 ? (
        <EmptyState>Nothing is waiting on you.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {data.decisions.slice(0, 4).map((item) => (
            <li key={item.key}>
              <QueueItemCard item={item} />
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Active jobs · stalled longest first</SectionTitle>
      {data.activeJobs.length === 0 ? (
        <EmptyState>No active jobs.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {data.activeJobs.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.id}`} className="block">
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        {job.number ?? "No Buildertrend job yet"}
                      </p>
                      <p className="truncate font-semibold">{job.homeownerName}</p>
                      <p className="truncate text-xs text-slate-500">{job.address}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <TrackBadge track={job.track} />
                      <span className="text-xs text-slate-500">{STAGE_LABEL[job.stage]}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">Next: {job.nextStep}</span>
                    <span
                      className={`shrink-0 text-xs ${job.daysStalled >= 5 ? "font-semibold text-red-600" : "text-slate-500"}`}
                    >
                      {job.daysStalled === 0 ? "moved today" : `${job.daysStalled}d no progress`}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Outstanding replies</SectionTitle>
      {data.awaitingReplies.length === 0 ? (
        <EmptyState>No one owes you a reply.</EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {data.awaitingReplies.map((a) => (
            <Link
              key={a.id}
              href={`/jobs/${a.job.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {a.recipientName ?? "Recipient"} · {a.job.homeownerName}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-slate-600">
                waiting {a.awaitingReplySince ? waitingFor(a.awaitingReplySince) : ""}
              </span>
            </Link>
          ))}
        </Card>
      )}

      <SectionTitle>Next actions</SectionTitle>
      {data.nextActions.length === 0 ? (
        <EmptyState>No open actions.</EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {data.nextActions.map((a) => (
            <Link
              key={a.id}
              href={`/jobs/${a.job.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {a.job.homeownerName}
                  {a.dueAt ? ` · due ${formatDate(a.dueAt)}` : ""}
                </p>
              </div>
              <ActionStatusBadge status={a.status} />
            </Link>
          ))}
        </Card>
      )}

      <SectionTitle>Next 7 days</SectionTitle>
      {data.calendar.length === 0 ? (
        <EmptyState>Nothing scheduled this week. (Google Calendar is not connected.)</EmptyState>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.calendar.map((c) => (
            <li key={c.key}>
              <Link href={`/jobs/${c.jobId}`} className="flex justify-between gap-3">
                <span className="truncate">
                  <span className="font-medium">{c.title}</span> · {c.jobName}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{dayFmt.format(c.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
