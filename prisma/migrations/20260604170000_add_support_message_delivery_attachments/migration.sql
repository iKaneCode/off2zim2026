ALTER TABLE "support_messages"
ADD COLUMN "attachments" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN "deliveredAt" TIMESTAMP(3);

CREATE INDEX "support_messages_deliveredAt_idx"
ON "support_messages"("deliveredAt");
