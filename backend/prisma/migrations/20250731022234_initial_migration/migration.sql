-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EMDRPhase" AS ENUM ('PREPARATION', 'ASSESSMENT', 'DESENSITIZATION', 'INSTALLATION', 'BODY_SCAN', 'CLOSURE', 'REEVALUATION', 'RESOURCE_INSTALLATION');

-- CreateEnum
CREATE TYPE "SessionState" AS ENUM ('PREPARING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'EMERGENCY_STOPPED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('THERAPIST', 'SESSION_ORCHESTRATOR', 'SAFETY_MONITOR', 'PROGRESS_ANALYST', 'CRISIS_INTERVENTION', 'RESOURCE_PREPARATION', 'TRAUMA_ASSESSMENT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('GUIDANCE', 'QUESTION', 'ASSESSMENT', 'INTERVENTION', 'EDUCATION', 'SAFETY_CHECK', 'EMERGENCY_ALERT', 'PROTOCOL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'DELIVERED', 'ACKNOWLEDGED', 'RESPONDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SafetyCheckType" AS ENUM ('AUTOMATIC', 'MANUAL', 'TRIGGERED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "SafetyAction" AS ENUM ('CONTINUE', 'PAUSE', 'GROUNDING', 'EMERGENCY_STOP', 'PROFESSIONAL_REFERRAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "contraindications" TEXT[],
    "emergencyContacts" JSONB,
    "professionalSupport" JSONB,
    "crisisProtocols" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "negativeCognition" TEXT NOT NULL,
    "positiveCognition" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "bodyLocation" TEXT,
    "initialSUD" INTEGER NOT NULL,
    "initialVOC" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emdr_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetMemoryId" TEXT NOT NULL,
    "phase" "EMDRPhase" NOT NULL,
    "state" "SessionState" NOT NULL DEFAULT 'PREPARING',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "totalDuration" INTEGER,
    "initialSUD" INTEGER NOT NULL,
    "currentSUD" INTEGER,
    "finalSUD" INTEGER,
    "initialVOC" INTEGER NOT NULL,
    "currentVOC" INTEGER,
    "finalVOC" INTEGER,
    "preparationNotes" TEXT,
    "currentSetNumber" INTEGER NOT NULL DEFAULT 0,
    "phaseData" JSONB,
    "sessionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emdr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emdr_sets" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "stimulationSettings" JSONB NOT NULL,
    "userFeedback" JSONB,
    "agentObservations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emdr_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "content" JSONB NOT NULL,
    "userResponse" JSONB,
    "responseRequired" BOOLEAN NOT NULL DEFAULT false,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_checks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "checkType" "SafetyCheckType" NOT NULL,
    "trigger" TEXT,
    "measurements" JSONB NOT NULL,
    "action" "SafetyAction" NOT NULL,
    "intervention" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "period" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "insights" JSONB NOT NULL,
    "recommendations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "safety_profiles_userId_key" ON "safety_profiles"("userId");

-- AddForeignKey
ALTER TABLE "safety_profiles" ADD CONSTRAINT "safety_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_memories" ADD CONSTRAINT "target_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emdr_sessions" ADD CONSTRAINT "emdr_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emdr_sessions" ADD CONSTRAINT "emdr_sessions_targetMemoryId_fkey" FOREIGN KEY ("targetMemoryId") REFERENCES "target_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emdr_sets" ADD CONSTRAINT "emdr_sets_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "emdr_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "emdr_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_checks" ADD CONSTRAINT "safety_checks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "emdr_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_reports" ADD CONSTRAINT "progress_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
