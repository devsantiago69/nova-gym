import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@gymchallenge/database";
import { fail } from "@/lib/api-response";

export async function GET(request: Request, context: { params: Promise<{ exerciseId: string }> }) {
  if (process.env.EXERCISE_MEDIA_LICENSED !== "1") {
    return fail("MEDIA_LICENSE_REQUIRED", "La biblioteca visual requiere una licencia de Gym visual", 403);
  }
  const { exerciseId } = await context.params;
  const exercise = await prisma.exerciseCatalog.findUnique({ where: { id: exerciseId } });
  if (!exercise) return fail("NOT_FOUND", "Ejercicio no encontrado", 404);
  const kind = new URL(request.url).searchParams.get("type") === "animation" ? "animation" : "image";
  const relative = kind === "animation" ? exercise.gifPath : exercise.imagePath;
  if (!relative) return fail("MEDIA_NOT_FOUND", "Este ejercicio no tiene ese recurso", 404);
  const root = path.resolve(process.env.EXERCISE_DATASET_PATH ?? path.resolve(process.cwd(), "../../vendor/exercises-dataset"));
  const optimizedRoot = path.resolve(process.env.EXERCISE_OPTIMIZED_MEDIA_PATH ?? path.resolve(process.cwd(), "../../storage/exercise-media"));
  const optimizedPath = path.join(optimizedRoot, kind === "animation" ? "animations" : "images", `${path.parse(relative).name}.webp`);
  const originalPath = path.resolve(root, relative);
  if (!originalPath.startsWith(`${root}${path.sep}`) || !optimizedPath.startsWith(`${optimizedRoot}${path.sep}`)) {
    return fail("INVALID_MEDIA_PATH", "Ruta no válida", 400);
  }
  const optimized = await readFile(optimizedPath).catch(() => null);
  const filePath = optimized ? optimizedPath : originalPath;
  const content = optimized ?? await readFile(filePath).catch(() => null);
  if (!content) return fail("MEDIA_NOT_FOUND", "Recurso no encontrado", 404);
  return new Response(content, { headers: {
    "Content-Type": optimized ? "image/webp" : kind === "animation" ? "image/gif" : "image/jpeg",
    "Cache-Control": "public, max-age=604800, immutable",
    "Content-Disposition": "inline",
    "X-Media-Attribution": "Gym visual; https://gymvisual.com/",
  } });
}
