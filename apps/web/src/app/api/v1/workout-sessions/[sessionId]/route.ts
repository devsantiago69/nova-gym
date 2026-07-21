import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { routineInclude } from "@/modules/routines/queries";

const schema = z.object({ action: z.enum(["pause", "resume", "finish", "abandon", "progress"]), currentExerciseIndex: z.number().int().min(0).optional() });

export async function GET(_: Request, context: { params: Promise<{ sessionId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { sessionId } = await context.params;
  const workout = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: auth.user.id },
    include: { routine: { include: routineInclude }, setLogs: true },
  });
  return workout ? ok(workout) : fail("NOT_FOUND", "Entrenamiento no encontrado", 404);
}

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Acción inválida", 422);
  const { sessionId } = await context.params;
  const workout = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId: auth.user.id } });
  if (!workout) return fail("NOT_FOUND", "Entrenamiento no encontrado", 404);
  if (["COMPLETED", "ABANDONED"].includes(workout.status)) return fail("WORKOUT_CLOSED", "Este entrenamiento ya terminó", 409);
  const now = new Date();
  const elapsed = workout.status === "ACTIVE" && workout.segmentStartedAt
    ? Math.max(0, Math.floor((now.getTime() - workout.segmentStartedAt.getTime()) / 1000)) : 0;
  const accumulatedSeconds = workout.accumulatedSeconds + elapsed;
  const action = parsed.data.action;
  const updated = await prisma.workoutSession.update({ where: { id: workout.id }, data:
    action === "pause" ? { status: "PAUSED", accumulatedSeconds, segmentStartedAt: null } :
    action === "resume" ? { status: "ACTIVE", segmentStartedAt: now } :
    action === "finish" ? { status: "COMPLETED", accumulatedSeconds, segmentStartedAt: null, endedAt: now } :
    action === "abandon" ? { status: "ABANDONED", accumulatedSeconds, segmentStartedAt: null, endedAt: now } :
    { currentExerciseIndex: parsed.data.currentExerciseIndex ?? workout.currentExerciseIndex },
  });
  return ok(updated, action === "finish" ? "¡Entrenamiento completado!" : "Entrenamiento actualizado");
}
