import { createHash } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "@gymchallenge/database";
import { fail, ok } from "@/lib/api-response";
import { rateLimit, requestIp, tooManyRequests } from "@/lib/rate-limit";
import { notifyPasswordChanged } from "@/modules/notifications/security-events";

export async function POST(request: Request) {
  const ipAddress = requestIp(request);

  const limit = await rateLimit({
    scope: "reset-password",
    identifier: ipAddress,
    limit: 10,
    windowSeconds: 60 * 30,
  });
  if (!limit.allowed) return tooManyRequests(limit);

  const body = await request.json().catch(() => null) as { token?: string; password?: string } | null;
  const token = body?.token?.trim();
  const password = body?.password;

  if (!token || !password) {
    return fail("VALIDATION_ERROR", "Token y contraseña son requeridos.", 422);
  }

  if (password.length < 12) {
    return fail(
      "VALIDATION_ERROR",
      "La contraseña debe tener al menos 12 caracteres.",
      422,
      "password",
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: {
        select: { id: true, status: true },
      },
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    return fail(
      "INVALID_TOKEN",
      "El enlace es inválido o ya expiró. Solicita uno nuevo.",
      400,
    );
  }

  if (resetToken.user.status === "INACTIVE" || resetToken.user.status === "SUSPENDED") {
    return fail(
      "ACCOUNT_UNAVAILABLE",
      "No es posible restablecer la contraseña de esta cuenta.",
      403,
    );
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const changedAt = new Date();
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        passwordChangedAt: changedAt,
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: "ACTIVE",
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: changedAt },
    });

    // Invalidate all other active reset tokens for this user
    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
        id: { not: resetToken.id },
      },
      data: { usedAt: changedAt },
    });

    await tx.auditLog.create({
      data: {
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "User",
        entityId: resetToken.userId,
        correlationId: crypto.randomUUID(),
        ipAddress,
        userAgent,
        createdAt: changedAt,
      },
    });
  });

  await notifyPasswordChanged(resetToken.userId, { ipAddress, userAgent, changedAt });

  return ok(null, "Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.");
}
