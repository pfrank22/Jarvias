-- CreateEnum
CREATE TYPE "JobTrack" AS ENUM ('UNDECIDED', 'RETAIL', 'INSURANCE');

-- CreateEnum
CREATE TYPE "JobStage" AS ENUM ('INTAKE', 'RETAIL_BIDDING', 'RETAIL_ESTIMATE_SENT', 'RETAIL_ACCEPTED', 'INS_PREPARING_SUBMISSION', 'INS_SUBMITTED', 'INS_IN_REVISION', 'INS_AGREED', 'BUDGETING', 'SCHEDULING', 'IN_PROGRESS', 'COMPLETE', 'LOST');

-- CreateEnum
CREATE TYPE "Trade" AS ENUM ('PLUMBING', 'DRYWALL', 'PAINTING', 'ELECTRICAL', 'HVAC', 'FLOORING', 'TILE', 'CARPENTRY', 'CABINETS', 'ROOFING', 'INSULATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('SUBCONTRACTOR', 'SUPPLIER', 'ADJUSTER', 'MITIGATION_PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('WORK_AUTHORIZATION', 'SIGNED_CONTRACT', 'ESTIMATE', 'SUB_BID', 'APPROVED_SCOPE', 'DOCUSKETCH', 'PHOTOS', 'BUDGET', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('MISSING', 'REQUESTED', 'RECEIVED', 'SIGNED');

-- CreateEnum
CREATE TYPE "ActionChannel" AS ENUM ('EMAIL', 'TEXT', 'CALL', 'TRELLO', 'BUILDERTREND', 'HOMEOWNER_UPDATE', 'TASK');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'SENT', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewReason" AS ENUM ('PRICE_CHANGE', 'SCHEDULE_COMMITMENT', 'DELAY_OR_PROBLEM');

-- CreateEnum
CREATE TYPE "DecisionKind" AS ENUM ('SELECT_BID', 'REVIEW_SUBMISSION', 'FOLLOW_UP_ESCALATION', 'DELAY_OR_PROBLEM', 'BUDGET_SIGNOFF', 'OTHER');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ContactKind" NOT NULL,
    "trades" "Trade"[],
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" TEXT,
    "track" "JobTrack" NOT NULL DEFAULT 'UNDECIDED',
    "stage" "JobStage" NOT NULL DEFAULT 'INTAKE',
    "homeownerName" TEXT NOT NULL,
    "homeownerPhone" TEXT,
    "homeownerEmail" TEXT,
    "address" TEXT NOT NULL,
    "scopeSummary" TEXT NOT NULL DEFAULT '',
    "claimNumber" TEXT,
    "carrier" TEXT,
    "adjusterName" TEXT,
    "adjusterEmail" TEXT,
    "adjusterPhone" TEXT,
    "homeownerCalledAt" TIMESTAMP(3),
    "jobWalkScheduledFor" TIMESTAMP(3),
    "jobWalkCompletedAt" TIMESTAMP(3),
    "workAuthSentAt" TIMESTAMP(3),
    "workAuthSignedAt" TIMESTAMP(3),
    "estimateSentAt" TIMESTAMP(3),
    "customerAcceptedAt" TIMESTAMP(3),
    "scopeApprovedAt" TIMESTAMP(3),
    "amountAgreedAt" TIMESTAMP(3),
    "contractCents" INTEGER,
    "lastProgressAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "managerId" TEXT,
    "referringPlumberId" TEXT,
    "mitigationContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'MISSING',
    "title" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "channel" "ActionChannel" NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "recipientName" TEXT,
    "reviewReason" "ReviewReason",
    "dueAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "awaitingReplySince" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT,
    "kind" "DecisionKind" NOT NULL,
    "status" "DecisionStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_companyId_kind_idx" ON "Contact"("companyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_id_companyId_key" ON "Contact"("id", "companyId");

-- CreateIndex
CREATE INDEX "Job_companyId_stage_idx" ON "Job"("companyId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Job_id_companyId_key" ON "Job"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_companyId_number_key" ON "Job"("companyId", "number");

-- CreateIndex
CREATE INDEX "JobDocument_companyId_jobId_idx" ON "JobDocument"("companyId", "jobId");

-- CreateIndex
CREATE INDEX "JobAction_companyId_status_idx" ON "JobAction"("companyId", "status");

-- CreateIndex
CREATE INDEX "JobAction_companyId_jobId_idx" ON "JobAction"("companyId", "jobId");

-- CreateIndex
CREATE INDEX "Decision_companyId_status_idx" ON "Decision"("companyId", "status");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_referringPlumberId_fkey" FOREIGN KEY ("referringPlumberId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_mitigationContactId_fkey" FOREIGN KEY ("mitigationContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDocument" ADD CONSTRAINT "JobDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDocument" ADD CONSTRAINT "JobDocument_jobId_companyId_fkey" FOREIGN KEY ("jobId", "companyId") REFERENCES "Job"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAction" ADD CONSTRAINT "JobAction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAction" ADD CONSTRAINT "JobAction_jobId_companyId_fkey" FOREIGN KEY ("jobId", "companyId") REFERENCES "Job"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
