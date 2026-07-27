import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { levelSchema } from "../schema";

async function admin() {
  const session = await getServerSession(authOptions);
  return session?.user.role === "ADMIN" ? session : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await admin();
  if (!session) return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = levelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Datos inválidos",
      422,
      parsed.error.issues[0]?.path.join(".") ?? null,
    );
  const { id } = await context.params;
  const previous = await prisma.levelDefinition.findUnique({ where: { id } });
  if (!previous) return fail("LEVEL_NOT_FOUND", "El nivel no existe", 404);
  const data = parsed.data;

  const [previousLevel, nextLevel] = await Promise.all([
    prisma.levelDefinition.findUnique({ where: { level: data.level - 1 } }),
    prisma.levelDefinition.findUnique({ where: { level: data.level + 1 } }),
  ]);
  if (previousLevel && previousLevel.id !== id && data.xpThreshold <= previousLevel.xpThreshold)
    return fail(
      "INVALID_THRESHOLD",
      "El umbral debe ser mayor que el del nivel anterior",
      422,
      "xpThreshold",
    );
  if (nextLevel && nextLevel.id !== id && data.xpThreshold >= nextLevel.xpThreshold)
    return fail(
      "INVALID_THRESHOLD",
      "El umbral debe ser menor que el del siguiente nivel",
      422,
      "xpThreshold",
    );

  try {
    const level = await prisma.levelDefinition.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "LEVEL_UPDATED",
        entityType: "LevelDefinition",
        entityId: id,
        correlationId: crypto.randomUUID(),
        previousValues: { level: previous.level, title: previous.title, xpThreshold: previous.xpThreshold },
        newValues: data,
      },
    });
    return ok(level, "Nivel actualizado");
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002")
      return fail("LEVEL_EXISTS", "Ya existe ese nivel", 409);
    return fail("INTERNAL_ERROR", "No fue posible actualizar el nivel", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await admin();
  if (!session) return fail("FORBIDDEN", "No tienes permisos", 403);
  const { id } = await context.params;
  const [target, highest] = await Promise.all([
    prisma.levelDefinition.findUnique({ where: { id } }),
    prisma.levelDefinition.findFirst({ orderBy: { level: "desc" } }),
  ]);
  if (!target) return fail("LEVEL_NOT_FOUND", "El nivel no existe", 404);
  if (!highest || target.level !== highest.level)
    return fail(
      "LEVEL_NOT_DELETABLE",
      "Solo puedes eliminar el nivel más alto para mantener la curva sin huecos",
      422,
    );
  await prisma.levelDefinition.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "LEVEL_DELETED",
      entityType: "LevelDefinition",
      entityId: id,
      correlationId: crypto.randomUUID(),
      previousValues: { level: target.level, title: target.title, xpThreshold: target.xpThreshold },
    },
  });
  return ok(null, "Nivel eliminado");
}
