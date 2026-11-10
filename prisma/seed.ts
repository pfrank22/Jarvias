/**
 * Fictional seed data for local development and previews.
 * Every company, person, email and amount here is invented. Emails use the
 * reserved example.com domain. Never add real customer data to this file.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  ApprovalType,
  Priority,
  ProjectHealth,
  ProjectStatus,
  Role,
  TaskStatus,
} from "../src/generated/prisma/enums";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
if (/prod/i.test(connectionString) && process.env.JARVIS_ALLOW_SEED !== "true") {
  throw new Error("Refusing to seed a database whose URL looks like production.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DAY = 86_400_000;
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
const day = (offset: number) => new Date(today.getTime() + offset * DAY);
const dollars = (n: number) => Math.round(n * 100);

const users = [
  { key: "alex", name: "Alex Rivera", email: "alex.rivera@example.com" },
  { key: "sam", name: "Sam Okafor", email: "sam.okafor@example.com" },
  { key: "jordan", name: "Jordan Lee", email: "jordan.lee@example.com" },
  { key: "priya", name: "Priya Nair", email: "priya.nair@example.com" },
  { key: "morgan", name: "Morgan Blake", email: "morgan.blake@example.com" },
  { key: "casey", name: "Casey Duarte", email: "casey.duarte@example.com" },
] as const;
type UserKey = (typeof users)[number]["key"];

interface SeedProject {
  code: string;
  name: string;
  clientName: string;
  description: string;
  status: ProjectStatus;
  health: ProjectHealth;
  progress: number;
  budget: number;
  spent: number;
  start: number;
  due: number;
  manager: UserKey;
  tasks: { title: string; status: TaskStatus; due: number; assignee?: UserKey }[];
  approvals: {
    type: ApprovalType;
    title: string;
    description: string;
    amount?: number;
    priority: Priority;
    due: number;
    requestedBy: UserKey;
  }[];
}

interface SeedCompany {
  slug: string;
  name: string;
  members: { user: UserKey; role: Role }[];
  projects: SeedProject[];
}

const companies: SeedCompany[] = [
  {
    slug: "northwind-builders",
    name: "Northwind Builders",
    members: [
      { user: "alex", role: "OWNER" },
      { user: "sam", role: "MANAGER" },
      { user: "jordan", role: "MEMBER" },
      { user: "priya", role: "ADMIN" },
    ],
    projects: [
      {
        code: "NW-101",
        name: "Harbor View Kitchen Remodel",
        clientName: "Fictional Client: The Lindqvist Household",
        description: "Full kitchen remodel with new cabinetry, island and lighting.",
        status: "ACTIVE",
        health: "ON_TRACK",
        progress: 62,
        budget: 84_000,
        spent: 49_300,
        start: -40,
        due: 28,
        manager: "sam",
        tasks: [
          { title: "Install upper cabinets", status: "IN_PROGRESS", due: 3, assignee: "jordan" },
          { title: "Countertop templating", status: "TODO", due: 6, assignee: "sam" },
          { title: "Electrical rough-in inspection", status: "DONE", due: -5, assignee: "jordan" },
          { title: "Order pendant lights", status: "TODO", due: 9 },
        ],
        approvals: [
          {
            type: "CHANGE_ORDER",
            title: "Upgrade to quartz countertops",
            description: "Client requested quartz instead of laminate.",
            amount: 6_450,
            priority: "HIGH",
            due: 2,
            requestedBy: "sam",
          },
        ],
      },
      {
        code: "NW-102",
        name: "Maple Street Basement Finish",
        clientName: "Fictional Client: Ortega Family",
        description: "Finish 900 sq ft basement with bedroom, bath and media room.",
        status: "ACTIVE",
        health: "AT_RISK",
        progress: 35,
        budget: 120_000,
        spent: 71_800,
        start: -55,
        due: 45,
        manager: "sam",
        tasks: [
          {
            title: "Resolve moisture issue on north wall",
            status: "BLOCKED",
            due: -2,
            assignee: "jordan",
          },
          { title: "Framing walkthrough", status: "TODO", due: 4, assignee: "sam" },
          { title: "Plumbing rough-in", status: "IN_PROGRESS", due: 8 },
        ],
        approvals: [
          {
            type: "PURCHASE",
            title: "Sump pump and drainage membrane",
            description: "Required to remediate moisture before framing continues.",
            amount: 3_980,
            priority: "URGENT",
            due: 1,
            requestedBy: "jordan",
          },
          {
            type: "CHANGE_ORDER",
            title: "Add wet bar to media room",
            description: "Scope addition requested by client.",
            amount: 14_200,
            priority: "NORMAL",
            due: 10,
            requestedBy: "sam",
          },
        ],
      },
      {
        code: "NW-103",
        name: "Cedar Ridge Office Fit-Out",
        clientName: "Fictional Client: Brightline Analytics LLC",
        description: "Commercial tenant improvement, 4,200 sq ft.",
        status: "ACTIVE",
        health: "OFF_TRACK",
        progress: 48,
        budget: 310_000,
        spent: 228_500,
        start: -90,
        due: 12,
        manager: "priya",
        tasks: [
          { title: "HVAC balancing", status: "IN_PROGRESS", due: 2, assignee: "jordan" },
          { title: "Fire marshal final", status: "TODO", due: 10, assignee: "priya" },
          { title: "Punch list walk", status: "TODO", due: 11 },
        ],
        approvals: [
          {
            type: "INVOICE",
            title: "Subcontractor invoice — Apex Mechanical (fictional)",
            description: "Progress billing #3.",
            amount: 27_500,
            priority: "HIGH",
            due: 3,
            requestedBy: "priya",
          },
          {
            type: "TIMESHEET",
            title: "Week 45 crew timesheets",
            description: "6 crew members, 212 hours total.",
            priority: "NORMAL",
            due: 2,
            requestedBy: "jordan",
          },
        ],
      },
      {
        code: "NW-104",
        name: "Lakeshore Deck Replacement",
        clientName: "Fictional Client: Patel Residence",
        description: "Replace 400 sq ft deck with composite decking.",
        status: "PLANNING",
        health: "ON_TRACK",
        progress: 5,
        budget: 38_000,
        spent: 1_200,
        start: 14,
        due: 50,
        manager: "sam",
        tasks: [{ title: "Permit application", status: "IN_PROGRESS", due: 5, assignee: "sam" }],
        approvals: [
          {
            type: "DOCUMENT",
            title: "Signed scope of work",
            description: "Review final scope before sending to client.",
            priority: "LOW",
            due: 7,
            requestedBy: "sam",
          },
        ],
      },
      {
        code: "NW-099",
        name: "Elm Court Bathroom Refresh",
        clientName: "Fictional Client: Nakamura Household",
        description: "Completed bathroom refresh.",
        status: "COMPLETED",
        health: "ON_TRACK",
        progress: 100,
        budget: 22_000,
        spent: 21_340,
        start: -120,
        due: -30,
        manager: "sam",
        tasks: [],
        approvals: [],
      },
    ],
  },
  {
    slug: "bluepeak-renovations",
    name: "Bluepeak Renovations",
    members: [
      { user: "morgan", role: "OWNER" },
      { user: "alex", role: "MANAGER" },
      { user: "casey", role: "MEMBER" },
    ],
    projects: [
      {
        code: "BP-201",
        name: "Summit Lodge Roof Repair",
        clientName: "Fictional Client: Summit Lodge Partners",
        description: "Storm damage roof repair and gutter replacement.",
        status: "ACTIVE",
        health: "AT_RISK",
        progress: 40,
        budget: 56_000,
        spent: 30_100,
        start: -20,
        due: 18,
        manager: "alex",
        tasks: [
          { title: "Tear-off east slope", status: "DONE", due: -3, assignee: "casey" },
          { title: "Ice & water shield install", status: "IN_PROGRESS", due: 2, assignee: "casey" },
        ],
        approvals: [
          {
            type: "PURCHASE",
            title: "Additional roofing bundles",
            description: "Hidden decking damage increased material needs.",
            amount: 2_340,
            priority: "HIGH",
            due: 1,
            requestedBy: "casey",
          },
          {
            type: "CHANGE_ORDER",
            title: "Replace rotted fascia boards",
            description: "Discovered during tear-off.",
            amount: 12_800,
            priority: "NORMAL",
            due: 5,
            requestedBy: "casey",
          },
        ],
      },
      {
        code: "BP-202",
        name: "Riverside Duplex Siding",
        clientName: "Fictional Client: Riverside Rentals Co.",
        description: "Replace siding on both units.",
        status: "ON_HOLD",
        health: "AT_RISK",
        progress: 15,
        budget: 44_000,
        spent: 6_500,
        start: -10,
        due: 60,
        manager: "alex",
        tasks: [{ title: "Await HOA color approval", status: "BLOCKED", due: 4 }],
        approvals: [],
      },
    ],
  },
  {
    slug: "cedar-stone-interiors",
    name: "Cedar & Stone Interiors",
    members: [
      { user: "casey", role: "OWNER" },
      { user: "alex", role: "VIEWER" },
    ],
    projects: [
      {
        code: "CS-301",
        name: "Gallery Loft Interior Design",
        clientName: "Fictional Client: Hollis Art Collective",
        description: "Interior design and furnishing for an open-plan loft.",
        status: "ACTIVE",
        health: "ON_TRACK",
        progress: 70,
        budget: 65_000,
        spent: 41_000,
        start: -30,
        due: 20,
        manager: "casey",
        tasks: [{ title: "Lighting plan sign-off", status: "TODO", due: 3, assignee: "casey" }],
        approvals: [
          {
            type: "PURCHASE",
            title: "Custom walnut dining table",
            description: "Lead time 6 weeks.",
            amount: 8_900,
            priority: "NORMAL",
            due: 6,
            requestedBy: "casey",
          },
        ],
      },
    ],
  },
];

async function main() {
  console.log("Seeding fictional data…");
  // Order matters because of foreign keys.
  await prisma.activityLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const userIds = {} as Record<UserKey, string>;
  for (const u of users) {
    const created = await prisma.user.create({ data: { name: u.name, email: u.email } });
    userIds[u.key] = created.id;
  }

  for (const c of companies) {
    const company = await prisma.company.create({ data: { name: c.name, slug: c.slug } });
    for (const m of c.members) {
      await prisma.membership.create({
        data: { companyId: company.id, userId: userIds[m.user], role: m.role },
      });
    }
    for (const p of c.projects) {
      const project = await prisma.project.create({
        data: {
          companyId: company.id,
          code: p.code,
          name: p.name,
          clientName: p.clientName,
          description: p.description,
          status: p.status,
          health: p.health,
          progress: p.progress,
          budgetCents: dollars(p.budget),
          spentCents: dollars(p.spent),
          startDate: day(p.start),
          dueDate: day(p.due),
          managerId: userIds[p.manager],
        },
      });
      for (const t of p.tasks) {
        await prisma.task.create({
          data: {
            companyId: company.id,
            projectId: project.id,
            title: t.title,
            status: t.status,
            dueDate: day(t.due),
            assigneeId: t.assignee ? userIds[t.assignee] : null,
          },
        });
      }
      for (const a of p.approvals) {
        const approval = await prisma.approval.create({
          data: {
            companyId: company.id,
            projectId: project.id,
            type: a.type,
            title: a.title,
            description: a.description,
            amountCents: a.amount === undefined ? null : dollars(a.amount),
            priority: a.priority,
            dueDate: day(a.due),
            requestedById: userIds[a.requestedBy],
          },
        });
        await prisma.activityLog.create({
          data: {
            companyId: company.id,
            projectId: project.id,
            actorId: userIds[a.requestedBy],
            action: "approval.requested",
            entityType: "Approval",
            entityId: approval.id,
            metadata: { title: a.title },
          },
        });
      }
    }
  }
  console.log(`Seeded ${users.length} users and ${companies.length} companies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
