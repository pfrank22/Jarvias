import type { AdjusterEventKind, JobStage } from "@/generated/prisma/enums";
import { formatCents, formatDate, humanize } from "@/lib/format";
import type { getJob } from "@/server/jobs";
import { budgetGate, isActive } from "@/server/job-policy";
import { priceFromCostCents, retailTotals, submissionPackage } from "@/server/path-policy";
import { CommandForm } from "./jobs";
import { Badge, Card, SectionTitle } from "./ui";

type Job = Awaited<ReturnType<typeof getJob>>;

const input =
  "w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

const ADJUSTER_OPTIONS: Partial<Record<JobStage, { kind: AdjusterEventKind; label: string }[]>> = {
  INS_SUBMITTED: [
    { kind: "RESPONSE", label: "Adjuster responded" },
    { kind: "REVISION_REQUESTED", label: "Adjuster requested revisions" },
    { kind: "SCOPE_APPROVED", label: "Insurance approved the scope" },
    { kind: "AMOUNT_AGREED", label: "Amount agreed with the adjuster" },
  ],
  INS_IN_REVISION: [
    { kind: "RESPONSE", label: "Adjuster responded" },
    { kind: "RESUBMITTED", label: "I resubmitted the revised claim" },
  ],
};

function IntakeControls({ job }: { job: Job }) {
  const row = "flex flex-wrap items-center gap-2";
  return (
    <Card className="space-y-3">
      <p className="text-xs font-medium text-slate-500">Intake</p>
      <div className={row}>
        {!job.homeownerCalledAt ? (
          <CommandForm
            jobId={job.id}
            cmd="intake"
            hidden={{ milestone: "called" }}
            label="I called the homeowner"
          />
        ) : null}
        {!job.jobWalkCompletedAt && job.jobWalkScheduledFor ? (
          <CommandForm
            jobId={job.id}
            cmd="intake"
            hidden={{ milestone: "walkCompleted" }}
            label="Job walk done"
          />
        ) : null}
        {!job.workAuthSentAt && !job.workAuthSignedAt ? (
          <CommandForm
            jobId={job.id}
            cmd="intake"
            hidden={{ milestone: "workAuthSent" }}
            label="Work auth sent (DocuSign)"
          />
        ) : null}
        {!job.workAuthSignedAt ? (
          <CommandForm
            jobId={job.id}
            cmd="intake"
            hidden={{ milestone: "workAuthSigned" }}
            label="Work auth signed"
          />
        ) : null}
      </div>
      {!job.jobWalkCompletedAt ? (
        <CommandForm
          jobId={job.id}
          cmd="intake"
          hidden={{ milestone: "walkScheduled" }}
          label={job.jobWalkScheduledFor ? "Reschedule walk" : "Schedule walk"}
          className="flex items-end gap-2"
        >
          <label className="min-w-0 flex-1 text-sm text-slate-600">
            Job walk
            <input type="datetime-local" name="at" required className={input} />
          </label>
        </CommandForm>
      ) : null}
      <div className="border-t border-slate-100 pt-3">
        {job.track === "UNDECIDED" ? (
          <div className={row}>
            <span className="text-sm text-slate-600">This job is:</span>
            <CommandForm
              jobId={job.id}
              cmd="chooseTrack"
              hidden={{ track: "RETAIL" }}
              label="Retail"
            />
            <CommandForm
              jobId={job.id}
              cmd="chooseTrack"
              hidden={{ track: "INSURANCE" }}
              label="Insurance"
            />
          </div>
        ) : (
          <CommandForm
            jobId={job.id}
            cmd="startPath"
            primary
            label={
              job.track === "RETAIL"
                ? "Start the retail estimate"
                : "Start the insurance submission"
            }
          />
        )}
      </div>
    </Card>
  );
}

function RetailControls({ job }: { job: Job }) {
  const totals = retailTotals(job.estimateLines, job.marginBps);
  const editable = job.stage === "RETAIL_BIDDING";
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          Retail estimate · priced at {job.marginBps / 100}% gross margin
        </p>
      </div>
      <p className="text-xs text-slate-500">
        Build the estimate in Buildertrend as usual. Jarvis prices each cost at your margin: price =
        cost ÷ (1 − margin).
      </p>
      {job.estimateLines.length === 0 ? (
        <p className="text-sm text-slate-500">No cost lines yet. Add sub bids as they come in.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="font-medium">Line</th>
              <th className="pl-3 text-right font-medium">Cost</th>
              <th className="pl-3 text-right font-medium">Price</th>
              {editable ? <th /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {job.estimateLines.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-2">
                  {l.description}
                  {l.vendor ? (
                    <span className="block text-xs text-slate-500">{l.vendor}</span>
                  ) : null}
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">
                  {formatCents(l.costCents)}
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">
                  {formatCents(priceFromCostCents(l.costCents, job.marginBps))}
                </td>
                {editable ? (
                  <td className="py-2 pl-2 text-right">
                    <CommandForm
                      jobId={job.id}
                      cmd="removeLine"
                      hidden={{ lineId: l.id }}
                      label="Remove"
                    />
                  </td>
                ) : null}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total · {Math.round(totals.marginPct * 1000) / 10}% margin</td>
              <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">
                {formatCents(totals.costCents)}
              </td>
              <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">
                {formatCents(totals.priceCents)}
              </td>
              {editable ? <td /> : null}
            </tr>
          </tbody>
        </table>
      )}

      {editable ? (
        <>
          <CommandForm
            jobId={job.id}
            cmd="addLine"
            label="Add cost line"
            className="grid grid-cols-2 gap-2"
          >
            <input
              name="description"
              placeholder="What (e.g. Drywall)"
              required
              maxLength={200}
              className={`${input} col-span-2`}
            />
            <input
              name="vendor"
              placeholder="Sub or vendor (optional)"
              maxLength={120}
              className={input}
            />
            <input
              name="cost"
              placeholder="Cost $"
              inputMode="decimal"
              required
              maxLength={32}
              className={input}
            />
          </CommandForm>
          <CommandForm
            jobId={job.id}
            cmd="setMargin"
            label="Set margin"
            className="flex items-end gap-2"
          >
            <label className="min-w-0 flex-1 text-sm text-slate-600">
              Margin for this estimate (%)
              <input
                name="marginPct"
                defaultValue={String(job.marginBps / 100)}
                inputMode="decimal"
                maxLength={10}
                className={input}
              />
            </label>
          </CommandForm>
        </>
      ) : null}

      <CommandForm
        jobId={job.id}
        cmd="setCustomerScope"
        label="Save scope description"
        className="space-y-2"
      >
        <label className="block text-sm text-slate-600">
          Customer-facing scope description
          <textarea
            name="text"
            rows={4}
            maxLength={5000}
            defaultValue={job.customerScopeText}
            className={input}
            placeholder="Plain-language description of the work for the customer"
          />
        </label>
      </CommandForm>

      <div className="border-t border-slate-100 pt-3">
        {job.stage === "RETAIL_BIDDING" ? (
          <CommandForm
            jobId={job.id}
            cmd="estimateSent"
            primary
            label="Estimate sent to customer"
          />
        ) : null}
        {job.stage === "RETAIL_ESTIMATE_SENT" ? (
          <CommandForm
            jobId={job.id}
            cmd="customerAccepted"
            primary
            label={`Customer accepted (${formatCents(totals.priceCents)})`}
          />
        ) : null}
        {job.stage === "RETAIL_ACCEPTED" ? (
          <p className="text-sm text-emerald-700">
            Accepted {formatDate(job.customerAcceptedAt)} at {formatCents(job.contractCents)}.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function InsuranceControls({ job }: { job: Job }) {
  const pkg = submissionPackage(job, job.documents);
  const options = ADJUSTER_OPTIONS[job.stage] ?? [];
  return (
    <Card className="space-y-3">
      <p className="text-xs font-medium text-slate-500">Insurance claim</p>
      <p className="text-xs text-slate-500">
        The submission is never priced by marking up sub bids. The 50% margin target is applied
        later, in the budget, and isn&rsquo;t guaranteed.
      </p>

      {job.stage === "INS_PREPARING_SUBMISSION" ? (
        <>
          <ul className="space-y-1 text-sm">
            {pkg.map((i) => (
              <li key={i.key} className="flex items-center justify-between">
                <span>{i.label}</span>
                <Badge tone={i.ok ? "green" : "red"}>{i.ok ? "Ready" : "Missing"}</Badge>
              </li>
            ))}
          </ul>
          <CommandForm
            jobId={job.id}
            cmd="adjuster"
            hidden={{ kind: "SUBMITTED" }}
            primary
            label="I reviewed and sent the submission"
          />
        </>
      ) : null}

      {options.length > 0 ? (
        <CommandForm jobId={job.id} cmd="adjuster" label="Record" className="space-y-2">
          <select
            name="kind"
            className={input}
            defaultValue={options[0]?.kind}
            aria-label="What happened"
          >
            {options
              .filter(
                (o) =>
                  !(o.kind === "SCOPE_APPROVED" && job.scopeApprovedAt) &&
                  !(o.kind === "AMOUNT_AGREED" && job.amountAgreedAt),
              )
              .map((o) => (
                <option key={o.kind} value={o.kind}>
                  {o.label}
                </option>
              ))}
          </select>
          <input
            name="amount"
            placeholder="Agreed amount $ (only for amount agreed)"
            inputMode="decimal"
            maxLength={32}
            className={input}
          />
          <textarea
            name="note"
            rows={2}
            maxLength={2000}
            placeholder="Notes (what the adjuster said or asked for)"
            className={input}
          />
        </CommandForm>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge tone={job.scopeApprovedAt ? "green" : "slate"}>
          Scope {job.scopeApprovedAt ? "approved" : "not approved yet"}
        </Badge>
        <Badge tone={job.amountAgreedAt ? "green" : "slate"}>
          Amount{" "}
          {job.amountAgreedAt ? `agreed: ${formatCents(job.contractCents)}` : "not agreed yet"}
        </Badge>
      </div>

      {job.adjusterEvents.length > 0 ? (
        <ul className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          {job.adjusterEvents.map((e) => (
            <li key={e.id}>
              <span className="text-xs text-slate-500">{formatDate(e.occurredAt)} · </span>
              <span className="font-medium">{humanize(e.kind)}</span>
              {e.amountCents ? ` · ${formatCents(e.amountCents)}` : ""}
              {e.note ? <span className="block text-slate-600">{e.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function JobPathPanel({ job }: { job: Job }) {
  if (!isActive(job.stage)) return null;
  const gate = budgetGate(job);
  const inRetail = ["RETAIL_BIDDING", "RETAIL_ESTIMATE_SENT", "RETAIL_ACCEPTED"].includes(
    job.stage,
  );
  const inInsurance = [
    "INS_PREPARING_SUBMISSION",
    "INS_SUBMITTED",
    "INS_IN_REVISION",
    "INS_AGREED",
  ].includes(job.stage);
  return (
    <>
      <SectionTitle>
        {job.stage === "INTAKE"
          ? "Intake"
          : job.track === "RETAIL"
            ? "Retail path"
            : "Insurance path"}
      </SectionTitle>
      <div className="space-y-3">
        {job.stage === "INTAKE" ? <IntakeControls job={job} /> : null}
        {inRetail ? <RetailControls job={job} /> : null}
        {inInsurance ? <InsuranceControls job={job} /> : null}
        {gate.open && job.stage !== "BUDGETING" && (inRetail || inInsurance) ? (
          <CommandForm jobId={job.id} cmd="startBudgeting" primary label="Start budgeting" />
        ) : null}
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Job lost?</summary>
          <CommandForm
            jobId={job.id}
            cmd="markLost"
            label="Mark lost"
            className="mt-2 flex items-end gap-2"
          >
            <input
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder="Why?"
              className={input}
            />
          </CommandForm>
        </details>
      </div>
    </>
  );
}
