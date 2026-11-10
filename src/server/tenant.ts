import type { Role } from "@/generated/prisma/enums";

/**
 * Everything a service needs to know about *who* is acting and *for which
 * company*. Every tenant-scoped query must filter by `ctx.companyId`.
 */
export interface TenantContext {
  userId: string;
  userName: string;
  companyId: string;
  companyName: string;
  role: Role;
}

export interface MembershipLike {
  companyId: string;
  role: Role;
  company: { id: string; name: string };
}

/**
 * Pick the active membership: the requested company if the user belongs to it,
 * otherwise the first membership (stable order). Returns null when the user has
 * no memberships. A requested company the user does not belong to is ignored —
 * never trusted.
 */
export function selectMembership<T extends MembershipLike>(
  memberships: readonly T[],
  requestedCompanyId: string | undefined,
): T | null {
  if (memberships.length === 0) return null;
  if (requestedCompanyId) {
    const match = memberships.find((m) => m.companyId === requestedCompanyId);
    if (match) return match;
  }
  return memberships[0] ?? null;
}

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
