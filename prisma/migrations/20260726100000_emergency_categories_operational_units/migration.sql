-- AlterTable
ALTER TABLE "User" ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Emergency" ADD COLUMN     "categoryId" TEXT,
ALTER COLUMN "type" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EmergencyCategory" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalUnit" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyCategory_municipalityId_idx" ON "EmergencyCategory"("municipalityId");

-- CreateIndex
CREATE INDEX "OperationalUnit_municipalityId_idx" ON "OperationalUnit"("municipalityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OperationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EmergencyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCategory" ADD CONSTRAINT "EmergencyCategory_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalUnit" ADD CONSTRAINT "OperationalUnit_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
