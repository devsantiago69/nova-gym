import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { invalidatePlacementsCache } from "@/modules/gamification/ad-placements";
import { adPlacementSchema } from "./schema";

async function admin() {
  const session = await getServerSession(authOptions);
  return session?.user.role === "ADMIN" ? session : null;
}

export async function GET() {
  if (!(await admin())) return fail("FORBIDDEN", "No tienes permisos", 403);
  return ok(await prisma.adPlacement.findMany({ orderBy: { page: "asc" } }));
}

export async function POST(request: Request) {
  const session = await admin();
  if (!session) return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = adPlacementSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Datos inválidos",
      422,
      parsed.error.issues[0]?.path.join(".") ?? null,
    );

  try {
    const placement = await prisma.adPlacement.create({ data: parsed.data });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "AD_PLACEMENT_CREATED",
        entityType: "AdPlacement",
        entityId: placement.id,
        correlationId: crypto.randomUUID(),
        newValues: parsed.data,
      },
    });
    invalidatePlacementsCache();
    return ok(placement, "Espacio de publicidad creado", 201);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002")
      return fail("PLACEMENT_EXISTS", "Ya existe un espacio con esa clave", 409);
    return fail("INTERNAL_ERROR", "No fue posible crear el espacio de publicidad", 500);
  }
}
