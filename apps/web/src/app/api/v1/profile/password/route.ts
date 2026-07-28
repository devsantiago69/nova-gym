import { getServerSession } from "next-auth";
import argon2 from "argon2";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { rateLimit, requestIp, tooManyRequests } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/modules/users/validators/user";
import { notifyPasswordChanged } from "@/modules/notifications/security-events";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id)
    return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);

  const ipAddress = requestIp(request);
  const limit = await rateLimit({
    scope: "password-change",
    identifier: `${session.user.id}:${ipAddress}`,
    limit: 8,
    windowSeconds: 15 * 60,
  });
  if (!limit.allowed) return tooManyRequests(limit);

  const parsed = changePasswordSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Datos inválidos",
      422,
    );

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !(await argon2.verify(user.passwordHash, parsed.data.currentPassword))) {
    await prisma.auditLog
      .create({
        data: {
          actorId: session.user.id,
          action: "PASSWORD_CHANGE_REJECTED",
          entityType: "User",
          entityId: session.user.id,
          correlationId: crypto.randomUUID(),
          ipAddress,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        },
      })
      .catch(() => undefined);
    return fail(
      "INVALID_CURRENT_PASSWORD",
      "La contraseña actual no es válida",
      400,
    );
  }

  const changedAt = new Date();
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await argon2.hash(parsed.data.newPassword, {
          type: argon2.argon2id,
        }),
        status: "ACTIVE",
        passwordChangedAt: changedAt,
      },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: user.id,
        correlationId: crypto.randomUUID(),
        ipAddress,
        userAgent,
        createdAt: changedAt,
      },
    }),
  ]);
  await notifyPasswordChanged(user.id, { ipAddress, userAgent, changedAt });
  return ok(null, "Contraseña actualizada correctamente");
}
