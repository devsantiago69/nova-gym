import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

const schema = z.object({ routineExerciseId: z.string().uuid(), setNumber: z.number().int().min(1).max(20), completed: z.boolean(), reps: z.number().int().min(0).max(500).nullable().optional(), weightKg: z.number().min(0).max(2000).nullable().optional(), durationSeconds: z.number().int().min(0).max(7200).nullable().optional() });

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Serie inválida", 422);
  const { sessionId } = await context.params;
  const workout = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId: auth.user.id, status: { in: ["ACTIVE", "PAUSED"] }, routine: { exercises: { some: { id: parsed.data.routineExerciseId } } } } });
  if (!workout) return fail("NOT_FOUND", "Sesión o ejercicio no disponible", 404);
  const key = { sessionId_routineExerciseId_setNumber: { sessionId, routineExerciseId: parsed.data.routineExerciseId, setNumber: parsed.data.setNumber } };
  if (!parsed.data.completed) {
    await prisma.workoutSetLog.deleteMany({ where: { sessionId, routineExerciseId: parsed.data.routineExerciseId, setNumber: parsed.data.setNumber } });
    return ok(null, "Serie desmarcada");
  }
  const values = { reps: parsed.data.reps ?? null, weightKg: parsed.data.weightKg ?? null, durationSeconds: parsed.data.durationSeconds ?? null };
  const log = await prisma.workoutSetLog.upsert({ where: key, create: { sessionId, routineExerciseId: parsed.data.routineExerciseId, setNumber: parsed.data.setNumber, ...values }, update: { ...values, completedAt: new Date() } });
  return ok(log, "Serie completada");
}
