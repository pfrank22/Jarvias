import type { JobStage, JobTrack } from "@/generated/prisma/enums";

/** The fields the job rules need. Kept structural so tests can pass plain objects. */
export interface JobFacts {
  track: JobTrack;
  stage: JobStage;
  homeownerName: string;
  homeownerPhone: string | null;
  homeownerEmail: string | null;
  address: string;
  claimNumber: string | null;
  carrier: string | null;
  adjusterName: string | null;
  adjusterEmail: string | null;
  adjusterPhone: string | null;
  referringPlumberId: string | null;
  homeownerCalledAt: Date | null;
  jobWalkScheduledFor: Date | null;
  jobWalkCompletedAt: Date | null;
  workAuthSentAt: Date | null;
  workAuthSignedAt: Date | null;
  estimateSentAt: Date | null;
  customerAcceptedAt: Date | null;
  scopeApprovedAt: Date | null;
  amountAgreedAt: Date | null;
  lastProgressAt: Date;
}

export const STAGE_LABEL: Record<JobStage, string> = {
  INTAKE: "Intake",
  RETAIL_BIDDING: "Collecting bids",
  RETAIL_ESTIMATE_SENT: "Estimate sent",
  RETAIL_ACCEPTED: "Customer accepted",
  INS_PREPARING_SUBMISSION: "Preparing submission",
  INS_SUBMITTED: "Submitted to adjuster",
  INS_IN_REVISION: "Adjuster revisions",
  INS_AGREED: "Scope and amount agreed",
  BUDGETING: "Budgeting",
  SCHEDULING: "Scheduling",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
  LOST: "Lost",
};

const RETAIL_ONLY: readonly JobStage[] = [
  "RETAIL_BIDDING",
  "RETAIL_ESTIMATE_SENT",
  "RETAIL_ACCEPTED",
];
const INSURANCE_ONLY: readonly JobStage[] = [
  "INS_PREPARING_SUBMISSION",
  "INS_SUBMITTED",
  "INS_IN_REVISION",
  "INS_AGREED",
];
export const POST_GATE_STAGES: readonly JobStage[] = [
  "BUDGETING",
  "SCHEDULING",
  "IN_PROGRESS",
  "COMPLETE",
];

export function isActive(stage: JobStage): boolean {
  return stage !== "COMPLETE" && stage !== "LOST";
}

/** Retail and insurance stages never mix. */
export function stageFitsTrack(stage: JobStage, track: JobTrack): boolean {
  if (RETAIL_ONLY.includes(stage)) return track === "RETAIL";
  if (INSURANCE_ONLY.includes(stage)) return track === "INSURANCE";
  if (POST_GATE_STAGES.includes(stage)) return track !== "UNDECIDED";
  return true; // INTAKE, LOST
}

export type GateResult = { open: true } | { open: false; waitingOn: string[] };

/**
 * Budgeting may start only when the track's gate is met:
 * retail = customer accepted the estimate; insurance = scope approved AND amount
 * agreed with the adjuster. A signed work authorization never opens the gate.
 */
export function budgetGate(
  job: Pick<JobFacts, "track" | "customerAcceptedAt" | "scopeApprovedAt" | "amountAgreedAt">,
): GateResult {
  if (job.track === "UNDECIDED") return { open: false, waitingOn: ["Choose retail or insurance"] };
  if (job.track === "RETAIL") {
    return job.customerAcceptedAt
      ? { open: true }
      : { open: false, waitingOn: ["Customer acceptance of the estimate"] };
  }
  const waitingOn: string[] = [];
  if (!job.scopeApprovedAt) waitingOn.push("Insurance approval of the scope");
  if (!job.amountAgreedAt) waitingOn.push("Agreement with the adjuster on the amount");
  return waitingOn.length === 0 ? { open: true } : { open: false, waitingOn };
}

/** A stage change into budgeting or later is refused while the gate is closed. */
export function canEnterStage(
  job: JobFacts,
  to: JobStage,
): { allowed: true } | { allowed: false; reason: string } {
  if (!stageFitsTrack(to, job.track)) {
    return {
      allowed: false,
      reason: "That stage belongs to the other track (retail vs insurance).",
    };
  }
  if (POST_GATE_STAGES.includes(to)) {
    const gate = budgetGate(job);
    if (!gate.open)
      return { allowed: false, reason: `Budgeting is locked until: ${gate.waitingOn.join("; ")}.` };
  }
  return { allowed: true };
}

export interface MissingItem {
  key: string;
  label: string;
}

/** Information still needed to keep the job moving. Plumber selection is a separate decision. */
export function missingInfo(job: JobFacts): MissingItem[] {
  const out: MissingItem[] = [];
  if (!job.homeownerPhone && !job.homeownerEmail)
    out.push({ key: "homeownerContact", label: "Homeowner phone or email" });
  if (!job.address.trim()) out.push({ key: "address", label: "Job address" });
  if (job.track === "UNDECIDED" && job.stage === "INTAKE" && job.jobWalkCompletedAt) {
    out.push({ key: "track", label: "Retail or insurance" });
  }
  if (job.track === "INSURANCE") {
    if (!job.claimNumber) out.push({ key: "claimNumber", label: "Claim number" });
    if (!job.carrier) out.push({ key: "carrier", label: "Insurance carrier" });
    if (!job.adjusterName) out.push({ key: "adjusterName", label: "Adjuster name" });
    if (!job.adjusterEmail && !job.adjusterPhone)
      out.push({ key: "adjusterContact", label: "Adjuster phone or email" });
  }
  return out;
}

export type StepState = "done" | "scheduled" | "sent" | "todo";
export interface IntakeStep {
  key: "call" | "walk" | "workAuth";
  label: string;
  state: StepState;
  at: Date | null;
}

export function intakeSteps(job: JobFacts): IntakeStep[] {
  return [
    {
      key: "call",
      label: "Homeowner call",
      state: job.homeownerCalledAt ? "done" : "todo",
      at: job.homeownerCalledAt,
    },
    {
      key: "walk",
      label: "Job walk",
      state: job.jobWalkCompletedAt ? "done" : job.jobWalkScheduledFor ? "scheduled" : "todo",
      at: job.jobWalkCompletedAt ?? job.jobWalkScheduledFor,
    },
    {
      key: "workAuth",
      label: "Work authorization (DocuSign)",
      state: job.workAuthSignedAt ? "done" : job.workAuthSentAt ? "sent" : "todo",
      at: job.workAuthSignedAt ?? job.workAuthSentAt,
    },
  ];
}

/** One plain-language next step for the dashboard. Null when the job is closed. */
export function nextStep(job: JobFacts): string | null {
  if (!isActive(job.stage)) return null;
  if (job.stage === "INTAKE") {
    const step = intakeSteps(job).find((s) => s.state !== "done");
    if (step?.key === "call") return "Call the homeowner";
    if (step?.key === "walk")
      return step.state === "scheduled" ? "Do the scheduled job walk" : "Schedule the job walk";
    if (step?.key === "workAuth")
      return step.state === "sent"
        ? "Get the work authorization signed"
        : "Send the work authorization";
    return job.track === "UNDECIDED" ? "Decide retail or insurance" : "Start the estimate";
  }
  const byStage: Partial<Record<JobStage, string>> = {
    RETAIL_BIDDING: "Collect subcontractor bids",
    RETAIL_ESTIMATE_SENT: "Waiting on customer acceptance",
    RETAIL_ACCEPTED: "Create the budget",
    INS_PREPARING_SUBMISSION: "Assemble the insurance submission",
    INS_SUBMITTED: "Waiting on the adjuster",
    INS_IN_REVISION: "Revise and resubmit to the adjuster",
    INS_AGREED: "Run the approved scope through the budgeter",
    BUDGETING: "Finish the budget",
    SCHEDULING: "Set up the Buildertrend job and schedule",
    IN_PROGRESS: "Keep trades and materials on track",
  };
  return byStage[job.stage] ?? null;
}

/** Whole days since the job last moved forward. */
export function daysSinceProgress(job: Pick<JobFacts, "lastProgressAt">, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - job.lastProgressAt.getTime()) / 86_400_000));
}
