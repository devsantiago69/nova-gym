import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { routineInclude } from "@/modules/routines/queries";

const schema = z.object({
  name: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(600),
  goal: z.string().trim().min(2).max(100),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  estimatedMinutes: z.number().int().min(5).max(240),
  exercises: z.array(z.object({
    exerciseId: z.string().min(1).max(20), sets: z.number().int().min(1).max(10),
    reps: z.number().int().min(1).max(200).nullable().optional(),
    durationSeconds: z.number().int().min(5).max(3600).nullable().optional(),
    restSeconds: z.number().int().min(0).max(600).default(60),
  })).min(1).max(30),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const routines = await prisma.routine.findMany({
    where: { OR: [{ isPublic: true }, { ownerId: session.user.id }] },
    include: routineInclude,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });
  return ok(routines);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422);
  const exerciseIds = [...new Set(parsed.data.exercises.map((item) => item.exerciseId))];
  if (await prisma.exerciseCatalog.count({ where: { id: { in: exerciseIds } } }) !== exerciseIds.length) {
    return fail("EXERCISE_NOT_FOUND", "Uno de los ejercicios ya no está disponible", 422);
  }
  const slug = `${parsed.data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  const routine = await prisma.routine.create({ data: {
    ownerId: session.user.id, slug, name: parsed.data.name, description: parsed.data.description,
    goal: parsed.data.goal, difficulty: parsed.data.difficulty,
    estimatedMinutes: parsed.data.estimatedMinutes,
    exercises: { create: parsed.data.exercises.map(({ exerciseId, sets, reps, durationSeconds, restSeconds }, position) => ({
      sets,
      reps: reps ?? null,
      durationSeconds: durationSeconds ?? null,
      restSeconds,
      position,
      exercise: { connect: { id: exerciseId } },
    })) },
  }, include: routineInclude });
  return ok(routine, "Tu rutina quedó guardada", 201);
}
