-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Folder";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "weekOf" TEXT,
    "brand" TEXT DEFAULT 'Ford Pro',
    "businessUnit" TEXT,
    "childProd" TEXT,
    "country" TEXT,
    "language" TEXT,
    "emailBuildType" TEXT,
    "figmaLink" TEXT,
    "figmaFileName" TEXT,
    "campaignName" TEXT,
    "productLine" TEXT,
    "audience" TEXT,
    "segmentation" TEXT,
    "campaignType" TEXT,
    "sendType" TEXT,
    "numSends" INTEGER DEFAULT 1,
    "sendFromName" TEXT,
    "sendFromAddress" TEXT DEFAULT 'reply@e.fordpro.com',
    "desiredSendDate" TEXT,
    "desiredSendTime" TEXT,
    "sto" BOOLEAN DEFAULT false,
    "miroUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sendThrottle" BOOLEAN DEFAULT false,
    "sendThrottleRate" TEXT,
    "abTest" BOOLEAN DEFAULT false,
    "abTestType" TEXT,
    "abAudienceSplit" TEXT,
    "contentBlock" BOOLEAN DEFAULT false,
    "contentBlockProductLine" TEXT,
    "contentBlockProductName" TEXT,
    "contentBlockName" TEXT,
    "contentBlockDesc" TEXT,
    "contentBlockFigmaLink" TEXT,
    "notes" TEXT,
    "segmentationDesc" TEXT,
    "audienceSource" TEXT,
    "seg1Field" TEXT,
    "seg1Condition" TEXT,
    "seg1Value" TEXT,
    "seg2Field" TEXT,
    "seg2Condition" TEXT,
    "seg2Value" TEXT,
    "seg3Field" TEXT,
    "seg3Condition" TEXT,
    "seg3Value" TEXT,
    "seg4Field" TEXT,
    "seg4Condition" TEXT,
    "seg4Value" TEXT,
    "engagementSplits" TEXT,
    "orchestrationDesc" TEXT
);
INSERT INTO "new_Campaign" ("abAudienceSplit", "abTest", "abTestType", "audience", "audienceSource", "brand", "businessUnit", "campaignName", "campaignType", "childProd", "contentBlock", "contentBlockDesc", "contentBlockFigmaLink", "contentBlockName", "contentBlockProductLine", "contentBlockProductName", "country", "createdAt", "desiredSendDate", "desiredSendTime", "emailBuildType", "engagementSplits", "figmaFileName", "figmaLink", "id", "language", "miroUrl", "notes", "numSends", "orchestrationDesc", "productLine", "seg1Condition", "seg1Field", "seg1Value", "seg2Condition", "seg2Field", "seg2Value", "seg3Condition", "seg3Field", "seg3Value", "seg4Condition", "seg4Field", "seg4Value", "segmentation", "segmentationDesc", "sendFromAddress", "sendFromName", "sendThrottle", "sendThrottleRate", "sendType", "status", "sto", "updatedAt", "weekOf") SELECT "abAudienceSplit", "abTest", "abTestType", "audience", "audienceSource", "brand", "businessUnit", "campaignName", "campaignType", "childProd", "contentBlock", "contentBlockDesc", "contentBlockFigmaLink", "contentBlockName", "contentBlockProductLine", "contentBlockProductName", "country", "createdAt", "desiredSendDate", "desiredSendTime", "emailBuildType", "engagementSplits", "figmaFileName", "figmaLink", "id", "language", "miroUrl", "notes", "numSends", "orchestrationDesc", "productLine", "seg1Condition", "seg1Field", "seg1Value", "seg2Condition", "seg2Field", "seg2Value", "seg3Condition", "seg3Field", "seg3Value", "seg4Condition", "seg4Field", "seg4Value", "segmentation", "segmentationDesc", "sendFromAddress", "sendFromName", "sendThrottle", "sendThrottleRate", "sendType", "status", "sto", "updatedAt", "weekOf" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

