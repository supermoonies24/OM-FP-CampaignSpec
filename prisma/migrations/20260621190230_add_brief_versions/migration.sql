-- CreateTable
CREATE TABLE "WorkflowBriefVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "highLevelJourney" TEXT NOT NULL,
    "sfmcJourney" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "specFormDraft" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "instructions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowBriefVersion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorkflowBriefVersion_campaignId_version_idx" ON "WorkflowBriefVersion"("campaignId", "version");
