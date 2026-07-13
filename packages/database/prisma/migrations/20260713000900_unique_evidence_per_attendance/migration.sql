DELETE FROM "challenge_evidence_views" AS duplicate
USING "challenge_evidence_views" AS original
WHERE duplicate."attendance_id" = original."attendance_id"
  AND duplicate."viewer_id" = original."viewer_id"
  AND (
    duplicate."opened_at" > original."opened_at"
    OR (duplicate."opened_at" = original."opened_at" AND duplicate."id" > original."id")
  );

DROP INDEX "challenge_evidence_views_challenge_id_attendance_id_viewer_id_key";
CREATE UNIQUE INDEX "challenge_evidence_views_attendance_id_viewer_id_key"
  ON "challenge_evidence_views"("attendance_id", "viewer_id");
