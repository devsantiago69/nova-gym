import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { challengeCategorySchema } from "../schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = challengeCategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);
  const { id } = await context.params;
  const previous = await prisma.challengeCategory.findUnique({ where: { id } });
  if (!previous) return fail("CATEGORY_NOT_FOUND", "El reto no existe", 404);
  try {
    const category = await prisma.challengeCategory.update({ where: { id }, data: parsed.data });
    await prisma.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_CATEGORY_UPDATED", entityType: "ChallengeCategory", entityId: id, correlationId: crypto.randomUUID(), previousValues: { name: previous.name, slug: previous.slug, status: previous.status }, newValues: parsed.data } });
    return ok(category, "Reto actualizado");
  } catch { return fail("CATEGORY_EXISTS", "Ya existe otra categoría con ese slug", 409); }
}
