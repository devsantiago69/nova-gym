import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { invalidatePlacementsCache } from "@/modules/gamification/ad-placements";
import { adPlacementSchema } from "../schema";

async function admin() {
  const session = await getServerSession(authOptions);
  return session?.user.role === "ADMIN" ? session : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await admin();
  if (!session) return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = adPlacementSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Datos inválidos",
      422,
      parsed.error.issues[0]?.path.join(".") ?? null,
    );
  const { id } = await context.params;
  const previous = await prisma.adPlacement.findUnique({ where: { id } });
  if (!previous) return fail("PLACEMENT_NOT_FOUND", "El espacio no existe", 404);

  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );

  try {
    const placement = await prisma.adPlacement.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "AD_PLACEMENT_UPDATED",
        entityType: "AdPlacement",
        entityId: id,
        correlationId: crypto.randomUUID(),
        previousValues: { enabled: previous.enabled, slotId: previous.slotId, frequency: previous.frequency },
        newValues: parsed.data,
      },
    });
    invalidatePlacementsCache();
    return ok(placement, "Espacio de publicidad actualizado");
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002")
      return fail("PLACEMENT_EXISTS", "Ya existe un espacio con esa clave", 409);
    return fail("INTERNAL_ERROR", "No fue posible actualizar el espacio de publicidad", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await admin();
  if (!session) return fail("FORBIDDEN", "No tienes permisos", 403);
  const { id } = await context.params;
  const previous = await prisma.adPlacement.findUnique({ where: { id } });
  if (!previous) return fail("PLACEMENT_NOT_FOUND", "El espacio no existe", 404);
  await prisma.adPlacement.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "AD_PLACEMENT_DELETED",
      entityType: "AdPlacement",
      entityId: id,
      correlationId: crypto.randomUUID(),
      previousValues: { key: previous.key, page: previous.page },
    },
  });
  invalidatePlacementsCache();
  return ok(null, "Espacio de publicidad eliminado");
}
