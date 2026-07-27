import { createHash, randomInt } from "node:crypto";
import { prisma } from "@gymchallenge/database";
import { fail, ok } from "@/lib/api-response";
import { rateLimit, requestIp, tooManyRequests } from "@/lib/rate-limit";
import { sendResetCodeEmail, maskEmail } from "@/lib/email";

export async function POST(request: Request) {
  const ipAddress = requestIp(request);

  const limit = await rateLimit({
    scope: "forgot-password",
    identifier: ipAddress,
    limit: 5,
    windowSeconds: 60 * 15,
  });
  if (!limit.allowed) return tooManyRequests(limit);

  const body = await request.json().catch(() => null) as { identifier?: string } | null;
  const identifier = body?.identifier?.trim();
  if (!identifier || identifier.length < 3 || identifier.length > 255) {
    return fail(
      "VALIDATION_ERROR",
      "Ingresa tu usuario o correo electrónico.",
      422,
      "identifier",
    );
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
      email: true,
      username: true,
      status: true,
      passwordResetTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Always return success to prevent user enumeration
  if (!user || user.status === "INACTIVE" || user.status === "SUSPENDED") {
    return ok(
      null,
      "Si el usuario existe, recibirás un correo con las instrucciones.",
    );
  }

  // Throttle: max 1 active token per 60s
  const recentToken = user.passwordResetTokens[0];
  if (recentToken) {
    const elapsed = Date.now() - recentToken.createdAt.getTime();
    if (elapsed < 60_000) {
      return ok(
        null,
        "Si el usuario existe, recibirás un correo con las instrucciones.",
      );
    }
  }

  // Invalidate old tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = String(randomInt(1000, 10000));
  const rawToken = crypto.randomUUID();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      code,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60_000), // 1 hour
    },
  });

  const masked = maskEmail(user.email);

  try {
    await sendResetCodeEmail(user.email, code, masked);
  } catch (error) {
    console.error("forgot-password.email.failed", error instanceof Error ? error.message : "unknown");
    return fail(
      "EMAIL_SEND_FAILED",
      "No fue posible enviar el correo. Intenta nuevamente.",
      500,
    );
  }

  await prisma.auditLog.create({
    data: {
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
      correlationId: crypto.randomUUID(),
      ipAddress,
      newValues: { maskedEmail: masked },
    },
  });

  return ok({ maskedEmail: masked }, "Si el usuario existe, recibirás un correo con las instrucciones.");
}
