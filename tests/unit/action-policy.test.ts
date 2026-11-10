import { describe, expect, it } from "vitest";
import { availableTransitions, canTransition } from "@/server/action-policy";

describe("action states", () => {
  it("never lets a draft count as completed", () => {
    expect(canTransition({ status: "DRAFT", reviewReason: null }, "COMPLETED").allowed).toBe(false);
  });

  it("lets routine drafts be marked sent", () => {
    expect(canTransition({ status: "DRAFT", reviewReason: null }, "SENT").allowed).toBe(true);
  });

  it.each(["PRICE_CHANGE", "SCHEDULE_COMMITMENT", "DELAY_OR_PROBLEM"] as const)(
    "requires approval before sending a %s message",
    (reviewReason) => {
      expect(canTransition({ status: "DRAFT", reviewReason }, "SENT").allowed).toBe(false);
      expect(canTransition({ status: "PENDING_APPROVAL", reviewReason }, "SENT").allowed).toBe(
        true,
      );
    },
  );

  it("only completes what was sent", () => {
    expect(canTransition({ status: "SENT", reviewReason: null }, "COMPLETED").allowed).toBe(true);
    expect(
      canTransition({ status: "PENDING_APPROVAL", reviewReason: null }, "COMPLETED").allowed,
    ).toBe(false);
  });

  it("treats completed and cancelled as final", () => {
    expect(availableTransitions({ status: "COMPLETED", reviewReason: null })).toEqual([]);
    expect(availableTransitions({ status: "CANCELLED", reviewReason: null })).toEqual([]);
  });

  it("offers only allowed buttons", () => {
    expect(availableTransitions({ status: "DRAFT", reviewReason: "PRICE_CHANGE" })).toEqual([
      "PENDING_APPROVAL",
      "CANCELLED",
    ]);
  });
});
