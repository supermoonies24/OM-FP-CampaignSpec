-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WorkflowCampaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AiRun" ("campaignId", "createdAt", "durationMs", "feature", "id", "inputJson", "model", "outputJson", "status", "tokensIn", "tokensOut") SELECT "campaignId", "createdAt", "durationMs", "feature", "id", "inputJson", "model", "outputJson", "status", "tokensIn", "tokensOut" FROM "AiRun";
DROP TABLE "AiRun";
ALTER TABLE "new_AiRun" RENAME TO "AiRun";
CREATE INDEX "AiRun_campaignId_createdAt_idx" ON "AiRun"("campaignId", "createdAt");
CREATE INDEX "AiRun_feature_createdAt_idx" ON "AiRun"("feature", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
