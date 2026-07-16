ALTER TYPE "ChallengeType" ADD VALUE IF NOT EXISTS 'ACCUMULATED_AMOUNT';
ALTER TYPE "ChallengeResult" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "ChallengeResult" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "ChallengeEvidenceType" ADD VALUE IF NOT EXISTS 'NUMERIC_VALUE';
ALTER TYPE "ChallengeEvidenceType" ADD VALUE IF NOT EXISTS 'PHOTO_AND_VALUE';

CREATE TABLE "challenge_results" (
    "id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position" INTEGER,
    "result" "ChallengeResult" NOT NULL,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "accumulated_value" DECIMAL(16,3) NOT NULL DEFAULT 0,
    "best_streak" INTEGER NOT NULL DEFAULT 0,
    "target_reached" BOOLEAN NOT NULL DEFAULT false,
    "bonus_points" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "algorithm_version" INTEGER NOT NULL DEFAULT 1,
    "rules" JSONB NOT NULL,

    CONSTRAINT "challenge_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenge_results_participant_id_key" ON "challenge_results"("participant_id");
CREATE UNIQUE INDEX "challenge_results_challenge_id_user_id_key" ON "challenge_results"("challenge_id", "user_id");
CREATE INDEX "challenge_results_challenge_id_result_idx" ON "challenge_results"("challenge_id", "result");
CREATE INDEX "challenge_results_user_id_calculated_at_idx" ON "challenge_results"("user_id", "calculated_at");

ALTER TABLE "challenge_results" ADD CONSTRAINT "challenge_results_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_results" ADD CONSTRAINT "challenge_results_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "challenge_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_results" ADD CONSTRAINT "challenge_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
