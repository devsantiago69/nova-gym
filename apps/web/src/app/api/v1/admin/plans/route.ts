import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { planSchema } from "./schema";

async function admin() { const session = await getServerSession(authOptions); return session?.user.role === "ADMIN" ? session : null; }

export async function GET() {
  if (!await admin()) return fail("FORBIDDEN", "No tienes permisos", 403);
  return ok(await prisma.plan.findMany({ include: { _count: { select: { subscriptions: true } } }, orderBy: { monthlyPrice: "asc" } }));
}

export async function POST(request: Request) {
  const session = await admin(); if (!session) return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);
  try {
    const plan = await prisma.plan.create({ data: parsed.data, include: { _count: { select: { subscriptions: true } } } });
    await prisma.auditLog.create({ data: { actorId: session.user.id, action: "PLAN_CREATED", entityType: "Plan", entityId: plan.id, correlationId: crypto.randomUUID(), newValues: parsed.data } });
    return ok(plan, "Plan creado correctamente", 201);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") return fail("PLAN_EXISTS", "Ya existe un plan con ese código", 409);
    return fail("INTERNAL_ERROR", "No fue posible crear el plan", 500);
  }
}
