import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  EmptyState,
  HealthBadge,
  PriorityBadge,
  ProgressBar,
  SectionTitle,
  StatusBadge,
} from "@/components/ui";
import { budgetUsedPercent, formatCents, formatDate, humanize } from "@/lib/format";
import { DomainError } from "@/server/errors";
import { canRequest } from "@/server/approvals";
import { getProject } from "@/server/projects";
import { getTenantContext } from "@/server/session";

async function loadProject(projectId: string) {
  const ctx = await getTenantContext();
  try {
    return { ctx, project: await getProject(ctx, projectId) };
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await loadProject(projectId);
  return { title: project.name };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { ctx, project } = await loadProject(projectId);
  const used = budgetUsedPercent(project.spentCents, project.budgetCents);
  const openTasks = project.tasks.filter((t) => t.status !== "DONE").length;

  return (
    <>
      <Link href="/projects" className="text-sm font-medium text-brand-600">
        ← Projects
      </Link>
      <div className="mt-2">
        <p className="text-xs font-medium text-slate-500">{project.code}</p>
        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
        <p className="text-sm text-slate-500">{project.clientName}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge status={project.status} />
          <HealthBadge health={project.health} />
        </div>
        {project.description ? (
          <p className="mt-3 text-sm text-slate-700">{project.description}</p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-slate-500">Progress</p>
          <p className="text-xl font-bold">{project.progress}%</p>
          <div className="mt-2">
            <ProgressBar value={project.progress} />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Budget used</p>
          <p className="text-xl font-bold">{used}%</p>
          <p className="text-xs text-slate-500">
            {formatCents(project.spentCents)} of {formatCents(project.budgetCents)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Schedule</p>
          <p className="text-sm font-medium">
            {formatDate(project.startDate)} → {formatDate(project.dueDate)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Project manager</p>
          <p className="text-sm font-medium">{project.manager?.name ?? "Unassigned"}</p>
        </Card>
      </div>

      <SectionTitle>Tasks ({openTasks} open)</SectionTitle>
      {project.tasks.length === 0 ? (
        <EmptyState>No tasks on this project.</EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {project.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-medium ${t.status === "DONE" ? "text-slate-400 line-through" : ""}`}
                >
                  {t.title}
                </p>
                <p className="text-xs text-slate-500">
                  {t.assignee?.name ?? "Unassigned"} · due {formatDate(t.dueDate)}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </Card>
      )}

      <SectionTitle
        action={
          canRequest(ctx.role) &&
          project.status !== "COMPLETED" &&
          project.status !== "CANCELLED" ? (
            <Link
              href={`/approvals/new?projectId=${project.id}`}
              className="text-sm font-medium text-brand-600"
            >
              Request approval
            </Link>
          ) : null
        }
      >
        Approvals
      </SectionTitle>
      {project.approvals.length === 0 ? (
        <EmptyState>No approval requests.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {project.approvals.map((a) => (
            <li key={a.id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {humanize(a.type)} · {formatCents(a.amountCents)} · {a.requestedBy.name}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={a.status} />
                  {a.status === "PENDING" ? <PriorityBadge priority={a.priority} /> : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Activity</SectionTitle>
      {project.activity.length === 0 ? (
        <EmptyState>No activity yet.</EmptyState>
      ) : (
        <ul className="space-y-1 text-sm text-slate-600">
          {project.activity.map((a) => (
            <li key={a.id}>
              <span className="font-medium text-slate-800">{a.actor?.name ?? "System"}</span>{" "}
              {a.action.replace(".", " ")}
              <span className="text-xs text-slate-400"> · {formatDate(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
