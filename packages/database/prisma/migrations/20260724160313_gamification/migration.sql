-- CreateEnum
CREATE TYPE "XpMovementType" AS ENUM ('ATTENDANCE_EARNED', 'CHALLENGE_COMPLETED', 'STREAK_CLAIM', 'AD_WATCHED', 'DAILY_USAGE', 'ADMIN_ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "attendance_photos" DROP CONSTRAINT "attendance_photos_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_photos" DROP CONSTRAINT "attendance_photos_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_attendance_reviews" DROP CONSTRAINT "challenge_attendance_reviews_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_attendance_reviews" DROP CONSTRAINT "challenge_attendance_reviews_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_attendance_reviews" DROP CONSTRAINT "challenge_attendance_reviews_reviewer_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_checklist_items" DROP CONSTRAINT "challenge_checklist_items_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_completion_checklist_items" DROP CONSTRAINT "challenge_completion_checklist_items_completion_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_completion_checklist_items" DROP CONSTRAINT "challenge_completion_checklist_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_completion_evidence" DROP CONSTRAINT "challenge_completion_evidence_completion_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_completions" DROP CONSTRAINT "challenge_completions_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_completions" DROP CONSTRAINT "challenge_completions_participant_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_completions" DROP CONSTRAINT "challenge_completions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_participants" DROP CONSTRAINT "challenge_participants_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_participants" DROP CONSTRAINT "challenge_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_rule_snapshots" DROP CONSTRAINT "challenge_rule_snapshots_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_rule_snapshots" DROP CONSTRAINT "challenge_rule_snapshots_template_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_rule_snapshots" DROP CONSTRAINT "challenge_rule_snapshots_template_version_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_score_events" DROP CONSTRAINT "challenge_score_events_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_score_events" DROP CONSTRAINT "challenge_score_events_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_score_events" DROP CONSTRAINT "challenge_score_events_completion_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_score_events" DROP CONSTRAINT "challenge_score_events_user_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_template_fields" DROP CONSTRAINT "challenge_template_fields_template_version_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_template_versions" DROP CONSTRAINT "challenge_template_versions_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_template_versions" DROP CONSTRAINT "challenge_template_versions_template_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_templates" DROP CONSTRAINT "challenge_templates_category_id_fkey";

-- DropForeignKey
ALTER TABLE "challenge_templates" DROP CONSTRAINT "challenge_templates_minimum_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_category_id_fkey";

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_template_id_fkey";

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_template_version_id_fkey";

-- DropForeignKey
ALTER TABLE "club_memberships" DROP CONSTRAINT "club_memberships_club_id_fkey";

-- DropForeignKey
ALTER TABLE "club_memberships" DROP CONSTRAINT "club_memberships_user_id_fkey";

-- DropForeignKey
ALTER TABLE "club_session_participants" DROP CONSTRAINT "club_session_participants_session_id_fkey";

-- DropForeignKey
ALTER TABLE "club_session_participants" DROP CONSTRAINT "club_session_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "club_sessions" DROP CONSTRAINT "club_sessions_club_id_fkey";

-- DropForeignKey
ALTER TABLE "club_sessions" DROP CONSTRAINT "club_sessions_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_addressee_id_fkey";

-- DropForeignKey
ALTER TABLE "friendships" DROP CONSTRAINT "friendships_requester_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "point_ledger" DROP CONSTRAINT "point_ledger_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "point_ledger" DROP CONSTRAINT "point_ledger_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "point_ledger" DROP CONSTRAINT "point_ledger_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "social_comments" DROP CONSTRAINT "social_comments_post_id_fkey";

-- DropForeignKey
ALTER TABLE "social_comments" DROP CONSTRAINT "social_comments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "social_posts" DROP CONSTRAINT "social_posts_attendance_id_fkey";

-- DropForeignKey
ALTER TABLE "social_posts" DROP CONSTRAINT "social_posts_challenge_id_fkey";

-- DropForeignKey
ALTER TABLE "social_posts" DROP CONSTRAINT "social_posts_club_id_fkey";

-- DropForeignKey
ALTER TABLE "social_posts" DROP CONSTRAINT "social_posts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "social_reactions" DROP CONSTRAINT "social_reactions_post_id_fkey";

-- DropForeignKey
ALTER TABLE "social_reactions" DROP CONSTRAINT "social_reactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_created_by_id_fkey";

-- AlterTable
ALTER TABLE "challenge_evidence_views" ALTER COLUMN "opened_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "challenge_rest_days" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "club_memberships" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "club_session_participants" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "club_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "clubs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "exercise_catalog" ALTER COLUMN "secondary_muscles" DROP DEFAULT,
ALTER COLUMN "instruction_steps_es" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "routine_exercises" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "routines" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "social_posts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workout_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workout_set_logs" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "xp_ledger" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "XpMovementType" NOT NULL,
    "source_type" VARCHAR(80) NOT NULL,
    "source_id" UUID,
    "description" VARCHAR(500),
    "logical_date" DATE,
    "actor_id" UUID,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_definitions" (
    "id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "xp_threshold" INTEGER NOT NULL,
    "icon" VARCHAR(60),
    "color_from" VARCHAR(20),
    "color_to" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_claims" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier" INTEGER NOT NULL,
    "streak_start" DATE NOT NULL,
    "xp_amount" INTEGER NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_watch_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slot" VARCHAR(60) NOT NULL,
    "xp_amount" INTEGER NOT NULL,
    "watched_seconds" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_watch_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xp_ledger_idempotency_key_key" ON "xp_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "xp_ledger_user_id_created_at_idx" ON "xp_ledger"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "level_definitions_level_key" ON "level_definitions"("level");

-- CreateIndex
CREATE INDEX "level_definitions_xp_threshold_idx" ON "level_definitions"("xp_threshold");

-- CreateIndex
CREATE INDEX "streak_claims_user_id_claimed_at_idx" ON "streak_claims"("user_id", "claimed_at");

-- CreateIndex
CREATE UNIQUE INDEX "streak_claims_user_id_streak_start_tier_key" ON "streak_claims"("user_id", "streak_start", "tier");

-- CreateIndex
CREATE INDEX "ad_watch_events_user_id_created_at_idx" ON "ad_watch_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_sessions" ADD CONSTRAINT "club_sessions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_sessions" ADD CONSTRAINT "club_sessions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_participants" ADD CONSTRAINT "club_session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "club_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_session_participants" ADD CONSTRAINT "club_session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reactions" ADD CONSTRAINT "social_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reactions" ADD CONSTRAINT "social_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_templates" ADD CONSTRAINT "challenge_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "challenge_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_templates" ADD CONSTRAINT "challenge_templates_minimum_plan_id_fkey" FOREIGN KEY ("minimum_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_template_versions" ADD CONSTRAINT "challenge_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "challenge_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_template_versions" ADD CONSTRAINT "challenge_template_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_template_fields" ADD CONSTRAINT "challenge_template_fields_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "challenge_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "challenge_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "challenge_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "challenge_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_rule_snapshots" ADD CONSTRAINT "challenge_rule_snapshots_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_rule_snapshots" ADD CONSTRAINT "challenge_rule_snapshots_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "challenge_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_rule_snapshots" ADD CONSTRAINT "challenge_rule_snapshots_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "challenge_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_score_events" ADD CONSTRAINT "challenge_score_events_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_score_events" ADD CONSTRAINT "challenge_score_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_score_events" ADD CONSTRAINT "challenge_score_events_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_score_events" ADD CONSTRAINT "challenge_score_events_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "challenge_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "challenge_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completions" ADD CONSTRAINT "challenge_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completion_evidence" ADD CONSTRAINT "challenge_completion_evidence_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "challenge_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_checklist_items" ADD CONSTRAINT "challenge_checklist_items_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completion_checklist_items" ADD CONSTRAINT "challenge_completion_checklist_items_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "challenge_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_completion_checklist_items" ADD CONSTRAINT "challenge_completion_checklist_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "challenge_checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attendance_reviews" ADD CONSTRAINT "challenge_attendance_reviews_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attendance_reviews" ADD CONSTRAINT "challenge_attendance_reviews_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attendance_reviews" ADD CONSTRAINT "challenge_attendance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_photos" ADD CONSTRAINT "attendance_photos_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_photos" ADD CONSTRAINT "attendance_photos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_ledger" ADD CONSTRAINT "xp_ledger_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_claims" ADD CONSTRAINT "streak_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_watch_events" ADD CONSTRAINT "ad_watch_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "challenge_attendance_reviews_challenge_attendance_idx" RENAME TO "challenge_attendance_reviews_challenge_id_attendance_id_idx";

-- RenameIndex
ALTER INDEX "challenge_attendance_reviews_challenge_attendance_reviewer_key" RENAME TO "challenge_attendance_reviews_challenge_id_attendance_id_rev_key";

-- RenameIndex
ALTER INDEX "challenge_attendance_reviews_reviewer_created_idx" RENAME TO "challenge_attendance_reviews_reviewer_id_created_at_idx";
