CREATE TYPE "AttendanceStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'INVALIDATED', 'CANCELED');
CREATE TYPE "AttendancePhotoType" AS ENUM ('START', 'END');
CREATE TYPE "PointMovementType" AS ENUM ('ATTENDANCE_EARNED', 'ATTENDANCE_REVOKED', 'ADMIN_ADJUSTMENT', 'CHALLENGE_BONUS', 'CHALLENGE_BONUS_REVOKED');

CREATE TABLE "attendances" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "local_date" DATE NOT NULL,
  "timezone" VARCHAR(80) NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duration_minutes" INTEGER,
  "notes" VARCHAR(500),
  "invalidated_at" TIMESTAMP(3),
  "invalidated_by_id" UUID,
  "invalidation_reason" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendances_valid_period" CHECK ("finished_at" IS NULL OR "finished_at" >= "started_at"),
  CONSTRAINT "attendances_valid_duration" CHECK ("duration_minutes" IS NULL OR "duration_minutes" >= 0),
  CONSTRAINT "attendances_user_id_local_date_key" UNIQUE ("user_id", "local_date")
);
CREATE INDEX "attendances_user_id_status_idx" ON "attendances"("user_id", "status");
CREATE INDEX "attendances_local_date_idx" ON "attendances"("local_date");

CREATE TABLE "attendance_photos" (
  "id" UUID PRIMARY KEY,
  "attendance_id" UUID NOT NULL REFERENCES "attendances"("id") ON DELETE CASCADE,
  "owner_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" "AttendancePhotoType" NOT NULL,
  "object_key" VARCHAR(500) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_photos_positive_size" CHECK ("size_bytes" > 0),
  CONSTRAINT "attendance_photos_attendance_id_type_key" UNIQUE ("attendance_id", "type")
);
CREATE INDEX "attendance_photos_owner_id_created_at_idx" ON "attendance_photos"("owner_id", "created_at");

CREATE TABLE "point_ledger" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "attendance_id" UUID REFERENCES "attendances"("id") ON DELETE SET NULL,
  "amount" INTEGER NOT NULL,
  "type" "PointMovementType" NOT NULL,
  "source_type" VARCHAR(80) NOT NULL,
  "source_id" UUID,
  "description" VARCHAR(500),
  "logical_date" DATE,
  "actor_id" UUID REFERENCES "users"("id"),
  "idempotency_key" VARCHAR(160) NOT NULL UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "point_ledger_user_id_created_at_idx" ON "point_ledger"("user_id", "created_at");
CREATE INDEX "point_ledger_user_id_logical_date_idx" ON "point_ledger"("user_id", "logical_date");
CREATE UNIQUE INDEX "point_ledger_one_attendance_point_per_day" ON "point_ledger"("user_id", "logical_date") WHERE "type" = 'ATTENDANCE_EARNED';
