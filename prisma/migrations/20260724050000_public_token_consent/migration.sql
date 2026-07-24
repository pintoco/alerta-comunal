-- AlterTable: nullable first so existing rows don't violate NOT NULL on add
ALTER TABLE "Emergency" ADD COLUMN     "publicToken" TEXT;
ALTER TABLE "Emergency" ADD COLUMN     "consentAcceptedAt" TIMESTAMP(3);

-- Backfill: assign a random token to every existing row before enforcing NOT NULL/UNIQUE
UPDATE "Emergency"
SET "publicToken" = substr(md5(random()::text || clock_timestamp()::text || id), 1, 24)
WHERE "publicToken" IS NULL;

-- Enforce NOT NULL + UNIQUE now that every row has a value
ALTER TABLE "Emergency" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX "Emergency_publicToken_key" ON "Emergency"("publicToken");
