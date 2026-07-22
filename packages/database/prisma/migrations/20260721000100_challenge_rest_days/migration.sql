ALTER TABLE "challenges" ADD COLUMN "rest_days_allowed" INTEGER NOT NULL DEFAULT 2;

CREATE TABLE "challenge_rest_days" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "challenge_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "local_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "challenge_rest_days_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "challenge_rest_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "challenge_rest_days_challenge_id_user_id_local_date_key" UNIQUE ("challenge_id", "user_id", "local_date")
);

CREATE INDEX "challenge_rest_days_user_id_local_date_idx" ON "challenge_rest_days"("user_id", "local_date");
