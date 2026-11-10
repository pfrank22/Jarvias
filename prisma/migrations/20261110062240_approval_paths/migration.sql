-- CreateEnum
CREATE TYPE "AdjusterEventKind" AS ENUM ('SUBMITTED', 'RESPONSE', 'REVISION_REQUESTED', 'RESUBMITTED', 'SCOPE_APPROVED', 'AMOUNT_AGREED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "customerScopeText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "marginBps" INTEGER NOT NULL DEFAULT 5000;

-- CreateTable
CREATE TABLE "EstimateLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vendor" TEXT,
    "costCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdjusterEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "AdjusterEventKind" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER,
    "actorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdjusterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstimateLine_companyId_jobId_idx" ON "EstimateLine"("companyId", "jobId");

-- CreateIndex
CREATE INDEX "AdjusterEvent_companyId_jobId_idx" ON "AdjusterEvent"("companyId", "jobId");

-- AddForeignKey
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_jobId_companyId_fkey" FOREIGN KEY ("jobId", "companyId") REFERENCES "Job"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjusterEvent" ADD CONSTRAINT "AdjusterEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdjusterEvent" ADD CONSTRAINT "AdjusterEvent_jobId_companyId_fkey" FOREIGN KEY ("jobId", "companyId") REFERENCES "Job"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;
