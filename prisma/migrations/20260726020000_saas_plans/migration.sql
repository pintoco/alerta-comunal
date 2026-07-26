-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('GRATUITO', 'BASICO', 'PRO');

-- AlterTable
ALTER TABLE "Municipality" ADD COLUMN     "plan" "SubscriptionPlan" NOT NULL DEFAULT 'GRATUITO';
