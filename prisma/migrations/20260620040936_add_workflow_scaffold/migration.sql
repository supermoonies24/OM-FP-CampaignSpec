-- CreateTable
CREATE TABLE "WorkflowCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL DEFAULT 'Ford Pro',
    "currentStage" TEXT NOT NULL DEFAULT 'INTAKE',
    "status" TEXT NOT NULL DEFAULT 'active',
    "briefDeckId" TEXT,
    "figmaUrl" TEXT,
    "specFormId" TEXT,
    "jiraEpicKey" TEXT,
    "sfmcJourneyId" TEXT,
    "teamsChannelUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deployedAt" DATETIME
);

-- CreateTable
CREATE TABLE "WorkflowIntake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "rawForm" TEXT NOT NULL,
    "clarifications" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowIntake_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowBriefDeck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "highLevelJourney" TEXT NOT NULL,
    "sfmcJourney" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "specFormDraft" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "pptxUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowBriefDeck_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowChannelAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "WorkflowChannelAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowStageTransition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowStageTransition_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowTimelineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "actualDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'onTrack',
    "riskScore" REAL,
    "riskReason" TEXT,
    CONSTRAINT "WorkflowTimelineItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "WorkflowApproval_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowNotification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkflowComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "authorEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowComment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowIntake_campaignId_key" ON "WorkflowIntake"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowBriefDeck_campaignId_key" ON "WorkflowBriefDeck"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowChannelAssignment_campaignId_channel_userId_role_key" ON "WorkflowChannelAssignment"("campaignId", "channel", "userId", "role");

-- CreateIndex
CREATE INDEX "WorkflowStageTransition_campaignId_createdAt_idx" ON "WorkflowStageTransition"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowTimelineItem_campaignId_stage_idx" ON "WorkflowTimelineItem"("campaignId", "stage");

-- CreateIndex
CREATE INDEX "WorkflowApproval_campaignId_stage_idx" ON "WorkflowApproval"("campaignId", "stage");

-- CreateIndex
CREATE INDEX "WorkflowNotification_campaignId_createdAt_idx" ON "WorkflowNotification"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowComment_campaignId_createdAt_idx" ON "WorkflowComment"("campaignId", "createdAt");
