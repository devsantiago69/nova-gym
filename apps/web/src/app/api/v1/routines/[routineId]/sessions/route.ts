import { getServerSession } from "next-auth";
import { Prisma } from "@gymchallenge/database";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { canAccessRoutine } from "@/modules/routines/queries";

export async function POST(_: Request, context: { params: Promise<{ routineId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { routineId } = await context.params;
  if (!await canAccessRoutine(session.user.id, routineId)) return fail("NOT_FOUND", "Rutina no encontrada", 404);
  const active = await prisma.workoutSession.findFirst({
    where: { userId: session.user.id, status: { in: ["ACTIVE", "PAUSED"] } },
  });
  if (active) {
    if (active.routineId === routineId) return ok(active, "Continuamos donde quedaste");
    return fail("ACTIVE_WORKOUT_EXISTS", "Ya tienes otro entrenamiento activo. Finalízalo antes de comenzar uno nuevo.", 409);
  }
  try {
    return ok(await prisma.workoutSession.create({ data: { userId: session.user.id, routineId } }), "¡Cronómetro iniciado!", 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("ACTIVE_WORKOUT_EXISTS", "Ya tienes un entrenamiento activo", 409);
    throw error;
  }
}

