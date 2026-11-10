import { describe, expect, it } from "vitest";
import { buildDecisionQueue, type QueueInput } from "@/server/decision-queue";

const D = new Date("2026-11-01T12:00:00Z");
const baseJob = {
  id: "j1",
  number: "26-9001",
  track: "INSURANCE" as const,
  stage: "INS_SUBMITTED" as const,
  homeownerName: "Fictional Homeowner",
  homeownerPhone: "555-0100",
  homeownerEmail: null,
  address: "1 Example St",
  claimNumber: "C-1",
  carrier: "Example Mutual",
  adjusterName: "Example Adjuster",
  adjusterEmail: "adjuster@example.com",
  adjusterPhone: null,
  referringPlumberId: "p1",
  homeownerCalledAt: D,
  jobWalkScheduledFor: null,
  jobWalkCompletedAt: D,
  workAuthSentAt: D,
  workAuthSignedAt: D,
  estimateSentAt: null,
  customerAcceptedAt: null,
  scopeApprovedAt: null,
  amountAgreedAt: null,
  lastProgressAt: D,
};

const input = (o: Partial<QueueInput> = {}): QueueInput => ({
  jobs: [baseJob],
  pendingActions: [],
  decisions: [],
  ...o,
});

describe("buildDecisionQueue", () => {
  it("is empty when nothing needs the manager", () => {
    expect(buildDecisionQueue(input())).toEqual([]);
  });

  it("asks to choose a plumber when none was referred", () => {
    const q = buildDecisionQueue(input({ jobs: [{ ...baseJob, referringPlumberId: null }] }));
    expect(q.map((i) => i.source)).toEqual(["select-plumber"]);
    expect(q[0]?.jobLabel).toBe("26-9001 · Fictional Homeowner");
  });

  it("ignores closed jobs", () => {
    const q = buildDecisionQueue(
      input({ jobs: [{ ...baseJob, stage: "LOST", referringPlumberId: null }] }),
    );
    expect(q).toEqual([]);
  });

  it("puts delay messages and urgent decisions first, then by due date", () => {
    const q = buildDecisionQueue(
      input({
        jobs: [{ ...baseJob, carrier: null }],
        pendingActions: [
          {
            id: "a1",
            jobId: "j1",
            title: "Price update",
            channel: "TEXT",
            reviewReason: "PRICE_CHANGE",
            dueAt: null,
          },
          {
            id: "a2",
            jobId: "j1",
            title: "Delay notice",
            channel: "HOMEOWNER_UPDATE",
            reviewReason: "DELAY_OR_PROBLEM",
            dueAt: null,
          },
        ],
        decisions: [
          {
            id: "d1",
            jobId: null,
            kind: "OTHER",
            title: "Later",
            detail: "",
            priority: "NORMAL",
            dueAt: new Date("2026-11-09"),
          },
          {
            id: "d2",
            jobId: null,
            kind: "OTHER",
            title: "Sooner",
            detail: "",
            priority: "NORMAL",
            dueAt: new Date("2026-11-05"),
          },
          {
            id: "d3",
            jobId: "j1",
            kind: "DELAY_OR_PROBLEM",
            title: "Drywall delayed",
            detail: "",
            priority: "URGENT",
            dueAt: null,
          },
        ],
      }),
    );
    expect(q.map((i) => i.key)).toEqual([
      "decision:d3",
      "action:a2",
      "decision:d2",
      "decision:d1",
      "missing:j1",
      "action:a1",
    ]);
  });
});
