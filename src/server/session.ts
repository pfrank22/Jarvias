import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { unauthenticated } from "./errors";
import { selectMembership, type TenantContext } from "./tenant";

export const COMPANY_COOKIE = "jarvis_company";

/**
 * Sprint 1 placeholder authentication.
 *
 * `JARVIS_AUTH_MODE=dev` signs every request in as JARVIS_DEV_USER_EMAIL (a
 * seeded, fictional user). This MUST be replaced by real authentication before
 * any deployment that holds real customer data — see AGENTS.md and
 * docs/OPEN_DECISIONS.md. A production build refuses dev auth unless explicitly
 * overridden for CI/preview environments.
 */
function devUserEmail(): string {
  if (process.env.JARVIS_AUTH_MODE !== "dev") {
    throw new Error("No authentication provider configured (set JARVIS_AUTH_MODE=dev locally).");
  }
  if (process.env.NODE_ENV === "production" && process.env.JARVIS_ALLOW_DEV_AUTH !== "true") {
    throw new Error("Dev authentication is disabled in production.");
  }
  const email = process.env.JARVIS_DEV_USER_EMAIL;
  if (!email) throw new Error("JARVIS_DEV_USER_EMAIL is not set.");
  return email;
}

async function loadUserWithMemberships() {
  const user = await db.user.findUnique({
    where: { email: devUserEmail() },
    include: {
      memberships: {
        include: { company: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) throw unauthenticated();
  return user;
}

/** Resolve the signed-in user and active company for this request. Cached per request. */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const user = await loadUserWithMemberships();
  const requested = (await cookies()).get(COMPANY_COOKIE)?.value;
  const membership = selectMembership(user.memberships, requested);
  if (!membership) throw unauthenticated();
  return {
    userId: user.id,
    userName: user.name,
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role,
  };
});

export const listMyCompanies = cache(async () => {
  const user = await loadUserWithMemberships();
  return user.memberships.map((m) => ({ id: m.company.id, name: m.company.name, role: m.role }));
});

/** True when the user is a member of `companyId`. Used before setting the cookie. */
export async function isMemberOf(companyId: string): Promise<boolean> {
  const companies = await listMyCompanies();
  return companies.some((c) => c.id === companyId);
}
