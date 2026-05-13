-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('ASSIGNMENT', 'NEW_REPORT');

-- CreateTable
CREATE TABLE "EmergencyCoAssignee" (
    "emergencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyCoAssignee_pkey" PRIMARY KEY ("emergencyId","userId")
);

-- CreateTable
CREATE TABLE "MunicipalityEmailTemplate" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalityEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmergencyCoAssignee_userId_idx" ON "EmergencyCoAssignee"("userId");

-- CreateIndex
CREATE INDEX "MunicipalityEmailTemplate_municipalityId_idx" ON "MunicipalityEmailTemplate"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalityEmailTemplate_municipalityId_type_key" ON "MunicipalityEmailTemplate"("municipalityId", "type");

-- AddForeignKey
ALTER TABLE "EmergencyCoAssignee" ADD CONSTRAINT "EmergencyCoAssignee_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyCoAssignee" ADD CONSTRAINT "EmergencyCoAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityEmailTemplate" ADD CONSTRAINT "MunicipalityEmailTemplate_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
