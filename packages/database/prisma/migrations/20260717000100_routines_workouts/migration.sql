CREATE TYPE "RoutineDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "WorkoutSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

CREATE TABLE "exercise_catalog" (
  "id" VARCHAR(20) PRIMARY KEY,
  "name" VARCHAR(180) NOT NULL,
  "name_es" VARCHAR(180),
  "category" VARCHAR(80) NOT NULL,
  "body_part" VARCHAR(80) NOT NULL,
  "equipment" VARCHAR(100) NOT NULL,
  "target" VARCHAR(100) NOT NULL,
  "muscle_group" VARCHAR(100),
  "secondary_muscles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "instructions_es" TEXT NOT NULL,
  "instruction_steps_es" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "image_path" VARCHAR(300),
  "gif_path" VARCHAR(300),
  "attribution" VARCHAR(300),
  "source" VARCHAR(100) NOT NULL DEFAULT 'hasaneyldrm/exercises-dataset',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "routines" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" VARCHAR(120) NOT NULL UNIQUE,
  "owner_id" UUID,
  "name" VARCHAR(140) NOT NULL,
  "description" VARCHAR(600) NOT NULL,
  "goal" VARCHAR(100) NOT NULL,
  "difficulty" "RoutineDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "estimated_minutes" INTEGER NOT NULL,
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "routines_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "routine_exercises" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "routine_id" UUID NOT NULL,
  "exercise_id" VARCHAR(20) NOT NULL,
  "position" INTEGER NOT NULL,
  "sets" INTEGER NOT NULL DEFAULT 3,
  "reps" INTEGER,
  "duration_seconds" INTEGER,
  "rest_seconds" INTEGER NOT NULL DEFAULT 60,
  "notes" VARCHAR(300),
  CONSTRAINT "routine_exercises_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "routine_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "routine_exercises_routine_id_position_key" UNIQUE ("routine_id", "position")
);

CREATE TABLE "workout_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "routine_id" UUID NOT NULL,
  "status" "WorkoutSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "segment_started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  "accumulated_seconds" INTEGER NOT NULL DEFAULT 0,
  "current_exercise_index" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workout_sessions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "workout_set_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "routine_exercise_id" UUID NOT NULL,
  "set_number" INTEGER NOT NULL,
  "reps" INTEGER,
  "weight_kg" DECIMAL(6,2),
  "duration_seconds" INTEGER,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workout_set_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workout_set_logs_routine_exercise_id_fkey" FOREIGN KEY ("routine_exercise_id") REFERENCES "routine_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workout_set_logs_session_id_routine_exercise_id_set_number_key" UNIQUE ("session_id", "routine_exercise_id", "set_number")
);

CREATE INDEX "exercise_catalog_category_idx" ON "exercise_catalog"("category");
CREATE INDEX "exercise_catalog_body_part_idx" ON "exercise_catalog"("body_part");
CREATE INDEX "exercise_catalog_equipment_idx" ON "exercise_catalog"("equipment");
CREATE INDEX "exercise_catalog_target_idx" ON "exercise_catalog"("target");
CREATE INDEX "routines_owner_id_created_at_idx" ON "routines"("owner_id", "created_at");
CREATE INDEX "routines_is_public_is_featured_idx" ON "routines"("is_public", "is_featured");
CREATE INDEX "routine_exercises_routine_id_idx" ON "routine_exercises"("routine_id");
CREATE INDEX "routine_exercises_exercise_id_idx" ON "routine_exercises"("exercise_id");
CREATE INDEX "workout_sessions_user_id_created_at_idx" ON "workout_sessions"("user_id", "created_at");
CREATE INDEX "workout_sessions_routine_id_created_at_idx" ON "workout_sessions"("routine_id", "created_at");
CREATE INDEX "workout_set_logs_session_id_completed_at_idx" ON "workout_set_logs"("session_id", "completed_at");

CREATE UNIQUE INDEX "workout_sessions_one_active_per_user"
  ON "workout_sessions"("user_id")
  WHERE "status" IN ('ACTIVE', 'PAUSED');
