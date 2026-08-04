-- Rename rest_days_allowed to rest_days_per_week (preserves existing values;
-- semantics change from a lifetime pool to a weekly recurring allowance).
ALTER TABLE "challenges" RENAME COLUMN "rest_days_allowed" TO "rest_days_per_week";
