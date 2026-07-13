CREATE TYPE "NotificationType" AS ENUM (
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'CHALLENGE_INVITE',
  'CHALLENGE_STARTED',
  'CHALLENGE_PROGRESS',
  'CHALLENGE_COMPLETED',
  'ATTENDANCE_COMPLETED',
  'EVIDENCE_REVIEWED',
  'SYSTEM'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "actor_id" UUID,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "href" VARCHAR(500),
  "data" JSONB,
  "read_at" TIMESTAMP(3),
  "dedupe_key" VARCHAR(200),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
