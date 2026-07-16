CREATE TYPE "ClubType" AS ENUM ('GYM', 'CITY', 'DISCIPLINE', 'COMMUNITY');
CREATE TYPE "ClubVisibility" AS ENUM ('PUBLIC', 'REQUEST', 'PRIVATE');
CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "ClubMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'LEFT');
ALTER TYPE "SocialAudience" ADD VALUE IF NOT EXISTS 'CLUB';

CREATE TABLE "clubs" (
  "id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "description" VARCHAR(600) NOT NULL,
  "type" "ClubType" NOT NULL,
  "visibility" "ClubVisibility" NOT NULL DEFAULT 'PUBLIC',
  "city" VARCHAR(120),
  "discipline" VARCHAR(120),
  "accent_color" VARCHAR(20) NOT NULL DEFAULT 'lime',
  "member_limit" INTEGER NOT NULL DEFAULT 500,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clubs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");
CREATE INDEX "clubs_type_visibility_created_at_idx" ON "clubs"("type", "visibility", "created_at");
CREATE INDEX "clubs_city_idx" ON "clubs"("city");
CREATE INDEX "clubs_discipline_idx" ON "clubs"("discipline");

CREATE TABLE "club_memberships" (
  "id" UUID NOT NULL,
  "club_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
  "status" "ClubMembershipStatus" NOT NULL DEFAULT 'PENDING',
  "joined_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "club_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE,
  CONSTRAINT "club_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "club_memberships_club_id_user_id_key" ON "club_memberships"("club_id", "user_id");
CREATE INDEX "club_memberships_user_id_status_idx" ON "club_memberships"("user_id", "status");
CREATE INDEX "club_memberships_club_id_status_role_idx" ON "club_memberships"("club_id", "status", "role");

ALTER TABLE "social_posts" ADD COLUMN "club_id" UUID;
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL;
CREATE INDEX "social_posts_club_id_created_at_idx" ON "social_posts"("club_id", "created_at");
