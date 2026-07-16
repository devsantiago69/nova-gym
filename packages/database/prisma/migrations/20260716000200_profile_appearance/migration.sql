ALTER TABLE "user_profiles"
ADD COLUMN "font_family" VARCHAR(30) NOT NULL DEFAULT 'nova';

UPDATE "plans"
SET
  "name" = 'Nova Unlimited',
  "description" = 'Toda la experiencia Nova Gym sin límites de uso.',
  "storage_limit_mb" = 10000000,
  "active_challenge_limit" = 1000000,
  "friend_limit" = 1000000,
  "history_months" = NULL,
  "expenses_enabled" = TRUE,
  "whatsapp_enabled" = TRUE,
  "advanced_stats_enabled" = TRUE,
  "exports_enabled" = TRUE
WHERE "code" = 'PRO';
