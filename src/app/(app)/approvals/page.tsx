import Link from "next/link";
import { Card, EmptyState, PageHeader, PriorityBadge, StatusBadge } from "@/components/ui";
import type { ApprovalStatus } from "@/generated/prisma/enums";
import { formatCents, formatDate, humanize } from "@/lib/format";
import { canDecide } from "@/server/approval-policy";
import { canRequest, listApprovals } from "@/server/approvals";
import { getTenantContext } from "@/server/session";
import { DecisionForm } from "./DecisionForm";

export const metadata = { title: "Approvals" };

const tabs: { status: ApprovalStatus; label: string }[] = [
  { status: "PENDING", label: "Pending" },
  { status: "APPROVED", label: "Approved" },
  { status: "REJECTED", label: "Rejected" },
];

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; decided?: string; submitted?: string }>;
}) {
  const { status: requested, decided, submitted } = await searchParams;
  const status = tabs.find((t) => t.status === requested)?.status ?? "PENDING";
  const ctx = await getTenantContext();
  const approvals = await listApprovals(ctx, { status });

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Approval queue" subtitle={ctx.companyName} />
        {canRequest(ctx.role) ? (
          <Link
            href="/approvals/new"
            className="shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white active:bg-brand-700"
          >
            New request
          </Link>
        ) : null}
      </div>
      {submitted === "1" ? (
        <p
          role="status"
          className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          Request submitted for approval.
        </p>
      ) : null}
      {decided === "approved" || decided === "rejected" ? (
        <p
          role="status"
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
            decided === "approved"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-slate-100 text-slate-800"
          }`}
        >
          Request {decided}.
        </p>
      ) : null}
      <div
        role="tablist"
        className="mb-4 grid grid-cols-3 rounded-xl bg-slate-200/60 p-1 text-sm font-medium"
      >
        {tabs.map((t) => (
          <Link
            key={t.status}
            role="tab"
            aria-selected={t.status === status}
            href={t.status === "PENDING" ? "/approvals" : `/approvals?status=${t.status}`}
            className={`rounded-lg py-1.5 text-center ${t.status === status ? "bg-white shadow-sm" : "text-slate-600"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {approvals.length === 0 ? (
        <EmptyState>No {status.toLowerCase()} requests.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {approvals.map((a) => {
            const policy = canDecide({ userId: ctx.userId, role: ctx.role }, a);
            return (
              <li key={a.id} id={a.id} className="scroll-mt-20">
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{humanize(a.type)}</p>
                      <p className="font-semibold">{a.title}</p>
                    </div>
                    {a.status === "PENDING" ? (
                      <PriorityBadge priority={a.priority} />
                    ) : (
                      <StatusBadge status={a.status} />
                    )}
                  </div>
                  {a.description ? (
                    <p className="mt-1 text-sm text-slate-600">{a.description}</p>
                  ) : null}
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <dt className="text-slate-500">Amount</dt>
                    <dd className="text-right font-semibold">{formatCents(a.amountCents)}</dd>
                    <dt className="text-slate-500">Project</dt>
                    <dd className="truncate text-right">
                      {a.project ? (
                        <Link className="text-brand-600" href={`/projects/${a.project.id}`}>
                          {a.project.code}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                    <dt className="text-slate-500">Requested by</dt>
                    <dd className="text-right">{a.requestedBy.name}</dd>
                    <dt className="text-slate-500">{a.status === "PENDING" ? "Due" : "Decided"}</dt>
                    <dd className="text-right">
                      {a.status === "PENDING"
                        ? formatDate(a.dueDate)
                        : `${formatDate(a.decidedAt)} by ${a.decidedBy?.name ?? "—"}`}
                    </dd>
                  </dl>
                  {a.decisionNote ? (
                    <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                      “{a.decisionNote}”
                    </p>
                  ) : null}
                  {a.status === "PENDING" ? (
                    policy.allowed ? (
                      <DecisionForm approvalId={a.id} />
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">{policy.reason}</p>
                    )
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
