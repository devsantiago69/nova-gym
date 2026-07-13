CREATE TYPE "ChallengeReviewVerdict" AS ENUM ('CONFIRMED','REJECTED');

CREATE TABLE "challenge_attendance_reviews" (
  "id" UUID PRIMARY KEY,
  "challenge_id" UUID NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
  "attendance_id" UUID NOT NULL REFERENCES "attendances"("id") ON DELETE CASCADE,
  "reviewer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "verdict" "ChallengeReviewVerdict" NOT NULL,
  "note" VARCHAR(300),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "challenge_attendance_reviews_challenge_attendance_reviewer_key" UNIQUE ("challenge_id","attendance_id","reviewer_id")
);

CREATE INDEX "challenge_attendance_reviews_challenge_attendance_idx" ON "challenge_attendance_reviews"("challenge_id","attendance_id");
CREATE INDEX "challenge_attendance_reviews_reviewer_created_idx" ON "challenge_attendance_reviews"("reviewer_id","created_at");
