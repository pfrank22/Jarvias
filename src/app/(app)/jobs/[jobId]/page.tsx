import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButtons, ResolveDecisionForm } from "@/components/jobs";
import { ActionStatusBadge, TrackBadge, waitingFor } from "@/components/job-ui";
import { Badge, Card, EmptyState, PriorityBadge, SectionTitle } from "@/components/ui";
import { formatCents, formatDate, humanize } from "@/lib/format";
import { REVIEW_REASON_LABEL, availableTransitions } from "@/server/action-policy";
import { DomainError } from "@/server/errors";
import { STAGE_LABEL, budgetGate, intakeSteps, missingInfo, nextStep } from "@/server/job-policy";
import { getJob } from "@/server/jobs";
import { getTenantContext } from "@/server/session";

async function load(jobId: string) {
  const ctx = await getTenantContext();
  try {
    return await getJob(ctx, jobId);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ jobId: string }> }) {
  const job = await load((await params).jobId);
  return { title: job.homeownerName };
}

const STEP_TEXT = {
  done: "Done",
  scheduled: "Scheduled",
  sent: "Sent, not signed",
  todo: "To do",
} as const;
const STEP_TONE = { done: "green", scheduled: "blue", sent: "amber", todo: "slate" } as const;
const DOC_TONE = {
  MISSING: "red",
  REQUESTED: "amber",
  RECEIVED: "green",
  SIGNED: "green",
} as const;

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const job = await load((await params).jobId);
  const gate = budgetGate(job);
  const missing = missingInfo(job);
  const next = nextStep(job);

  return (
    <>
      <Link href="/jobs" className="text-sm font-medium text-brand-600">
        ← Jobs
      </Link>
      <div className="mt-2">
        <p className="text-xs font-medium text-slate-500">
          {job.number ?? "No Buildertrend job yet"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{job.homeownerName}</h1>
        <p className="text-sm text-slate-500">{job.address}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TrackBadge track={job.track} />
          <Badge>{STAGE_LABEL[job.stage]}</Badge>
        </div>
        {next ? (
          <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
            Next: {next}
          </p>
        ) : null}
        {job.scopeSummary ? (
          <p className="mt-3 text-sm text-slate-700">{job.scopeSummary}</p>
        ) : null}
      </div>

      <Card className="mt-4">
        <p className="text-xs font-medium text-slate-500">Budget gate</p>
        {gate.open ? (
          <p className="text-sm font-semibold text-emerald-700">
            Open: budgeting can start
            {job.contractCents ? ` (${formatCents(job.contractCents)} agreed)` : ""}.
          </p>
        ) : (
          <p className="text-sm text-slate-700">Locked until: {gate.waitingOn.join("; ")}.</p>
        )}
        {job.workAuthSignedAt && !gate.open ? (
          <p className="mt-1 text-xs text-slate-500">
            The signed work authorization lets you talk to the adjuster. It is not scope or budget
            approval.
          </p>
        ) : null}
      </Card>

      {missing.length > 0 || !job.referringPlumber ? (
        <Card className="mt-3 ring-amber-200">
          <p className="text-xs font-medium text-amber-800">Needs information</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {missing.map((m) => (
              <li key={m.key}>{m.label}</li>
            ))}
            {!job.referringPlumber ? <li>Plumber: none named in the lead — your pick</li> : null}
          </ul>
        </Card>
      ) : null}

      <SectionTitle>Intake</SectionTitle>
      <Card className="divide-y divide-slate-100 p-0">
        {intakeSteps(job).map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-medium">{s.label}</span>
            <span className="flex items-center gap-2">
              {s.at ? <span className="text-xs text-slate-500">{formatDate(s.at)}</span> : null}
              <Badge tone={STEP_TONE[s.state]}>{STEP_TEXT[s.state]}</Badge>
            </span>
          </div>
        ))}
      </Card>

      {job.decisions.length > 0 ? (
        <>
          <SectionTitle>Decisions</SectionTitle>
          <ul className="space-y-2">
            {job.decisions.map((d) => (
              <li key={d.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{d.title}</p>
                    <PriorityBadge priority={d.priority} />
                  </div>
                  {d.detail ? <p className="mt-1 text-sm text-slate-600">{d.detail}</p> : null}
                  <ResolveDecisionForm decisionId={d.id} />
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <SectionTitle>Actions</SectionTitle>
      {job.actions.length === 0 ? (
        <EmptyState>No actions yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {job.actions.map((a) => (
            <li key={a.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      {humanize(a.channel)}
                      {a.recipientName ? ` · to ${a.recipientName}` : ""}
                      {a.reviewReason
                        ? ` · ${REVIEW_REASON_LABEL[a.reviewReason]}: needs your review`
                        : ""}
                    </p>
                    <p className="font-medium">{a.title}</p>
                  </div>
                  <ActionStatusBadge status={a.status} />
                </div>
                {a.body ? (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                    {a.body}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  {a.dueAt ? `Due ${formatDate(a.dueAt)}. ` : ""}
                  {a.sentAt ? `Sent ${formatDate(a.sentAt)}. ` : ""}
                  {a.awaitingReplySince
                    ? `Waiting ${waitingFor(a.awaitingReplySince)} for a reply. `
                    : ""}
                  {a.completedAt ? `Completed ${formatDate(a.completedAt)}.` : ""}
                </p>
                <ActionButtons
                  actionId={a.id}
                  channel={a.channel}
                  status={a.status}
                  allowed={availableTransitions(a)}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Documents</SectionTitle>
      {job.documents.length === 0 ? (
        <EmptyState>No documents tracked.</EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 p-0">
          {job.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{d.title}</p>
                <p className="text-xs text-slate-500">{humanize(d.kind)}</p>
              </div>
              <Badge tone={DOC_TONE[d.status]}>{humanize(d.status)}</Badge>
            </div>
          ))}
        </Card>
      )}

      <SectionTitle>Contacts</SectionTitle>
      <Card className="space-y-2 text-sm">
        <p>
          <span className="text-slate-500">Homeowner: </span>
          {job.homeownerName} · {job.homeownerPhone ?? job.homeownerEmail ?? "no contact info"}
        </p>
        <p>
          <span className="text-slate-500">Referring plumber: </span>
          {job.referringPlumber?.name ?? "None named — your pick"}
        </p>
        <p>
          <span className="text-slate-500">Mitigation: </span>
          {job.mitigationContact?.name ?? "—"}
        </p>
        {job.track === "INSURANCE" ? (
          <p>
            <span className="text-slate-500">Claim: </span>
            {[job.carrier, job.claimNumber, job.adjusterName].filter(Boolean).join(" · ") || "—"}
          </p>
        ) : null}
      </Card>
    </>
  );
}
