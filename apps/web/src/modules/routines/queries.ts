import { prisma } from "@gymchallenge/database";

export const routineInclude = {
  exercises: {
    orderBy: { position: "asc" as const },
    include: { exercise: true },
  },
} as const;

export function canAccessRoutine(userId: string, routineId: string) {
  return prisma.routine.findFirst({
    where: { id: routineId, OR: [{ isPublic: true }, { ownerId: userId }] },
    include: routineInclude,
  });
}

export const exerciseLabel = (exercise: { name: string; nameEs: string | null }) =>
  exercise.nameEs || exercise.name;

