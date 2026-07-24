import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const bodyPart = url.searchParams.get("bodyPart")?.trim() ?? "";
  const equipment = url.searchParams.get("equipment")?.trim() ?? "";
  const take = Math.min(Math.max(Number(url.searchParams.get("take")) || 30, 1), 100);
  const exercises = await prisma.exerciseCatalog.findMany({
    where: {
      ...(query ? { OR: [
        { name: { contains: query, mode: "insensitive" } },
        { nameEs: { contains: query, mode: "insensitive" } },
        { target: { contains: query, mode: "insensitive" } },
        { muscleGroup: { contains: query, mode: "insensitive" } },
      ] } : {}),
      ...(bodyPart ? { bodyPart } : {}),
      ...(equipment ? { equipment } : {}),
    },
    orderBy: [{ nameEs: "asc" }, { name: "asc" }],
    take,
  });
  return ok(exercises.map((exercise) => ({
    ...exercise,
    displayName: exercise.nameEs || exercise.name,
    mediaUrl: `/api/v1/exercises/${exercise.id}/media?type=image&v=quality3`,
    animationUrl: `/api/v1/exercises/${exercise.id}/media?type=animation&v=quality3`,
  })));
}
