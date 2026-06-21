-- AlterTable
ALTER TABLE "WorkflowNotification" ADD COLUMN "readAt" DATETIME;

-- CreateIndex
CREATE INDEX "WorkflowNotification_channel_readAt_idx" ON "WorkflowNotification"("channel", "readAt");
