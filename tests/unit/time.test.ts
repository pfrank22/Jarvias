import { describe, expect, it } from "vitest";
import { zonedLocalToUtc } from "@/lib/time";

describe("zonedLocalToUtc", () => {
  it("converts Central time to UTC in winter and summer", () => {
    expect(zonedLocalToUtc("2026-11-12T09:30", "America/Chicago")?.toISOString()).toBe(
      "2026-11-12T15:30:00.000Z",
    );
    expect(zonedLocalToUtc("2026-07-01T09:30", "America/Chicago")?.toISOString()).toBe(
      "2026-07-01T14:30:00.000Z",
    );
  });

  it("rejects malformed or impossible input", () => {
    expect(zonedLocalToUtc("tomorrow")).toBeNull();
    expect(zonedLocalToUtc("2026-02-30T09:00")).toBeNull();
    expect(zonedLocalToUtc("2026-11-12T25:00")).toBeNull();
  });
});
