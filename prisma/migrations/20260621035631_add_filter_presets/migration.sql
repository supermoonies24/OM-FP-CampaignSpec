-- CreateTable
CREATE TABLE "WorkflowFilterPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "query" TEXT,
    "hideClosed" BOOLEAN NOT NULL DEFAULT true,
    "view" TEXT NOT NULL DEFAULT 'board',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowFilterPreset_name_key" ON "WorkflowFilterPreset"("name");
