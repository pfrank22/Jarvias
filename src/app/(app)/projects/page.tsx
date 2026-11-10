import Link from "next/link";
import {
  Card,
  EmptyState,
  HealthBadge,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from "@/components/ui";
import { budgetUsedPercent, formatCents, formatDate } from "@/lib/format";
import { listProjects } from "@/server/projects";
import { getTenantContext } from "@/server/session";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const ctx = await getTenantContext();
  const projects = await listProjects(ctx);

  return (
    <>
      <PageHeader title="Projects" subtitle={`${projects.length} projects at ${ctx.companyName}`} />
      {projects.length === 0 ? (
        <EmptyState>No projects yet.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="block">
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{p.code}</p>
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-slate-500">{p.clientName}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={p.status} />
                      <HealthBadge health={p.health} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={p.progress} />
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{p.progress}% complete</span>
                    <span>
                      {formatCents(p.spentCents)} / {formatCents(p.budgetCents)} (
                      {budgetUsedPercent(p.spentCents, p.budgetCents)}%)
                    </span>
                    <span>Due {formatDate(p.dueDate)}</span>
                    {p._count.approvals > 0 ? (
                      <span className="font-medium text-amber-700">
                        {p._count.approvals} pending approval(s)
                      </span>
                    ) : null}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
