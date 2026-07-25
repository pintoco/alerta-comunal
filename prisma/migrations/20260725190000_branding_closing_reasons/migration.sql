-- AlterTable
ALTER TABLE "Municipality" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT;

-- AlterTable
ALTER TABLE "Emergency" ADD COLUMN     "closingReasonId" TEXT;

-- CreateTable
CREATE TABLE "ClosingReason" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosingReason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClosingReason_municipalityId_idx" ON "ClosingReason"("municipalityId");

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_closingReasonId_fkey" FOREIGN KEY ("closingReasonId") REFERENCES "ClosingReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingReason" ADD CONSTRAINT "ClosingReason_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
