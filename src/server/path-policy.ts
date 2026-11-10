import type {
  AdjusterEventKind,
  DocumentKind,
  DocumentStatus,
  JobStage,
  JobTrack,
} from "@/generated/prisma/enums";
import type { PolicyResult } from "./approval-policy";

// ---------------------------------------------------------------------------
// Retail pricing
// ---------------------------------------------------------------------------

export const DEFAULT_MARGIN_BPS = 5000;
/** Margins at or above 95% are almost certainly typos (price would be 20× cost). */
export const MAX_MARGIN_BPS = 9499;

/**
 * Customer price from cost at a target GROSS margin: price = cost ÷ (1 − margin).
 * 50% margin: $1,000 cost → $2,000 price. Retail only — insurance submissions are
 * never priced by marking up sub bids.
 */
export function priceFromCostCents(costCents: number, marginBps: number): number {
  if (!Number.isInteger(costCents) || costCents < 0)
    throw new RangeError("cost must be non-negative cents");
  if (!Number.isInteger(marginBps) || marginBps < 0 || marginBps > MAX_MARGIN_BPS) {
    throw new RangeError("margin out of range");
  }
  return Math.round((costCents * 10_000) / (10_000 - marginBps));
}

export function retailTotals(lines: readonly { costCents: number }[], marginBps: number) {
  const costCents = lines.reduce((sum, l) => sum + l.costCents, 0);
  const priceCents = lines.reduce((sum, l) => sum + priceFromCostCents(l.costCents, marginBps), 0);
  const marginPct = priceCents === 0 ? 0 : (priceCents - costCents) / priceCents;
  return { costCents, priceCents, marginPct };
}

// ---------------------------------------------------------------------------
// Insurance submission package
// ---------------------------------------------------------------------------

export interface PackageDoc {
  kind: DocumentKind;
  status: DocumentStatus;
}

export interface PackageItem {
  key: "workAuth" | "estimate" | "contract" | "bids";
  label: string;
  ok: boolean;
}

const HAVE = (s: DocumentStatus) => s === "RECEIVED" || s === "SIGNED";

/**
 * What must exist before the insurance submission can go out: the signed work
 * authorization (it is what lets us talk to the adjuster), the estimate, the
 * signed homeowner contract, and at least one supporting sub bid.
 */
export function submissionPackage(
  job: { workAuthSignedAt: Date | null },
  docs: readonly PackageDoc[],
): PackageItem[] {
  return [
    { key: "workAuth", label: "Work authorization signed", ok: job.workAuthSignedAt !== null },
    {
      key: "estimate",
      label: "Estimate",
      ok: docs.some((d) => d.kind === "ESTIMATE" && HAVE(d.status)),
    },
    {
      key: "contract",
      label: "Signed homeowner contract",
      ok: docs.some((d) => d.kind === "SIGNED_CONTRACT" && d.status === "SIGNED"),
    },
    {
      key: "bids",
      label: "Supporting subcontractor bids",
      ok: docs.some((d) => d.kind === "SUB_BID" && HAVE(d.status)),
    },
  ];
}

// ---------------------------------------------------------------------------
// Path transitions
// ---------------------------------------------------------------------------

export interface PathJob {
  track: JobTrack;
  stage: JobStage;
  workAuthSignedAt: Date | null;
  scopeApprovedAt: Date | null;
  amountAgreedAt: Date | null;
}

export type Change = {
  stage?: JobStage;
  track?: JobTrack;
  scopeApprovedAt?: Date;
  amountAgreedAt?: Date;
  contractCents?: number;
  estimateSentAt?: Date;
  customerAcceptedAt?: Date;
};

export type PathResult = { allowed: true; change: Change } | { allowed: false; reason: string };

const no = (reason: string): PathResult => ({ allowed: false, reason });

export function chooseTrack(job: PathJob, track: "RETAIL" | "INSURANCE"): PathResult {
  if (job.stage !== "INTAKE") return no("The track can only be chosen during intake.");
  return { allowed: true, change: { track } };
}

/** Leave intake and start the track's approval path. */
export function startPath(job: PathJob): PathResult {
  if (job.stage !== "INTAKE") return no("This job has already left intake.");
  if (job.track === "RETAIL") return { allowed: true, change: { stage: "RETAIL_BIDDING" } };
  if (job.track === "INSURANCE")
    return { allowed: true, change: { stage: "INS_PREPARING_SUBMISSION" } };
  return no("Choose retail or insurance first.");
}

export function markEstimateSent(job: PathJob, lineCount: number, now: Date): PathResult {
  if (job.track !== "RETAIL" || job.stage !== "RETAIL_BIDDING")
    return no("Only a retail job collecting bids can send its estimate.");
  if (lineCount === 0) return no("Add at least one cost line before sending the estimate.");
  return { allowed: true, change: { stage: "RETAIL_ESTIMATE_SENT", estimateSentAt: now } };
}

/** Customer acceptance locks the price in; only now may budgeting start. */
export function markCustomerAccepted(job: PathJob, priceCents: number, now: Date): PathResult {
  if (job.track !== "RETAIL" || job.stage !== "RETAIL_ESTIMATE_SENT")
    return no("The estimate must be sent before the customer can accept it.");
  return {
    allowed: true,
    change: { stage: "RETAIL_ACCEPTED", customerAcceptedAt: now, contractCents: priceCents },
  };
}

/**
 * Insurance claim events. Submission requires a complete package. Scope approval
 * and amount agreement are recorded separately; the job reaches "Scope and amount
 * agreed" (and the budget gate opens) only once BOTH have happened.
 */
export function adjusterEvent(
  job: PathJob,
  kind: AdjusterEventKind,
  opts: { now: Date; amountCents?: number; packageReady: boolean },
): PathResult {
  if (job.track !== "INSURANCE") return no("Adjuster events apply to insurance jobs only.");
  const claimStages: JobStage[] = [
    "INS_PREPARING_SUBMISSION",
    "INS_SUBMITTED",
    "INS_IN_REVISION",
    "INS_AGREED",
  ];
  if (!claimStages.includes(job.stage))
    return no("This job is not in the insurance approval stages.");

  const bothAfter = (scope: Date | null, amount: Date | null): JobStage | undefined =>
    scope && amount ? "INS_AGREED" : undefined;

  switch (kind) {
    case "SUBMITTED":
      if (job.stage !== "INS_PREPARING_SUBMISSION") return no("The submission was already sent.");
      if (!opts.packageReady) return no("The submission package is incomplete.");
      return { allowed: true, change: { stage: "INS_SUBMITTED" } };
    case "REVISION_REQUESTED":
      if (job.stage !== "INS_SUBMITTED")
        return no("Revisions can only be requested on a submitted claim.");
      return { allowed: true, change: { stage: "INS_IN_REVISION" } };
    case "RESUBMITTED":
      if (job.stage !== "INS_IN_REVISION")
        return no("Only a claim in revision can be resubmitted.");
      return { allowed: true, change: { stage: "INS_SUBMITTED" } };
    case "RESPONSE":
      if (job.stage === "INS_PREPARING_SUBMISSION") return no("Nothing has been submitted yet.");
      return { allowed: true, change: {} };
    case "SCOPE_APPROVED": {
      if (job.stage === "INS_PREPARING_SUBMISSION") return no("Nothing has been submitted yet.");
      if (job.scopeApprovedAt) return no("The scope approval is already recorded.");
      const stage = bothAfter(opts.now, job.amountAgreedAt);
      return { allowed: true, change: { scopeApprovedAt: opts.now, ...(stage ? { stage } : {}) } };
    }
    case "AMOUNT_AGREED": {
      if (job.stage === "INS_PREPARING_SUBMISSION") return no("Nothing has been submitted yet.");
      if (job.amountAgreedAt) return no("The agreed amount is already recorded.");
      if (!opts.amountCents || opts.amountCents <= 0)
        return no("Enter the amount agreed with the adjuster.");
      const stage = bothAfter(job.scopeApprovedAt, opts.now);
      return {
        allowed: true,
        change: {
          amountAgreedAt: opts.now,
          contractCents: opts.amountCents,
          ...(stage ? { stage } : {}),
        },
      };
    }
  }
}

export function validateMarginBps(bps: number): PolicyResult {
  if (!Number.isInteger(bps) || bps < 0 || bps > MAX_MARGIN_BPS) {
    return { allowed: false, reason: "Margin must be between 0% and 94.99%." };
  }
  return { allowed: true };
}
