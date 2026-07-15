ALTER TABLE "challenge_evidence_views"
ADD COLUMN "paused_at" TIMESTAMP(3),
ADD COLUMN "paused_remaining_ms" INTEGER;

ALTER TABLE "challenge_evidence_views"
ADD CONSTRAINT "challenge_evidence_views_paused_remaining_ms_check"
CHECK ("paused_remaining_ms" IS NULL OR ("paused_remaining_ms" > 0 AND "paused_remaining_ms" <= 20000));
