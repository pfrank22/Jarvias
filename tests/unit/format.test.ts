import { describe, expect, it } from "vitest";
import { budgetUsedPercent, daysUntil, formatCents, humanize } from "@/lib/format";

describe("format helpers", () => {
  it("formats cents as whole dollars", () => {
    expect(formatCents(1_234_500)).toBe("$12,345");
    expect(formatCents(null)).toBe("—");
  });

  it("computes budget used percent safely", () => {
    expect(budgetUsedPercent(50, 100)).toBe(50);
    expect(budgetUsedPercent(10, 0)).toBe(0);
    expect(budgetUsedPercent(-5, 100)).toBe(0);
    expect(budgetUsedPercent(10_000, 1)).toBe(999);
  });

  it("counts days until a date", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(daysUntil(new Date("2026-01-04T00:00:00Z"), now)).toBe(3);
    expect(daysUntil(new Date("2025-12-30T00:00:00Z"), now)).toBe(-2);
  });

  it("humanizes enum values", () => {
    expect(humanize("CHANGE_ORDER")).toBe("Change Order");
  });
});
