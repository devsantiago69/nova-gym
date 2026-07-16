CREATE TYPE "ChallengeCompletionStatus" AS ENUM ('DRAFT','IN_PROGRESS','SUBMITTED','VALID','INVALID','CANCELED');
CREATE TYPE "ChallengeValidationMethod" AS ENUM ('AUTOMATIC','ADMIN_REVIEW','SELF_REPORTED');
CREATE TYPE "ChallengeCompletionEvidenceType" AS ENUM ('START_PHOTO','END_PHOTO','SINGLE_PHOTO','ATTACHMENT');
CREATE TYPE "EvidenceProcessingStatus" AS ENUM ('PENDING','READY','FAILED');

CREATE TABLE "challenge_completions" (
  "id" UUID PRIMARY KEY,
  "challenge_id" UUID NOT NULL,
  "participant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "logical_date" DATE NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "ChallengeCompletionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "numeric_value" DECIMAL(14,3),
  "unit" VARCHAR(50),
  "text_value" VARCHAR(2000),
  "checklist" JSONB,
  "calculated_points" INTEGER NOT NULL DEFAULT 0,
  "timezone" VARCHAR(80) NOT NULL,
  "evidence_method" "ChallengeEvidenceType" NOT NULL,
  "validation_method" "ChallengeValidationMethod" NOT NULL DEFAULT 'AUTOMATIC',
  "submitted_at" TIMESTAMP(3),
  "validated_at" TIMESTAMP(3),
  "invalidated_at" TIMESTAMP(3),
  "invalidation_reason" VARCHAR(500),
  "idempotency_key" VARCHAR(180) NOT NULL UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "challenge_completions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_completions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "challenge_participants"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_completions_points_check" CHECK ("calculated_points" >= 0)
);

CREATE TABLE "challenge_completion_evidence" (
  "id" UUID PRIMARY KEY,
  "completion_id" UUID NOT NULL,
  "type" "ChallengeCompletionEvidenceType" NOT NULL,
  "object_key" VARCHAR(500) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checksum" CHAR(64) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "processing_status" "EvidenceProcessingStatus" NOT NULL DEFAULT 'READY',
  CONSTRAINT "challenge_completion_evidence_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "challenge_completions"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_completion_evidence_completion_id_type_position_key" UNIQUE ("completion_id","type","position"),
  CONSTRAINT "challenge_completion_evidence_size_check" CHECK ("size_bytes" > 0 AND "position" >= 0)
);

CREATE TABLE "challenge_checklist_items" (
  "id" UUID PRIMARY KEY,
  "challenge_id" UUID NOT NULL,
  "label" VARCHAR(200) NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "points" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "challenge_checklist_items_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_checklist_items_points_check" CHECK ("points" >= 0)
);

CREATE TABLE "challenge_completion_checklist_items" (
  "id" UUID PRIMARY KEY,
  "completion_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "checked" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "challenge_completion_checklist_items_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "challenge_completions"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_completion_checklist_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "challenge_checklist_items"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_completion_checklist_items_completion_id_item_id_key" UNIQUE ("completion_id","item_id")
);

ALTER TABLE "challenge_score_events" ALTER COLUMN "attendance_id" DROP NOT NULL;
ALTER TABLE "challenge_score_events" ADD COLUMN "completion_id" UUID;
ALTER TABLE "challenge_score_events" ADD CONSTRAINT "challenge_score_events_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "challenge_completions"("id") ON DELETE CASCADE;
ALTER TABLE "challenge_score_events" ADD CONSTRAINT "challenge_score_events_single_source_check" CHECK (
  ("attendance_id" IS NOT NULL AND "completion_id" IS NULL) OR ("attendance_id" IS NULL AND "completion_id" IS NOT NULL)
);
CREATE UNIQUE INDEX "challenge_score_events_challenge_id_user_id_completion_id_key" ON "challenge_score_events"("challenge_id","user_id","completion_id");
CREATE INDEX "challenge_completions_challenge_id_user_id_logical_date_idx" ON "challenge_completions"("challenge_id","user_id","logical_date");
CREATE INDEX "challenge_completions_participant_id_status_logical_date_idx" ON "challenge_completions"("participant_id","status","logical_date");
CREATE INDEX "challenge_checklist_items_challenge_id_sort_order_idx" ON "challenge_checklist_items"("challenge_id","sort_order");
