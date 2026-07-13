UPDATE "plans"
SET "active_challenge_limit" = 2,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = 'FREE';
