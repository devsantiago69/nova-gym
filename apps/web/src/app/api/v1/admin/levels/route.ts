import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { levelSchema } from "./schema";

async function admin() {
  const session = await getServerSession(authOptions);
  return session?.user.role === "ADMIN" ? session : null;
}

export async function GET() {
  if (!(await admin())) return fail("FORBIDDEN", "No tienes permisos", 403);
  return ok(await prisma.levelDefinition.findMany({ orderBy: { level: "asc" } }));
}

export async function POST(request: Request) {
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
  const data = parsed.data;

  const [previousLevel, nextLevel] = await Promise.all([
    prisma.levelDefinition.findUnique({ where: { level: data.level - 1 } }),
    prisma.levelDefinition.findUnique({ where: { level: data.level + 1 } }),
  ]);
  if (previousLevel && data.xpThreshold <= previousLevel.xpThreshold)
    return fail(
      "INVALID_THRESHOLD",
      "El umbral debe ser mayor que el del nivel anterior",
      422,
      "xpThreshold",
    );
  if (nextLevel && data.xpThreshold >= nextLevel.xpThreshold)
    return fail(
      "INVALID_THRESHOLD",
      "El umbral debe ser menor que el del siguiente nivel",
      422,
      "xpThreshold",
    );

  try {
    const level = await prisma.levelDefinition.create({ data });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "LEVEL_CREATED",
        entityType: "LevelDefinition",
        entityId: level.id,
        correlationId: crypto.randomUUID(),
        newValues: data,
      },
    });
    return ok(level, "Nivel creado correctamente", 201);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002")
      return fail("LEVEL_EXISTS", "Ya existe ese nivel", 409);
    return fail("INTERNAL_ERROR", "No fue posible crear el nivel", 500);
  }
}
