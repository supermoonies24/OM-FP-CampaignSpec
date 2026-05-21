-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "folderId" TEXT,
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
    "orchestrationDesc" TEXT,
    CONSTRAINT "Campaign_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailSend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "emailNumber" INTEGER NOT NULL,
    "productLine" TEXT,
    "description" TEXT,
    "audience" TEXT,
    "segmentation" TEXT,
    "country" TEXT,
    "language" TEXT,
    "versionType" TEXT,
    "emailGroupNum" INTEGER DEFAULT 1,
    "figmaFileName" TEXT,
    "isTest" BOOLEAN DEFAULT false,
    "subjectLine" TEXT,
    "preheader" TEXT,
    CONSTRAINT "EmailSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "emailNumber" INTEGER NOT NULL,
    "ctaName" TEXT,
    "assetType" TEXT,
    "alias" TEXT,
    "baseUrl" TEXT,
    CONSTRAINT "CampaignLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeedListEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "listType" TEXT NOT NULL,
    "firstName" TEXT,
    "email" TEXT,
    CONSTRAINT "SeedListEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_key_key" ON "AppSettings"("key");
