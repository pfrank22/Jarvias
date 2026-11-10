import { describe, expect, it } from "vitest";
import {
  MANAGER_APPROVAL_LIMIT_CENTS,
  canDecide,
  validateDecisionNote,
} from "@/server/approval-policy";
import type { Role } from "@/generated/prisma/enums";

const pending = (overrides: Partial<Parameters<typeof canDecide>[1]> = {}) => ({
  status: "PENDING" as const,
  amountCents: 50_000,
  requestedById: "requester",
  ...overrides,
});
const actor = (role: Role, userId = "decider") => ({ userId, role });

describe("canDecide", () => {
  it.each<Role>(["OWNER", "ADMIN", "MANAGER"])("allows %s to decide a small request", (role) => {
    expect(canDecide(actor(role), pending())).toEqual({ allowed: true });
  });

  it.each<Role>(["MEMBER", "VIEWER"])("denies %s", (role) => {
    expect(canDecide(actor(role), pending()).allowed).toBe(false);
  });

  it("denies deciding your own request, even as owner", () => {
    const result = canDecide(actor("OWNER", "requester"), pending());
    expect(result).toEqual({ allowed: false, reason: "You cannot decide on your own request." });
  });

  it("denies already-decided requests", () => {
    expect(canDecide(actor("OWNER"), pending({ status: "APPROVED" })).allowed).toBe(false);
    expect(canDecide(actor("OWNER"), pending({ status: "REJECTED" })).allowed).toBe(false);
  });

  it("lets a manager approve exactly at the limit but not above it", () => {
    expect(
      canDecide(actor("MANAGER"), pending({ amountCents: MANAGER_APPROVAL_LIMIT_CENTS })).allowed,
    ).toBe(true);
    expect(
      canDecide(actor("MANAGER"), pending({ amountCents: MANAGER_APPROVAL_LIMIT_CENTS + 1 }))
        .allowed,
    ).toBe(false);
  });

  it("lets admins and owners approve above the manager limit", () => {
    const big = pending({ amountCents: MANAGER_APPROVAL_LIMIT_CENTS * 10 });
    expect(canDecide(actor("ADMIN"), big).allowed).toBe(true);
    expect(canDecide(actor("OWNER"), big).allowed).toBe(true);
  });

  it("lets a manager decide requests with no amount", () => {
    expect(canDecide(actor("MANAGER"), pending({ amountCents: null })).allowed).toBe(true);
  });
});

describe("validateDecisionNote", () => {
  it("requires a reason to reject", () => {
    expect(validateDecisionNote("REJECT", undefined).allowed).toBe(false);
    expect(validateDecisionNote("REJECT", "  nope ").allowed).toBe(true);
    expect(validateDecisionNote("REJECT", "  ").allowed).toBe(false);
  });

  it("does not require a note to approve", () => {
    expect(validateDecisionNote("APPROVE", undefined).allowed).toBe(true);
  });

  it("caps note length", () => {
    expect(validateDecisionNote("APPROVE", "x".repeat(1001)).allowed).toBe(false);
  });
});
