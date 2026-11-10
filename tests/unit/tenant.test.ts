import { describe, expect, it } from "vitest";
import { hasRoleAtLeast, selectMembership } from "@/server/tenant";

const m = (companyId: string) => ({
  companyId,
  role: "MEMBER" as const,
  company: { id: companyId, name: companyId },
});

describe("selectMembership", () => {
  it("returns null with no memberships", () => {
    expect(selectMembership([], "a")).toBeNull();
  });

  it("selects the requested company when the user belongs to it", () => {
    expect(selectMembership([m("a"), m("b")], "b")?.companyId).toBe("b");
  });

  it("ignores a requested company the user does not belong to", () => {
    expect(selectMembership([m("a"), m("b")], "someone-elses-company")?.companyId).toBe("a");
  });

  it("falls back to the first membership when nothing is requested", () => {
    expect(selectMembership([m("a"), m("b")], undefined)?.companyId).toBe("a");
  });
});

describe("hasRoleAtLeast", () => {
  it("orders roles VIEWER < MEMBER < MANAGER < ADMIN < OWNER", () => {
    expect(hasRoleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(hasRoleAtLeast("MANAGER", "MANAGER")).toBe(true);
    expect(hasRoleAtLeast("MEMBER", "MANAGER")).toBe(false);
    expect(hasRoleAtLeast("VIEWER", "MEMBER")).toBe(false);
  });
});
