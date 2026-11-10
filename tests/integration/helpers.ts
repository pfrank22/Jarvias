import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import type { TenantContext } from "@/server/tenant";

export async function resetDatabase() {
  await db.$executeRawUnsafe(
    `TRUNCATE "JobAction", "JobDocument", "Decision", "Job", "Contact", "ActivityLog", "Approval", "Task", "Project", "Membership", "Company", "User" CASCADE`,
  );
}

let seq = 0;
export async function makeCompany(name: string) {
  seq += 1;
  return db.company.create({
    data: { name, slug: `${name.toLowerCase().replace(/\W+/g, "-")}-${seq}` },
  });
}

export async function makeMember(companyId: string, role: Role, name = `${role} ${++seq}`) {
  const user = await db.user.create({ data: { name, email: `user${++seq}@example.com` } });
  await db.membership.create({ data: { userId: user.id, companyId, role } });
  return user;
}

export function ctxFor(
  user: { id: string; name: string },
  company: { id: string; name: string },
  role: Role,
): TenantContext {
  return {
    userId: user.id,
    userName: user.name,
    companyId: company.id,
    companyName: company.name,
    role,
  };
}

export async function makeProject(companyId: string, code: string) {
  return db.project.create({
    data: {
      companyId,
      code,
      name: `Project ${code}`,
      clientName: "Fictional Client",
      status: "ACTIVE",
    },
  });
}

export async function makeApproval(
  companyId: string,
  projectId: string,
  requestedById: string,
  amountCents: number | null = 10_000,
) {
  return db.approval.create({
    data: {
      companyId,
      projectId,
      requestedById,
      type: "PURCHASE",
      title: "Test purchase",
      amountCents,
    },
  });
}

export async function makeJob(companyId: string, overrides: Record<string, unknown> = {}) {
  return db.job.create({
    data: {
      companyId,
      homeownerName: "Fictional Homeowner",
      homeownerPhone: "555-0100",
      address: "1 Example St",
      track: "INSURANCE",
      stage: "INS_SUBMITTED",
      claimNumber: "C-1",
      carrier: "Example Mutual",
      adjusterName: "Example Adjuster",
      adjusterEmail: "adjuster@example.com",
      ...overrides,
    },
  });
}

export async function makeAction(
  companyId: string,
  jobId: string,
  overrides: Record<string, unknown> = {},
) {
  return db.jobAction.create({
    data: { companyId, jobId, channel: "TEXT", title: "Fictional text", ...overrides },
  });
}
