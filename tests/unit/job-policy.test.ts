import { describe, expect, it } from "vitest";
import {
  budgetGate,
  canEnterStage,
  daysSinceProgress,
  intakeSteps,
  missingInfo,
  nextStep,
  stageFitsTrack,
  type JobFacts,
} from "@/server/job-policy";

const D = new Date("2026-11-01T12:00:00Z");
const job = (o: Partial<JobFacts> = {}): JobFacts => ({
  track: "UNDECIDED",
  stage: "INTAKE",
  homeownerName: "Fictional Homeowner",
  homeownerPhone: "555-0100",
  homeownerEmail: null,
  address: "1 Example St",
  claimNumber: null,
  carrier: null,
  adjusterName: null,
  adjusterEmail: null,
  adjusterPhone: null,
  referringPlumberId: "plumber",
  homeownerCalledAt: null,
  jobWalkScheduledFor: null,
  jobWalkCompletedAt: null,
  workAuthSentAt: null,
  workAuthSignedAt: null,
  estimateSentAt: null,
  customerAcceptedAt: null,
  scopeApprovedAt: null,
  amountAgreedAt: null,
  lastProgressAt: D,
  ...o,
});

describe("budget gate", () => {
  it("stays closed for retail until the customer accepts", () => {
    expect(budgetGate(job({ track: "RETAIL" }))).toEqual({
      open: false,
      waitingOn: ["Customer acceptance of the estimate"],
    });
    expect(budgetGate(job({ track: "RETAIL", customerAcceptedAt: D })).open).toBe(true);
  });

  it("needs BOTH scope approval and amount agreement for insurance", () => {
    expect(budgetGate(job({ track: "INSURANCE", scopeApprovedAt: D })).open).toBe(false);
    expect(budgetGate(job({ track: "INSURANCE", amountAgreedAt: D })).open).toBe(false);
    expect(
      budgetGate(job({ track: "INSURANCE", scopeApprovedAt: D, amountAgreedAt: D })).open,
    ).toBe(true);
  });

  it("is never opened by a signed work authorization", () => {
    expect(budgetGate(job({ track: "INSURANCE", workAuthSignedAt: D })).open).toBe(false);
  });

  it("is closed while the track is undecided", () => {
    expect(budgetGate(job()).open).toBe(false);
  });
});

describe("stages", () => {
  it("keeps retail and insurance stages separate", () => {
    expect(stageFitsTrack("RETAIL_BIDDING", "INSURANCE")).toBe(false);
    expect(stageFitsTrack("INS_SUBMITTED", "RETAIL")).toBe(false);
    expect(stageFitsTrack("INS_SUBMITTED", "INSURANCE")).toBe(true);
    expect(stageFitsTrack("BUDGETING", "UNDECIDED")).toBe(false);
  });

  it("refuses budgeting and later stages while the gate is closed", () => {
    const j = job({ track: "INSURANCE", stage: "INS_SUBMITTED", scopeApprovedAt: D });
    for (const to of ["BUDGETING", "SCHEDULING", "IN_PROGRESS", "COMPLETE"] as const) {
      expect(canEnterStage(j, to).allowed).toBe(false);
    }
    expect(canEnterStage({ ...j, amountAgreedAt: D }, "BUDGETING").allowed).toBe(true);
  });
});

describe("missing info", () => {
  it("flags homeowner contact and insurance claim details", () => {
    const keys = missingInfo(job({ track: "INSURANCE", homeownerPhone: null })).map((m) => m.key);
    expect(keys).toEqual([
      "homeownerContact",
      "claimNumber",
      "carrier",
      "adjusterName",
      "adjusterContact",
    ]);
  });

  it("does not ask for claim details on retail jobs", () => {
    expect(missingInfo(job({ track: "RETAIL" }))).toEqual([]);
  });
});

describe("intake and next step", () => {
  it("tracks call, job walk and work authorization", () => {
    const steps = intakeSteps(
      job({ homeownerCalledAt: D, jobWalkScheduledFor: D, workAuthSentAt: D }),
    );
    expect(steps.map((s) => s.state)).toEqual(["done", "scheduled", "sent"]);
  });

  it("suggests the first unfinished intake step", () => {
    expect(nextStep(job())).toBe("Call the homeowner");
    expect(nextStep(job({ homeownerCalledAt: D }))).toBe("Schedule the job walk");
    expect(nextStep(job({ homeownerCalledAt: D, jobWalkCompletedAt: D, workAuthSentAt: D }))).toBe(
      "Get the work authorization signed",
    );
  });

  it("has no next step for closed jobs", () => {
    expect(nextStep(job({ stage: "COMPLETE", track: "RETAIL" }))).toBeNull();
  });

  it("counts whole days since progress", () => {
    expect(daysSinceProgress(job(), new Date("2026-11-04T13:00:00Z"))).toBe(3);
  });
});
