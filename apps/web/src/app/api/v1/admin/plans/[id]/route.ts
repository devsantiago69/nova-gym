import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { planSchema } from "../schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);
  const { id } = await context.params;
  const previous = await prisma.plan.findUnique({ where: { id } });
  if (!previous) return fail("PLAN_NOT_FOUND", "El plan no existe", 404);
  try {
    const plan = await prisma.plan.update({ where: { id }, data: parsed.data, include: { _count: { select: { subscriptions: true } } } });
    await prisma.auditLog.create({ data: { actorId: session.user.id, action: "PLAN_UPDATED", entityType: "Plan", entityId: id, correlationId: crypto.randomUUID(), previousValues: { name: previous.name, code: previous.code, status: previous.status, monthlyPrice: Number(previous.monthlyPrice) }, newValues: parsed.data } });
    return ok(plan, "Plan actualizado");
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") return fail("PLAN_EXISTS", "Ya existe un plan con ese código", 409);
    return fail("INTERNAL_ERROR", "No fue posible actualizar el plan", 500);
  }
}
