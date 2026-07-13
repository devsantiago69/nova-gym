import argon2 from "argon2";
import { prisma } from "@gymchallenge/database";
import { fail, ok } from "@/lib/api-response";
import { registerSchema } from "@/modules/auth/validators/register";

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const ipAddress = requestIp(request);
  const recent = await prisma.auditLog.count({ where: { action: "PUBLIC_USER_REGISTERED", ipAddress, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } });
  if (recent >= 10) return fail("REGISTER_RATE_LIMIT", "Se alcanzó el límite de registros. Intenta nuevamente en una hora.", 429);
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);
  const data = parsed.data;
  try {
    const user = await prisma.$transaction(async (tx) => {
      const plan = await tx.plan.findUnique({ where: { code: "FREE" } });
      if (!plan || plan.status !== "ACTIVE") throw new Error("FREE_PLAN_UNAVAILABLE");
      const created = await tx.user.create({
        data: {
          email: data.email ?? `${data.username}@members.novagym.local`,
          username: data.username,
          passwordHash: await argon2.hash(data.password, { type: argon2.argon2id }),
          role: "USER",
          status: "ACTIVE",
          whatsappNumber: data.whatsappNumber,
          countryCode: "+57",
          passwordChangedAt: new Date(),
          profile: { create: { firstName: data.firstName, lastName: data.lastName } },
          subscriptions: { create: { planId: plan.id, endsAt: plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86_400_000) : null } },
        },
        select: { id: true, username: true, profile: { select: { firstName: true, lastName: true } }, subscriptions: { include: { plan: { select: { name: true, trialDays: true } } }, take: 1 } },
      });
      await tx.auditLog.create({ data: { action: "PUBLIC_USER_REGISTERED", entityType: "User", entityId: created.id, correlationId: crypto.randomUUID(), ipAddress, userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null, newValues: { username: created.username, plan: plan.code } } });
      return created;
    }, { maxWait: 5000, timeout: 10000 });
    return ok(user, "Tu cuenta fue creada correctamente", 201);
  } catch (error) {
    if (error instanceof Error && error.message === "FREE_PLAN_UNAVAILABLE") return fail("PLAN_UNAVAILABLE", "El registro no está disponible temporalmente", 503);
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") return fail("ACCOUNT_EXISTS", "El usuario, correo o WhatsApp ya está registrado", 409);
    console.error("public.register.failed", error instanceof Error ? error.message : "unknown");
    return fail("INTERNAL_ERROR", "No fue posible crear la cuenta. Intenta nuevamente.", 500);
  }
}
