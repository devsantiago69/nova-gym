CREATE TYPE "SocialPostType" AS ENUM ('WORKOUT', 'ACHIEVEMENT', 'CHALLENGE', 'STATUS');
CREATE TYPE "SocialAudience" AS ENUM ('PRIVATE', 'FRIENDS', 'CHALLENGE_TEAM');
CREATE TYPE "SocialReactionType" AS ENUM ('FIRE', 'STRONG', 'APPLAUSE', 'INSPIRE');

CREATE TABLE "social_posts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "attendance_id" UUID,
  "challenge_id" UUID,
  "type" "SocialPostType" NOT NULL DEFAULT 'WORKOUT',
  "audience" "SocialAudience" NOT NULL DEFAULT 'FRIENDS',
  "content" VARCHAR(800),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "social_posts_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE,
  CONSTRAINT "social_posts_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "social_posts_attendance_id_key" ON "social_posts"("attendance_id");
CREATE INDEX "social_posts_user_id_created_at_idx" ON "social_posts"("user_id", "created_at");
CREATE INDEX "social_posts_audience_created_at_idx" ON "social_posts"("audience", "created_at");
CREATE INDEX "social_posts_challenge_id_created_at_idx" ON "social_posts"("challenge_id", "created_at");

CREATE TABLE "social_reactions" (
  "id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "SocialReactionType" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE,
  CONSTRAINT "social_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "social_reactions_post_id_user_id_key" ON "social_reactions"("post_id", "user_id");
CREATE INDEX "social_reactions_post_id_type_idx" ON "social_reactions"("post_id", "type");

CREATE TABLE "social_comments" (
  "id" UUID NOT NULL,
  "post_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "content" VARCHAR(500) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "social_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE,
  CONSTRAINT "social_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "social_comments_post_id_created_at_idx" ON "social_comments"("post_id", "created_at");
CREATE INDEX "social_comments_user_id_created_at_idx" ON "social_comments"("user_id", "created_at");

INSERT INTO "social_posts" ("id", "user_id", "attendance_id", "type", "audience", "content", "created_at", "updated_at")
SELECT gen_random_uuid(), a."user_id", a."id", 'WORKOUT', 'FRIENDS', NULL, COALESCE(a."finished_at", a."created_at"), COALESCE(a."finished_at", a."updated_at")
FROM "attendances" a
WHERE a."status" = 'COMPLETED' AND a."invalidated_at" IS NULL
ON CONFLICT ("attendance_id") DO NOTHING;
