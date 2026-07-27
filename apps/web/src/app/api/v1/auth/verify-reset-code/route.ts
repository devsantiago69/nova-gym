import { createHash } from "node:crypto";
import { prisma } from "@gymchallenge/database";
import { fail, ok } from "@/lib/api-response";
import { rateLimit, requestIp, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ipAddress = requestIp(request);

  const limit = await rateLimit({
    scope: "verify-reset-code",
    identifier: ipAddress,
    limit: 10,
    windowSeconds: 60 * 15,
  });
  if (!limit.allowed) return tooManyRequests(limit);

  const body = await request.json().catch(() => null) as { identifier?: string; code?: string } | null;
  const identifier = body?.identifier?.trim();
  const code = body?.code?.trim();

  if (!identifier || !code) {
    return fail("VALIDATION_ERROR", "Ingresa tu usuario y el código recibido.", 422);
  }

  if (code.length < 4 || code.length > 8) {
    return fail("VALIDATION_ERROR", "El código debe tener 4 dígitos.", 422, "code");
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { username: identifier },
        { email: identifier },
      ],
    },
    select: {
      id: true,
      passwordResetTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, code: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const token = user?.passwordResetTokens[0];
  if (!user || !token) {
    return fail(
      "INVALID_CODE",
      "El código es inválido o ya expiró. Solicita uno nuevo.",
      400,
    );
  }

  // Rate limit code attempts: max 5 per token
  const attempts = await prisma.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
    },
  });

  if (attempts > 5) {
    return fail(
      "CODE_RATE_LIMITED",
      "Demasiados intentos. Espera unos minutos y solicita un código nuevo.",
      429,
    );
  }

  if (token.code !== code) {
    return fail(
      "INVALID_CODE",
      "El código es incorrecto. Intenta nuevamente.",
      400,
      "code",
    );
  }

  // Generate a secure reset token URL
  const resetToken = crypto.randomUUID();
  const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");

  // Store the hash linked to the existing code token (reuse same record)
  await prisma.passwordResetToken.update({
    where: { id: token.id },
    data: {
      tokenHash: resetTokenHash,
      expiresAt: new Date(Date.now() + 30 * 60_000), // 30 min to complete reset
    },
  });

  const resetUrl = `https://gym.dotaly.io/restablecer-contrasena?token=${resetToken}`;

  return ok({
    resetUrl,
    expiresIn: 30 * 60,
  }, "Código verificado. Ya puedes establecer tu nueva contraseña.");
}
