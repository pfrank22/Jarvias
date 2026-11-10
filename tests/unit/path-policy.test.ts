import { describe, expect, it } from "vitest";
import {
  adjusterEvent,
  chooseTrack,
  markCustomerAccepted,
  markEstimateSent,
  priceFromCostCents,
  retailTotals,
  startPath,
  submissionPackage,
  validateMarginBps,
  type PathJob,
} from "@/server/path-policy";

const NOW = new Date("2026-11-10T12:00:00Z");
const job = (o: Partial<PathJob> = {}): PathJob => ({
  track: "UNDECIDED",
  stage: "INTAKE",
  workAuthSignedAt: null,
  scopeApprovedAt: null,
  amountAgreedAt: null,
  ...o,
});

describe("retail pricing", () => {
  it("prices at gross margin: $1,000 cost at 50% is $2,000", () => {
    expect(priceFromCostCents(100_000, 5000)).toBe(200_000);
  });

  it("supports other margins per estimate", () => {
    expect(priceFromCostCents(100_000, 4000)).toBe(166_667); // $1,666.67
    expect(priceFromCostCents(100_000, 0)).toBe(100_000);
  });

  it("totals lines and reports the real margin", () => {
    const t = retailTotals([{ costCents: 100_000 }, { costCents: 50_000 }], 5000);
    expect(t).toEqual({ costCents: 150_000, priceCents: 300_000, marginPct: 0.5 });
  });

  it("rejects impossible margins", () => {
    expect(() => priceFromCostCents(100, 10_000)).toThrow();
    expect(validateMarginBps(9500).allowed).toBe(false);
    expect(validateMarginBps(5000).allowed).toBe(true);
  });
});

describe("intake to path", () => {
  it("chooses a track only during intake", () => {
    expect(chooseTrack(job(), "RETAIL")).toEqual({ allowed: true, change: { track: "RETAIL" } });
    expect(chooseTrack(job({ stage: "INS_SUBMITTED", track: "INSURANCE" }), "RETAIL").allowed).toBe(
      false,
    );
  });

  it("starts the right path for each track", () => {
    expect(startPath(job({ track: "RETAIL" }))).toMatchObject({
      change: { stage: "RETAIL_BIDDING" },
    });
    expect(startPath(job({ track: "INSURANCE" }))).toMatchObject({
      change: { stage: "INS_PREPARING_SUBMISSION" },
    });
    expect(startPath(job()).allowed).toBe(false);
  });
});

describe("retail path", () => {
  const retail = (stage: PathJob["stage"]) => job({ track: "RETAIL", stage });

  it("needs cost lines before the estimate goes out", () => {
    expect(markEstimateSent(retail("RETAIL_BIDDING"), 0, NOW).allowed).toBe(false);
    expect(markEstimateSent(retail("RETAIL_BIDDING"), 2, NOW)).toMatchObject({
      change: { stage: "RETAIL_ESTIMATE_SENT", estimateSentAt: NOW },
    });
  });

  it("records the accepted price as the contract", () => {
    expect(markCustomerAccepted(retail("RETAIL_BIDDING"), 200_000, NOW).allowed).toBe(false);
    expect(markCustomerAccepted(retail("RETAIL_ESTIMATE_SENT"), 200_000, NOW)).toMatchObject({
      change: { stage: "RETAIL_ACCEPTED", contractCents: 200_000 },
    });
  });
});

describe("insurance path", () => {
  const ins = (o: Partial<PathJob> = {}) =>
    job({ track: "INSURANCE", stage: "INS_SUBMITTED", ...o });

  it("needs a complete package to submit", () => {
    const prep = ins({ stage: "INS_PREPARING_SUBMISSION" });
    expect(adjusterEvent(prep, "SUBMITTED", { now: NOW, packageReady: false }).allowed).toBe(false);
    expect(adjusterEvent(prep, "SUBMITTED", { now: NOW, packageReady: true })).toMatchObject({
      change: { stage: "INS_SUBMITTED" },
    });
  });

  it("cycles through revisions", () => {
    expect(
      adjusterEvent(ins(), "REVISION_REQUESTED", { now: NOW, packageReady: true }),
    ).toMatchObject({
      change: { stage: "INS_IN_REVISION" },
    });
    expect(
      adjusterEvent(ins({ stage: "INS_IN_REVISION" }), "RESUBMITTED", {
        now: NOW,
        packageReady: true,
      }),
    ).toMatchObject({ change: { stage: "INS_SUBMITTED" } });
  });

  it("reaches 'agreed' only when scope is approved AND the amount is agreed", () => {
    const scopeOnly = adjusterEvent(ins(), "SCOPE_APPROVED", { now: NOW, packageReady: true });
    expect(scopeOnly).toEqual({ allowed: true, change: { scopeApprovedAt: NOW } });

    const amountOnly = adjusterEvent(ins(), "AMOUNT_AGREED", {
      now: NOW,
      amountCents: 4_800_000,
      packageReady: true,
    });
    expect(amountOnly).toEqual({
      allowed: true,
      change: { amountAgreedAt: NOW, contractCents: 4_800_000 },
    });

    const both = adjusterEvent(ins({ scopeApprovedAt: NOW }), "AMOUNT_AGREED", {
      now: NOW,
      amountCents: 4_800_000,
      packageReady: true,
    });
    expect(both).toMatchObject({ change: { stage: "INS_AGREED" } });
  });

  it("requires the agreed amount", () => {
    expect(adjusterEvent(ins(), "AMOUNT_AGREED", { now: NOW, packageReady: true }).allowed).toBe(
      false,
    );
  });

  it("refuses claim events on retail jobs or before submission", () => {
    expect(
      adjusterEvent(job({ track: "RETAIL", stage: "RETAIL_BIDDING" }), "RESPONSE", {
        now: NOW,
        packageReady: true,
      }).allowed,
    ).toBe(false);
    expect(
      adjusterEvent(ins({ stage: "INS_PREPARING_SUBMISSION" }), "SCOPE_APPROVED", {
        now: NOW,
        packageReady: true,
      }).allowed,
    ).toBe(false);
  });
});

describe("submission package", () => {
  it("lists what is missing", () => {
    const items = submissionPackage({ workAuthSignedAt: null }, [
      { kind: "ESTIMATE", status: "RECEIVED" },
      { kind: "SIGNED_CONTRACT", status: "RECEIVED" },
    ]);
    expect(items.map((i) => [i.key, i.ok])).toEqual([
      ["workAuth", false],
      ["estimate", true],
      ["contract", false], // received but not signed
      ["bids", false],
    ]);
  });
});
