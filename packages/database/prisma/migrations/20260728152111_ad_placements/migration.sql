-- CreateEnum
CREATE TYPE "AdPlacementFormat" AS ENUM ('DISPLAY', 'NATIVE_FEED', 'REWARDED');

-- CreateTable
CREATE TABLE "ad_placements" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "page" VARCHAR(40) NOT NULL,
    "format" "AdPlacementFormat" NOT NULL DEFAULT 'DISPLAY',
    "slot_id" VARCHAR(60),
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_placements_key_key" ON "ad_placements"("key");

-- CreateIndex
CREATE INDEX "ad_placements_page_enabled_idx" ON "ad_placements"("page", "enabled");
