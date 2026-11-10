import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { canRequest } from "@/server/approvals";
import { listProjects } from "@/server/projects";
import { getTenantContext } from "@/server/session";
import { RequestForm } from "./RequestForm";

export const metadata = { title: "New approval request" };

export default async function NewApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const ctx = await getTenantContext();

  if (!canRequest(ctx.role)) {
    return (
      <>
        <PageHeader title="New approval request" />
        <EmptyState>Viewers can’t submit approval requests at {ctx.companyName}.</EmptyState>
      </>
    );
  }

  const projects = (await listProjects(ctx)).filter(
    (p) => p.status !== "COMPLETED" && p.status !== "CANCELLED",
  );
  // Only prefill a project that belongs to the active company.
  const defaultProjectId = projects.some((p) => p.id === projectId) ? projectId : undefined;

  return (
    <>
      <Link href="/approvals" className="text-sm font-medium text-brand-600">
        ← Approvals
      </Link>
      <div className="mt-2">
        <PageHeader title="New approval request" subtitle={ctx.companyName} />
      </div>
      <RequestForm
        projects={projects.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
