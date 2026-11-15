-- CreateEnum
CREATE TYPE "Language" AS ENUM ('mr', 'hi', 'en');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PRELIMINARY_SATISFIED', 'NEEDS_VERIFICATION', 'INELIGIBLE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('AVAILABLE', 'NEEDS_VERIFICATION', 'MISSING', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "JourneyStage" AS ENUM ('ELIGIBILITY_GUIDANCE', 'DOCUMENT_PREPARATION', 'PORTAL_HANDOFF', 'SUBMITTED', 'OUTCOME_RECORDED');

-- CreateEnum
CREATE TYPE "JourneyEvidenceType" AS ENUM ('OFFICIAL_ACKNOWLEDGEMENT_SLIP', 'REGISTRATION_NUMBER', 'IN_PERSON_RECEIPT', 'PORTAL_SCREENSHOT', 'VERIFIED_OFFICIAL_INTEGRATION');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('REVIEWED', 'PROVISIONAL', 'UNVERIFIED');

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'mr',
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_profiles" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "district" TEXT NOT NULL DEFAULT 'Pune',
    "occupation" TEXT,
    "yearsOfConstructionWork" INTEGER,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "registrationNumber" TEXT,
    "hasAadhaar" BOOLEAN NOT NULL DEFAULT false,
    "hasBankPassbook" BOOLEAN NOT NULL DEFAULT false,
    "has90DaysCertificate" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'mr',
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_tasks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueCategory" TEXT,
    "actionKey" TEXT,
    "userNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_checkpoints" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "checkpointType" TEXT NOT NULL,
    "statePayload" JSONB NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'REVIEWED',
    "excerpt" TEXT NOT NULL,
    "reviewerNotes" TEXT NOT NULL,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_rules" (
    "id" TEXT NOT NULL,
    "benefitType" TEXT NOT NULL DEFAULT 'MAHABOCW_REGISTRATION',
    "ruleKey" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "applicableWhen" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v2024.1',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'REVIEWED',

    CONSTRAINT "benefit_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requirements" (
    "id" TEXT NOT NULL,
    "benefitType" TEXT NOT NULL DEFAULT 'MAHABOCW_REGISTRATION',
    "documentKey" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT 'v2024.1',
    "sourceId" TEXT NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'REVIEWED',
    "acceptedAlternatives" JSONB NOT NULL,
    "formDownloadUrl" TEXT,

    CONSTRAINT "document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_checklist_items" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'MISSING',
    "userNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_assessments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "benefitType" TEXT NOT NULL DEFAULT 'MAHABOCW_REGISTRATION',
    "answers" JSONB NOT NULL,
    "assessmentStatus" "AssessmentStatus" NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT 'v2024.1',
    "satisfiedChecks" JSONB NOT NULL,
    "unresolvedChecks" JSONB NOT NULL,
    "failedChecks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eligibility_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" "JourneyStage" NOT NULL,
    "evidenceType" "JourneyEvidenceType",
    "evidenceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_profiles_sessionId_key" ON "worker_profiles"("sessionId");

-- CreateIndex
CREATE INDEX "application_tasks_sessionId_status_idx" ON "application_tasks"("sessionId", "status");

-- CreateIndex
CREATE INDEX "agent_checkpoints_sessionId_checkpointType_idx" ON "agent_checkpoints"("sessionId", "checkpointType");

-- CreateIndex
CREATE INDEX "benefit_rules_benefitType_ruleKey_idx" ON "benefit_rules"("benefitType", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "document_requirements_documentKey_key" ON "document_requirements"("documentKey");

-- CreateIndex
CREATE INDEX "document_requirements_benefitType_documentKey_idx" ON "document_requirements"("benefitType", "documentKey");

-- CreateIndex
CREATE UNIQUE INDEX "document_checklist_items_sessionId_requirementId_key" ON "document_checklist_items"("sessionId", "requirementId");

-- CreateIndex
CREATE INDEX "eligibility_assessments_sessionId_benefitType_idx" ON "eligibility_assessments"("sessionId", "benefitType");

-- CreateIndex
CREATE INDEX "journey_events_sessionId_eventType_idx" ON "journey_events"("sessionId", "eventType");

-- CreateIndex
CREATE INDEX "conversation_messages_sessionId_createdAt_idx" ON "conversation_messages"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_tasks" ADD CONSTRAINT "application_tasks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_checkpoints" ADD CONSTRAINT "agent_checkpoints_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_rules" ADD CONSTRAINT "benefit_rules_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_checklist_items" ADD CONSTRAINT "document_checklist_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_checklist_items" ADD CONSTRAINT "document_checklist_items_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "document_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_assessments" ADD CONSTRAINT "eligibility_assessments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_events" ADD CONSTRAINT "journey_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

