/**
 * Fictional seed data for local development and previews.
 * Every company, person, email and amount here is invented. Emails use the
 * reserved example.com domain. Never add real customer data to this file.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
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

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

/** Fictional restoration jobs, contacts, documents, actions and decisions. */
async function seedRestoration(companyId: string, managerId: string) {
  const contact = (data: Omit<Prisma.ContactUncheckedCreateInput, "companyId">) =>
    prisma.contact.create({ data: { companyId, ...data } });

  const plumberA = await contact({
    name: "Northside Plumbing (fictional)",
    kind: "SUBCONTRACTOR",
    trades: ["PLUMBING"],
    phone: "555-0110",
  });
  const plumberB = await contact({
    name: "Pipeline Pros (fictional)",
    kind: "SUBCONTRACTOR",
    trades: ["PLUMBING"],
    phone: "555-0111",
  });
  await contact({
    name: "Ben Torres Drywall (fictional)",
    kind: "SUBCONTRACTOR",
    trades: ["DRYWALL"],
    phone: "555-0120",
  });
  await contact({
    name: "Luis Ortega Drywall (fictional)",
    kind: "SUBCONTRACTOR",
    trades: ["DRYWALL", "PAINTING"],
    phone: "555-0121",
  });
  const mitigation = await contact({
    name: "Riverbend Mitigation (fictional)",
    kind: "MITIGATION_PARTNER",
    trades: [],
    email: "handoffs@example.com",
  });

  const base = { companyId, managerId, mitigationContactId: mitigation.id };
  const job = (data: Omit<Prisma.JobUncheckedCreateInput, "companyId">) =>
    prisma.job.create({ data: { ...base, ...data } });

  // 1. Fresh insurance lead: intake just started, no plumber named in the lead.
  const j1 = await job({
    homeownerName: "Dana Whitfield (fictional)",
    homeownerPhone: "555-0201",
    address: "418 Example Ave",
    track: "INSURANCE",
    stage: "INTAKE",
    claimNumber: "FIC-20931",
    carrier: "Example Mutual",
    scopeSummary:
      "Kitchen and hall: water from dishwasher supply line. Drywall to 2 ft, base cabinets.",
    lastProgressAt: hoursAgo(20),
  });
  // 2. Insurance job submitted, waiting on the adjuster for 6 days.
  const j2 = await job({
    number: "26-9001",
    homeownerName: "Marcus Lee (fictional)",
    homeownerEmail: "marcus@example.com",
    address: "77 Sample Rd",
    track: "INSURANCE",
    stage: "INS_SUBMITTED",
    claimNumber: "FIC-20877",
    carrier: "Example Mutual",
    adjusterName: "Pat Example",
    adjusterEmail: "adjuster@example.com",
    referringPlumberId: plumberA.id,
    homeownerCalledAt: hoursAgo(400),
    jobWalkCompletedAt: hoursAgo(380),
    workAuthSentAt: hoursAgo(379),
    workAuthSignedAt: hoursAgo(300),
    scopeSummary: "Basement finish: drywall, insulation, carpet, trim.",
    lastProgressAt: hoursAgo(6 * 24),
  });
  // 3. Retail job collecting bids.
  const j3 = await job({
    homeownerName: "Erin Castillo (fictional)",
    homeownerPhone: "555-0203",
    address: "9 Placeholder Ct",
    track: "RETAIL",
    stage: "RETAIL_BIDDING",
    referringPlumberId: plumberB.id,
    homeownerCalledAt: hoursAgo(90),
    jobWalkCompletedAt: hoursAgo(70),
    workAuthSentAt: hoursAgo(69),
    workAuthSignedAt: hoursAgo(50),
    scopeSummary: "Bathroom rebuild after leak: tile surround, vanity, paint.",
    lastProgressAt: hoursAgo(30),
  });
  // 4. Insurance job agreed: gate open, ready for the budgeter.
  const j4 = await job({
    number: "26-9002",
    homeownerName: "Sam Patel (fictional)",
    homeownerPhone: "555-0204",
    address: "12 Mock St",
    track: "INSURANCE",
    stage: "INS_AGREED",
    claimNumber: "FIC-20512",
    carrier: "Sample Insurance Co",
    adjusterName: "Jordan Sample",
    adjusterPhone: "555-0300",
    referringPlumberId: plumberA.id,
    homeownerCalledAt: hoursAgo(900),
    jobWalkCompletedAt: hoursAgo(880),
    workAuthSentAt: hoursAgo(879),
    workAuthSignedAt: hoursAgo(860),
    scopeApprovedAt: hoursAgo(50),
    amountAgreedAt: hoursAgo(26),
    contractCents: 4_865_000,
    scopeSummary: "Living room and stairs: drywall, paint, carpet.",
    lastProgressAt: hoursAgo(26),
  });
  // 5. Job in progress with a drywall delay.
  const j5 = await job({
    number: "26-9003",
    homeownerName: "Riley Moore (fictional)",
    homeownerPhone: "555-0205",
    address: "300 Demo Blvd",
    track: "RETAIL",
    stage: "IN_PROGRESS",
    referringPlumberId: plumberB.id,
    homeownerCalledAt: hoursAgo(1500),
    jobWalkCompletedAt: hoursAgo(1450),
    workAuthSignedAt: hoursAgo(1400),
    estimateSentAt: hoursAgo(1200),
    customerAcceptedAt: hoursAgo(1100),
    contractCents: 2_240_000,
    scopeSummary: "Laundry room: drywall, paint, LVP flooring, reconnect washer.",
    lastProgressAt: hoursAgo(3 * 24),
  });
  // 6. Job walk scheduled for tomorrow.
  await job({
    homeownerName: "Alex Morgan (fictional)",
    homeownerPhone: "555-0206",
    address: "55 Sample Ln",
    stage: "INTAKE",
    referringPlumberId: plumberA.id,
    homeownerCalledAt: hoursAgo(10),
    jobWalkScheduledFor: new Date(Date.now() + 26 * 3_600_000),
    lastProgressAt: hoursAgo(10),
  });

  const doc = (
    jobId: string,
    kind: Prisma.JobDocumentUncheckedCreateInput["kind"],
    status: "MISSING" | "REQUESTED" | "RECEIVED" | "SIGNED",
    title: string,
  ) => prisma.jobDocument.create({ data: { companyId, jobId, kind, status, title } });
  await doc(j1.id, "DOCUSKETCH", "RECEIVED", "DocuSketch from mitigation");
  await doc(j1.id, "PHOTOS", "RECEIVED", "Mitigation photos");
  await doc(j1.id, "WORK_AUTHORIZATION", "MISSING", "Work authorization");
  await doc(j2.id, "ESTIMATE", "RECEIVED", "Reconstruction estimate");
  await doc(j2.id, "SIGNED_CONTRACT", "SIGNED", "Homeowner contract");
  await doc(j2.id, "SUB_BID", "RECEIVED", "Drywall bid");
  await doc(j3.id, "SUB_BID", "REQUESTED", "Tile bid");
  await doc(j3.id, "SUB_BID", "RECEIVED", "Plumbing bid");
  await doc(j4.id, "APPROVED_SCOPE", "RECEIVED", "Approved scope PDF");
  await doc(j4.id, "BUDGET", "MISSING", "Excel budget from the budgeter");

  const action = (
    jobId: string,
    data: Omit<Prisma.JobActionUncheckedCreateInput, "companyId" | "jobId">,
  ) => prisma.jobAction.create({ data: { companyId, jobId, ...data } });
  await action(j1.id, {
    channel: "CALL",
    title: "Call the homeowner to introduce Northwind Builders and set the job walk",
    status: "DRAFT",
    dueAt: hoursAgo(-4),
  });
  await action(j1.id, {
    channel: "TRELLO",
    title: "Intake card for the Whitfield lead",
    status: "DRAFT",
    body: "Drafted card. Not created in Trello (no integration connected).",
  });
  await action(j2.id, {
    channel: "EMAIL",
    title: "Follow up with the adjuster on the submission",
    status: "DRAFT",
    recipientName: "Pat Example",
    dueAt: hoursAgo(-20),
  });
  await action(j3.id, {
    channel: "TEXT",
    title: "Tile bid request",
    status: "SENT",
    recipientName: "Ben Torres Drywall (fictional)",
    sentAt: hoursAgo(3),
    awaitingReplySince: hoursAgo(3),
  });
  await action(j3.id, {
    channel: "TEXT",
    title: "Plumbing bid request",
    status: "COMPLETED",
    recipientName: "Pipeline Pros (fictional)",
    sentAt: hoursAgo(40),
    completedAt: hoursAgo(38),
  });
  await action(j5.id, {
    channel: "HOMEOWNER_UPDATE",
    title: "Drywall start moved to next week",
    status: "PENDING_APPROVAL",
    reviewReason: "DELAY_OR_PROBLEM",
    recipientName: "Riley Moore (fictional)",
    body: "Hi Riley, the drywall crew had to move your start to next Tuesday. We'll confirm the exact time Monday.",
  });
  await action(j5.id, {
    channel: "TEXT",
    title: "Confirm LVP delivery date",
    status: "SENT",
    recipientName: "Supplier (fictional)",
    sentAt: hoursAgo(1),
    awaitingReplySince: hoursAgo(1),
  });

  const line = (description: string, vendor: string, cost: number) =>
    prisma.estimateLine.create({
      data: { companyId, jobId: j3.id, description, vendor, costCents: cost * 100 },
    });
  await line("Plumbing: reset vanity and reconnect fixtures", "Pipeline Pros (fictional)", 850);
  await line("Tile tub surround", "Pending bid", 2400);
  await line("Paint bathroom", "Luis Ortega Drywall (fictional)", 600);
  await prisma.job.update({
    where: { id: j3.id },
    data: {
      customerScopeText:
        "Remove and replace the damaged tub surround with new tile, reset the vanity, reconnect plumbing fixtures, and repaint the bathroom.",
    },
  });

  const claim = (
    jobId: string,
    kind:
      | "SUBMITTED"
      | "RESPONSE"
      | "REVISION_REQUESTED"
      | "RESUBMITTED"
      | "SCOPE_APPROVED"
      | "AMOUNT_AGREED",
    h: number,
    note = "",
    amountCents?: number,
  ) =>
    prisma.adjusterEvent.create({
      data: {
        companyId,
        jobId,
        kind,
        note,
        amountCents: amountCents ?? null,
        occurredAt: hoursAgo(h),
      },
    });
  await claim(j2.id, "SUBMITTED", 6 * 24, "Estimate, signed contract and drywall bid sent");
  await claim(j4.id, "SUBMITTED", 20 * 24);
  await claim(j4.id, "REVISION_REQUESTED", 12 * 24, "Adjuster asked for a second carpet quote");
  await claim(j4.id, "RESUBMITTED", 8 * 24);
  await claim(j4.id, "SCOPE_APPROVED", 50);
  await claim(j4.id, "AMOUNT_AGREED", 26, "", 4_865_000);

  await prisma.decision.create({
    data: {
      companyId,
      jobId: j5.id,
      kind: "DELAY_OR_PROBLEM",
      priority: "HIGH",
      title: "Drywall crew pushed the start by one week",
      detail: "Approve the homeowner message and decide whether to try the other drywall sub.",
    },
  });
  await prisma.decision.create({
    data: {
      companyId,
      jobId: j4.id,
      kind: "BUDGET_SIGNOFF",
      title: "Run the approved scope through the budgeter",
      detail: "Scope approved and amount agreed; the budget gate is open.",
    },
  });
}

async function main() {
  console.log("Seeding fictional data…");
  // Order matters because of foreign keys.
  await prisma.estimateLine.deleteMany();
  await prisma.adjusterEvent.deleteMany();
  await prisma.jobAction.deleteMany();
  await prisma.jobDocument.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.job.deleteMany();
  await prisma.contact.deleteMany();
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
  const northwind = await prisma.company.findUniqueOrThrow({
    where: { slug: "northwind-builders" },
  });
  await seedRestoration(northwind.id, userIds.alex);
  console.log(`Seeded ${users.length} users and ${companies.length} companies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
