-- AlterTable
-- publicToken gets a volatile SQL-level DEFAULT (not just a Prisma-level one) so that
-- INSERTs from instances still running pre-Sprint-2 code (which don't set this column
-- at all) keep working during the phased ASG rollout, instead of failing NOT NULL.
-- Being volatile, Postgres computes a fresh random value per row for the existing data
-- too, so no separate backfill UPDATE is needed.
ALTER TABLE "Emergency" ADD COLUMN     "publicToken" TEXT NOT NULL DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 24);
ALTER TABLE "Emergency" ADD COLUMN     "consentAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Emergency_publicToken_key" ON "Emergency"("publicToken");
