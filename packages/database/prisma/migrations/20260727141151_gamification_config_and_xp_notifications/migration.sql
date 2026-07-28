-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'XP_EARNED';
ALTER TYPE "NotificationType" ADD VALUE 'STREAK_LOST';
ALTER TYPE "NotificationType" ADD VALUE 'LEVEL_UP';

-- CreateTable
CREATE TABLE "gamification_config" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "value" INTEGER NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "description" VARCHAR(300),
    "category" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_config_key_key" ON "gamification_config"("key");
