ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CLUB_SESSION';

CREATE TYPE "ClubSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED');
CREATE TYPE "ClubSessionParticipantStatus" AS ENUM ('GOING', 'WAITLIST', 'CANCELED');

CREATE TABLE "club_sessions" (
  "id" UUID NOT NULL,
  "club_id" UUID NOT NULL,
  "creator_id" UUID NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "description" VARCHAR(600),
  "starts_at" TIMESTAMP(3) NOT NULL,
  "duration_minutes" INTEGER NOT NULL DEFAULT 60,
  "place_name" VARCHAR(160) NOT NULL,
  "address" VARCHAR(240),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "capacity" INTEGER NOT NULL DEFAULT 10,
  "status" "ClubSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "club_sessions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE,
  CONSTRAINT "club_sessions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "club_sessions_capacity_check" CHECK ("capacity" BETWEEN 2 AND 100),
  CONSTRAINT "club_sessions_duration_check" CHECK ("duration_minutes" BETWEEN 15 AND 480)
);
CREATE INDEX "club_sessions_club_id_status_starts_at_idx" ON "club_sessions"("club_id", "status", "starts_at");
CREATE INDEX "club_sessions_creator_id_starts_at_idx" ON "club_sessions"("creator_id", "starts_at");

CREATE TABLE "club_session_participants" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "ClubSessionParticipantStatus" NOT NULL DEFAULT 'GOING',
  "joined_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_session_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "club_session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "club_sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "club_session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "club_session_participants_session_id_user_id_key" ON "club_session_participants"("session_id", "user_id");
CREATE INDEX "club_session_participants_user_id_status_idx" ON "club_session_participants"("user_id", "status");
CREATE INDEX "club_session_participants_session_id_status_idx" ON "club_session_participants"("session_id", "status");
