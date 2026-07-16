CREATE TABLE "challenge_drafts" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL DEFAULT 'Nuevo reto',
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "challenge_drafts_owner_id_updated_at_idx" ON "challenge_drafts"("owner_id", "updated_at");
CREATE INDEX "challenge_drafts_expires_at_idx" ON "challenge_drafts"("expires_at");

ALTER TABLE "challenge_drafts" ADD CONSTRAINT "challenge_drafts_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
