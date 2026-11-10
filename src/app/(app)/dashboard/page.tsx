import Link from "next/link";
import {
  Card,
  EmptyState,
  HealthBadge,
  PageHeader,
  PriorityBadge,
  ProgressBar,
  SectionTitle,
} from "@/components/ui";
import { budgetUsedPercent, daysUntil, formatCents, formatDate, humanize } from "@/lib/format";
import { getDashboard } from "@/server/dashboard";
import { getTenantContext } from "@/server/session";

export const metadata = { title: "Dashboard" };

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <Card className="h-full">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
  return href ? (
    <Link
      href={href}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const data = await getDashboard(ctx);
  const { stats } = data;
  const firstName = ctx.userName.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName}`}
        subtitle={`Here is what needs attention at ${ctx.companyName}.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active projects" value={stats.activeProjects} href="/projects" />
        <Stat label="Need attention" value={stats.atRiskProjects} hint="At risk or off track" />
        <Stat
          label="Awaiting you"
          value={stats.awaitingMyDecision}
          hint={`${stats.pendingApprovals} pending total`}
          href="/approvals"
        />
        <Stat
          label="Budget used"
          value={`${budgetUsedPercent(stats.spentCents, stats.budgetCents)}%`}
          hint={`${formatCents(stats.spentCents)} of ${formatCents(stats.budgetCents)}`}
        />
      </div>

      <SectionTitle
        action={
          <Link href="/approvals" className="text-sm font-medium text-brand-600">
            View all
          </Link>
        }
      >
        Your approvals
      </SectionTitle>
      {data.topApprovals.length === 0 ? (
        <EmptyState>Nothing is waiting for your decision.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {data.topApprovals.map((a) => (
            <li key={a.id}>
              <Link href={`/approvals#${a.id}`} className="block">
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {humanize(a.type)} · {formatCents(a.amountCents)} · due{" "}
                      {formatDate(a.dueDate)}
                    </p>
                  </div>
                  <PriorityBadge priority={a.priority} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Projects needing attention</SectionTitle>
      {data.attentionProjects.length === 0 ? (
        <EmptyState>All open projects are on track.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {data.attentionProjects.map((p) => {
            const used = budgetUsedPercent(p.spentCents, p.budgetCents);
            return (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="block">
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {p.code} · due {formatDate(p.dueDate)}
                        </p>
                      </div>
                      <HealthBadge health={p.health} />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span className="w-20 shrink-0">{p.progress}% done</span>
                      <ProgressBar value={p.progress} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="w-20 shrink-0">{used}% budget</span>
                      <ProgressBar value={used} tone={used > p.progress + 15 ? "red" : "blue"} />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <SectionTitle>Due in the next 2 weeks</SectionTitle>
      {data.upcomingTasks.length === 0 ? (
        <EmptyState>No open tasks due soon.</EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {data.upcomingTasks.map((t) => {
            const days = t.dueDate ? daysUntil(t.dueDate) : null;
            return (
              <Link
                key={t.id}
                href={`/projects/${t.project.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {t.project.name}
                    {t.assignee ? ` · ${t.assignee.name}` : " · Unassigned"}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium ${days !== null && days < 0 ? "text-red-600" : "text-slate-500"}`}
                >
                  {days === null
                    ? ""
                    : days < 0
                      ? `${-days}d overdue`
                      : days === 0
                        ? "Today"
                        : `in ${days}d`}
                </span>
              </Link>
            );
          })}
        </Card>
      )}

      <SectionTitle>Recent activity</SectionTitle>
      {data.recentActivity.length === 0 ? (
        <EmptyState>No activity yet.</EmptyState>
      ) : (
        <ul className="space-y-1 text-sm text-slate-600">
          {data.recentActivity.map((a) => (
            <li key={a.id}>
              <span className="font-medium text-slate-800">{a.actor?.name ?? "System"}</span>{" "}
              {humanize(a.action.split(".")[1] ?? a.action).toLowerCase()}{" "}
              <span className="text-slate-800">
                {typeof a.metadata === "object" && a.metadata && "title" in a.metadata
                  ? String(a.metadata.title)
                  : a.entityType}
              </span>
              <span className="text-xs text-slate-400"> · {formatDate(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
