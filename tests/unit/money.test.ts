import { describe, expect, it } from "vitest";
import { MAX_AMOUNT_CENTS, parseDollarsToCents } from "@/lib/money";

describe("parseDollarsToCents", () => {
  it("returns null for empty input", () => {
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents("   ")).toBeNull();
    expect(parseDollarsToCents(undefined)).toBeNull();
  });

  it("parses common formats exactly", () => {
    expect(parseDollarsToCents("1,234.56")).toBe(123_456);
    expect(parseDollarsToCents("$950")).toBe(95_000);
    expect(parseDollarsToCents(" 12 ")).toBe(1_200);
    expect(parseDollarsToCents("0.29")).toBe(29);
    expect(parseDollarsToCents("7.5")).toBe(750);
  });

  it("rejects invalid amounts", () => {
    for (const bad of ["-5", "abc", "1.234", "1e5", "$", "12.", "1 000"]) {
      expect(parseDollarsToCents(bad), bad).toBeNaN();
    }
  });

  it("rejects amounts above the maximum", () => {
    expect(parseDollarsToCents(String(MAX_AMOUNT_CENTS / 100 + 1))).toBeNaN();
  });
});
