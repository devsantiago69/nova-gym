CREATE TABLE "challenge_evidence_views" (
  "id" UUID NOT NULL,
  "challenge_id" UUID NOT NULL,
  "attendance_id" UUID NOT NULL,
  "viewer_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "decided_at" TIMESTAMP(3),
  CONSTRAINT "challenge_evidence_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenge_evidence_views_challenge_id_attendance_id_viewer_id_key" ON "challenge_evidence_views"("challenge_id", "attendance_id", "viewer_id");
CREATE INDEX "challenge_evidence_views_viewer_id_expires_at_idx" ON "challenge_evidence_views"("viewer_id", "expires_at");
ALTER TABLE "challenge_evidence_views" ADD CONSTRAINT "challenge_evidence_views_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_evidence_views" ADD CONSTRAINT "challenge_evidence_views_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_evidence_views" ADD CONSTRAINT "challenge_evidence_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
