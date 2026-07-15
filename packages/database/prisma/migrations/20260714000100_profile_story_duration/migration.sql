ALTER TABLE "user_profiles"
ADD COLUMN "story_duration_seconds" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "user_profiles"
ADD CONSTRAINT "user_profiles_story_duration_seconds_check"
CHECK ("story_duration_seconds" IN (5, 10, 15, 20));
