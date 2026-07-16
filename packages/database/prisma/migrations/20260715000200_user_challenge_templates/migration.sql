CREATE TABLE "user_challenge_templates" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "source_challenge_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "configuration" JSONB NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_challenge_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_challenge_templates_owner_id_archived_at_created_at_idx"
ON "user_challenge_templates"("owner_id", "archived_at", "created_at");

CREATE INDEX "user_challenge_templates_category_id_idx"
ON "user_challenge_templates"("category_id");

ALTER TABLE "user_challenge_templates"
ADD CONSTRAINT "user_challenge_templates_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_challenge_templates"
ADD CONSTRAINT "user_challenge_templates_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "challenge_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_challenge_templates"
ADD CONSTRAINT "user_challenge_templates_source_challenge_id_fkey"
FOREIGN KEY ("source_challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
