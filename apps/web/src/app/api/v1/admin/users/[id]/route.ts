import argon2 from "argon2";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

const optionalText = (minimum: number, maximum: number) => z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(minimum).max(maximum).optional());
const schema = z.object({
  firstName: optionalText(2, 100),
  lastName: optionalText(2, 100),
  username: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/).optional()),
  email: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().toLowerCase().email().optional()),
  whatsappNumber: z.preprocess((value) => value === "" ? null : value, z.string().regex(/^\+[1-9]\d{7,14}$/).nullable().optional()),
  role: z.enum(["ADMIN", "USER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_PASSWORD_CHANGE"]).optional(),
  planId: z.string().uuid().optional(),
  password: z.preprocess((value) => value === "" ? undefined : value, z.string().min(12).max(128).optional()),
  forcePasswordChange: z.boolean().default(true),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return fail("FORBIDDEN", "No tienes permisos", 403);
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);

  const target = await prisma.user.findUnique({ where: { id }, include: { profile: true, subscriptions: { where: { status: "ACTIVE" }, take: 1 } } });
  if (!target || target.deletedAt) return fail("USER_NOT_FOUND", "El usuario no existe", 404);
  if (target.id === session.user.id && ((parsed.data.status && parsed.data.status !== "ACTIVE") || parsed.data.role === "USER")) return fail("SELF_LOCKOUT", "No puedes quitarte tus propios permisos ni desactivar tu cuenta", 409);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const nextStatus = parsed.data.password && parsed.data.forcePasswordChange ? "PENDING_PASSWORD_CHANGE" : parsed.data.status;
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(parsed.data.username ? { username: parsed.data.username } : {}),
          ...(parsed.data.email ? { email: parsed.data.email } : {}),
          ...(parsed.data.whatsappNumber !== undefined ? { whatsappNumber: parsed.data.whatsappNumber } : {}),
          ...(parsed.data.role ? { role: parsed.data.role } : {}),
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(parsed.data.password ? { passwordHash: await argon2.hash(parsed.data.password, { type: argon2.argon2id }), passwordChangedAt: parsed.data.forcePasswordChange ? null : new Date(), failedLoginAttempts: 0, lockedUntil: null } : {}),
          ...((parsed.data.firstName || parsed.data.lastName) ? { profile: { upsert: { create: { firstName: parsed.data.firstName ?? "Usuario", lastName: parsed.data.lastName ?? "Nova Gym" }, update: { ...(parsed.data.firstName ? { firstName: parsed.data.firstName } : {}), ...(parsed.data.lastName ? { lastName: parsed.data.lastName } : {}) } } } } : {}),
        },
      });
      if (parsed.data.planId && target.subscriptions[0]?.planId !== parsed.data.planId) {
        const plan = await tx.plan.findUnique({ where: { id: parsed.data.planId } });
        if (!plan || plan.status !== "ACTIVE") throw new Error("PLAN_NOT_FOUND");
        await tx.subscription.updateMany({ where: { userId: id, status: "ACTIVE" }, data: { status: "CANCELED", endsAt: new Date() } });
        await tx.subscription.create({ data: { userId: id, planId: plan.id, endsAt: plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 86_400_000) : null } });
      }
      if ((nextStatus && nextStatus !== "ACTIVE") || parsed.data.password) await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "USER_UPDATED", entityType: "User", entityId: id, correlationId: crypto.randomUUID(), previousValues: { username: target.username, email: target.email, role: target.role, status: target.status, planId: target.subscriptions[0]?.planId ?? null }, newValues: { ...parsed.data, password: parsed.data.password ? "[RESET]" : undefined } } });
      return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, email: true, username: true, whatsappNumber: true, role: true, status: true, createdAt: true, profile: { select: { firstName: true, lastName: true } }, subscriptions: { where: { status: "ACTIVE" }, select: { plan: { select: { id: true, name: true, code: true } } }, orderBy: { startsAt: "desc" }, take: 1 } } });
    });
    return ok(result, parsed.data.password ? "Usuario actualizado y contraseña restablecida" : "Usuario actualizado");
  } catch (error) {
    if (error instanceof Error && error.message === "PLAN_NOT_FOUND") return fail("PLAN_NOT_FOUND", "El plan seleccionado no está disponible", 404);
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") return fail("USER_ALREADY_EXISTS", "El usuario, correo o WhatsApp ya está registrado", 409);
    console.error("admin.users.update.failed", error instanceof Error ? error.message : "unknown");
    return fail("INTERNAL_ERROR", "No fue posible actualizar el usuario", 500);
  }
}
