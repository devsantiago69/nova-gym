CREATE TYPE "ChallengeTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "ChallengeTemplateDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "ChallengeModality" AS ENUM ('SOLO', 'HEAD_TO_HEAD', 'GROUP');
CREATE TYPE "ChallengeEvidenceType" AS ENUM ('NONE', 'CHECK_IN', 'ONE_PHOTO', 'TWO_PHOTOS', 'TEXT', 'CHECKLIST');
CREATE TYPE "ChallengeTemplateFieldPolicy" AS ENUM ('LOCKED', 'EDITABLE', 'EDITABLE_WITH_LIMITS');

CREATE TABLE "challenge_templates" (
  "id" UUID PRIMARY KEY,
  "category_id" UUID NOT NULL,
  "minimum_plan_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "short_description" VARCHAR(500) NOT NULL,
  "cover_image_key" VARCHAR(500),
  "icon" VARCHAR(50) NOT NULL DEFAULT 'flame',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "difficulty" "ChallengeTemplateDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "status" "ChallengeTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "official" BOOLEAN NOT NULL DEFAULT true,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "challenge_templates_slug_key" UNIQUE ("slug"),
  CONSTRAINT "challenge_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "challenge_categories"("id") ON DELETE RESTRICT,
  CONSTRAINT "challenge_templates_minimum_plan_id_fkey" FOREIGN KEY ("minimum_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL,
  CONSTRAINT "challenge_templates_usage_count_check" CHECK ("usage_count" >= 0)
);

CREATE TABLE "challenge_template_versions" (
  "id" UUID PRIMARY KEY,
  "template_id" UUID NOT NULL,
  "created_by_id" UUID,
  "version" INTEGER NOT NULL,
  "full_description" TEXT NOT NULL,
  "challenge_type" "ChallengeType" NOT NULL,
  "allowed_modalities" "ChallengeModality"[] NOT NULL,
  "default_duration_days" INTEGER NOT NULL,
  "minimum_duration_days" INTEGER NOT NULL,
  "maximum_duration_days" INTEGER NOT NULL,
  "valid_weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7],
  "default_target_value" INTEGER NOT NULL,
  "target_unit" VARCHAR(50) NOT NULL,
  "evidence_type" "ChallengeEvidenceType" NOT NULL,
  "required_photo_count" INTEGER NOT NULL DEFAULT 0,
  "points_per_completion" INTEGER NOT NULL DEFAULT 1,
  "completion_bonus" INTEGER NOT NULL DEFAULT 0,
  "winner_bonus" INTEGER NOT NULL DEFAULT 0,
  "max_daily_completions" INTEGER NOT NULL DEFAULT 1,
  "scoring_rules" JSONB NOT NULL,
  "winning_rule" JSONB NOT NULL,
  "tie_rule" JSONB NOT NULL,
  "instructions" TEXT NOT NULL,
  "recommendations" TEXT,
  "terms" TEXT NOT NULL,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "challenge_template_versions_template_id_version_key" UNIQUE ("template_id", "version"),
  CONSTRAINT "challenge_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "challenge_templates"("id") ON DELETE RESTRICT,
  CONSTRAINT "challenge_template_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "challenge_template_versions_rules_check" CHECK (
    "version" > 0 AND "default_duration_days" > 0 AND "minimum_duration_days" > 0
    AND "maximum_duration_days" >= "minimum_duration_days"
    AND "default_duration_days" BETWEEN "minimum_duration_days" AND "maximum_duration_days"
    AND "default_target_value" > 0 AND "required_photo_count" >= 0
    AND "points_per_completion" >= 0 AND "completion_bonus" >= 0
    AND "winner_bonus" >= 0 AND "max_daily_completions" > 0
  )
);

CREATE TABLE "challenge_template_fields" (
  "id" UUID PRIMARY KEY,
  "template_version_id" UUID NOT NULL,
  "field_key" VARCHAR(80) NOT NULL,
  "policy" "ChallengeTemplateFieldPolicy" NOT NULL,
  "minimum_value" DECIMAL(12,2),
  "maximum_value" DECIMAL(12,2),
  "allowed_values" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "challenge_template_fields_template_version_id_field_key_key" UNIQUE ("template_version_id", "field_key"),
  CONSTRAINT "challenge_template_fields_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "challenge_template_versions"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_template_fields_limits_check" CHECK ("minimum_value" IS NULL OR "maximum_value" IS NULL OR "minimum_value" <= "maximum_value")
);

ALTER TABLE "challenges"
  ADD COLUMN "template_id" UUID,
  ADD COLUMN "template_version_id" UUID,
  ADD COLUMN "name" VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN "description" VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN "modality" "ChallengeModality" NOT NULL DEFAULT 'HEAD_TO_HEAD',
  ADD COLUMN "duration_days" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "timezone" VARCHAR(80) NOT NULL DEFAULT 'America/Bogota',
  ADD COLUMN "target_value" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "target_unit" VARCHAR(50) NOT NULL DEFAULT 'attendances',
  ADD COLUMN "evidence_type" "ChallengeEvidenceType" NOT NULL DEFAULT 'TWO_PHOTOS',
  ADD COLUMN "points_per_completion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "max_daily_completions" INTEGER NOT NULL DEFAULT 1;

INSERT INTO "challenge_templates" (
  "id", "category_id", "name", "slug", "short_description", "icon", "tags", "difficulty",
  "status", "sort_order", "featured", "official", "usage_count", "created_at", "updated_at"
)
SELECT gen_random_uuid(), c."id", c."name", c."slug", c."description", c."icon",
  ARRAY['fitness', 'asistencia']::TEXT[],
  CASE WHEN c."duration_days" >= 30 THEN 'INTERMEDIATE'::"ChallengeTemplateDifficulty" ELSE 'BEGINNER'::"ChallengeTemplateDifficulty" END,
  CASE WHEN c."status" = 'ACTIVE' THEN 'ACTIVE'::"ChallengeTemplateStatus" ELSE 'INACTIVE'::"ChallengeTemplateStatus" END,
  ROW_NUMBER() OVER (ORDER BY c."duration_days", c."created_at")::INTEGER,
  c."duration_days" = 30, true,
  (SELECT COUNT(*) FROM "challenges" ch WHERE ch."category_id" = c."id"),
  c."created_at", CURRENT_TIMESTAMP
FROM "challenge_categories" c;

INSERT INTO "challenge_template_versions" (
  "id", "template_id", "version", "full_description", "challenge_type", "allowed_modalities",
  "default_duration_days", "minimum_duration_days", "maximum_duration_days", "valid_weekdays",
  "default_target_value", "target_unit", "evidence_type", "required_photo_count",
  "points_per_completion", "completion_bonus", "winner_bonus", "max_daily_completions",
  "scoring_rules", "winning_rule", "tie_rule", "instructions", "recommendations", "terms",
  "published_at", "created_at"
)
SELECT gen_random_uuid(), t."id", 1, c."description", c."type",
  ARRAY['SOLO','HEAD_TO_HEAD','GROUP']::"ChallengeModality"[],
  c."duration_days", c."duration_days", c."duration_days", ARRAY[1,2,3,4,5,6,7],
  c."target_attendances", 'attendances', 'TWO_PHOTOS', 2,
  c."points_per_attendance", c."completion_bonus", c."winner_bonus", 1,
  jsonb_build_object('pointsPerCompletion', c."points_per_attendance", 'completionBonus', c."completion_bonus", 'winnerBonus', c."winner_bonus"),
  jsonb_build_object('type', c."type", 'target', c."target_attendances"),
  jsonb_build_object('allowed', true),
  'Registra una fotografía al iniciar y otra al finalizar tu entrenamiento.',
  'Mantén una rutina constante y valida cada asistencia el mismo día.',
  'Solo cuentan asistencias válidas, únicas y verificables.',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "challenge_templates" t
JOIN "challenge_categories" c ON c."id" = t."category_id";

INSERT INTO "challenge_template_fields" ("id", "template_version_id", "field_key", "policy", "minimum_value", "maximum_value")
SELECT gen_random_uuid(), v."id", f."field_key", f."policy"::"ChallengeTemplateFieldPolicy", f."minimum_value", f."maximum_value"
FROM "challenge_template_versions" v
CROSS JOIN LATERAL (VALUES
  ('durationDays', 'LOCKED', v."minimum_duration_days"::DECIMAL, v."maximum_duration_days"::DECIMAL),
  ('targetValue', 'LOCKED', v."default_target_value"::DECIMAL, v."default_target_value"::DECIMAL),
  ('modality', 'EDITABLE', NULL::DECIMAL, NULL::DECIMAL)
) AS f("field_key", "policy", "minimum_value", "maximum_value");

UPDATE "challenges" ch SET
  "template_id" = t."id",
  "template_version_id" = v."id",
  "name" = c."name",
  "description" = c."description",
  "modality" = CASE
    WHEN (SELECT COUNT(*) FROM "challenge_participants" p WHERE p."challenge_id" = ch."id") = 1 THEN 'SOLO'::"ChallengeModality"
    WHEN (SELECT COUNT(*) FROM "challenge_participants" p WHERE p."challenge_id" = ch."id") = 2 THEN 'HEAD_TO_HEAD'::"ChallengeModality"
    ELSE 'GROUP'::"ChallengeModality" END,
  "duration_days" = c."duration_days",
  "timezone" = COALESCE((SELECT up."timezone" FROM "user_profiles" up WHERE up."user_id" = ch."creator_id"), 'America/Bogota'),
  "target_value" = c."target_attendances",
  "target_unit" = 'attendances',
  "evidence_type" = 'TWO_PHOTOS',
  "points_per_completion" = c."points_per_attendance",
  "max_daily_completions" = 1
FROM "challenge_categories" c
JOIN "challenge_templates" t ON t."category_id" = c."id"
JOIN "challenge_template_versions" v ON v."template_id" = t."id" AND v."version" = 1
WHERE ch."category_id" = c."id";

ALTER TABLE "challenges"
  ADD CONSTRAINT "challenges_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "challenge_templates"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "challenges_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "challenge_template_versions"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "challenges_snapshot_values_check" CHECK ("duration_days" > 0 AND "target_value" > 0 AND "points_per_completion" >= 0 AND "max_daily_completions" > 0);

CREATE TABLE "challenge_rule_snapshots" (
  "id" UUID PRIMARY KEY,
  "challenge_id" UUID NOT NULL,
  "template_id" UUID,
  "template_version_id" UUID,
  "template_version" INTEGER,
  "rules" JSONB NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "challenge_rule_snapshots_challenge_id_key" UNIQUE ("challenge_id"),
  CONSTRAINT "challenge_rule_snapshots_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE,
  CONSTRAINT "challenge_rule_snapshots_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "challenge_templates"("id") ON DELETE RESTRICT,
  CONSTRAINT "challenge_rule_snapshots_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "challenge_template_versions"("id") ON DELETE RESTRICT
);

INSERT INTO "challenge_rule_snapshots" (
  "id", "challenge_id", "template_id", "template_version_id", "template_version", "rules", "checksum", "created_at"
)
SELECT gen_random_uuid(), ch."id", ch."template_id", ch."template_version_id", v."version", rules.payload,
  md5(rules.payload::TEXT) || md5('nova-gym:' || rules.payload::TEXT), ch."created_at"
FROM "challenges" ch
LEFT JOIN "challenge_template_versions" v ON v."id" = ch."template_version_id"
CROSS JOIN LATERAL (SELECT jsonb_build_object(
  'schemaVersion', 1,
  'name', ch."name",
  'description', ch."description",
  'challengeType', COALESCE(v."challenge_type"::TEXT, 'REACH_TARGET'),
  'modality', ch."modality"::TEXT,
  'durationDays', ch."duration_days",
  'timezone', ch."timezone",
  'targetValue', ch."target_value",
  'targetUnit', ch."target_unit",
  'evidenceType', ch."evidence_type"::TEXT,
  'pointsPerCompletion', ch."points_per_completion",
  'completionBonus', COALESCE(v."completion_bonus", 0),
  'winnerBonus', COALESCE(v."winner_bonus", 0),
  'maxDailyCompletions', ch."max_daily_completions",
  'validWeekdays', COALESCE(v."valid_weekdays", ARRAY[1,2,3,4,5,6,7]),
  'scoringRules', COALESCE(v."scoring_rules", '{}'::JSONB),
  'winningRule', COALESCE(v."winning_rule", '{}'::JSONB),
  'tieRule', COALESCE(v."tie_rule", '{}'::JSONB)
) AS payload) rules;

CREATE INDEX "challenge_templates_status_featured_sort_order_idx" ON "challenge_templates"("status", "featured", "sort_order");
CREATE INDEX "challenge_templates_category_id_status_idx" ON "challenge_templates"("category_id", "status");
CREATE INDEX "challenge_template_versions_template_id_published_at_idx" ON "challenge_template_versions"("template_id", "published_at");
CREATE INDEX "challenges_template_id_idx" ON "challenges"("template_id");
CREATE INDEX "challenges_template_version_id_idx" ON "challenges"("template_version_id");
CREATE INDEX "challenge_rule_snapshots_template_id_template_version_id_idx" ON "challenge_rule_snapshots"("template_id", "template_version_id");
