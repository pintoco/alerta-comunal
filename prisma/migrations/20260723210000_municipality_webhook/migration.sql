-- CreateTable
CREATE TABLE "MunicipalityWebhook" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "onEmergencyCreated" BOOLEAN NOT NULL DEFAULT true,
    "onNewCitizenReport" BOOLEAN NOT NULL DEFAULT true,
    "onAssignment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalityWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalityWebhook_municipalityId_key" ON "MunicipalityWebhook"("municipalityId");

-- AddForeignKey
ALTER TABLE "MunicipalityWebhook" ADD CONSTRAINT "MunicipalityWebhook_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
