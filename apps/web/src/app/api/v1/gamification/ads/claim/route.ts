import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { grantXp } from "@/modules/gamification/xp";
import { AD_MIN_WATCH_SECONDS, AD_XP_DAILY_LIMIT, XP_AD_WATCH } from "@/modules/gamification/constants";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const userId = session.user.id;

  const body = await request.json().catch(() => null) as { slot?: unknown; watchedSeconds?: unknown } | null;
  const slot = typeof body?.slot === "string" ? body.slot.slice(0, 60) : "";
  const watchedSeconds = typeof body?.watchedSeconds === "number" ? body.watchedSeconds : 0;
  if (!slot) return fail("VALIDATION_ERROR", "Falta el identificador del anuncio", 422);
  if (watchedSeconds < AD_MIN_WATCH_SECONDS)
    return fail(
      "AD_NOT_WATCHED",
      "Debes ver el anuncio completo antes de reclamar tu recompensa",
      422,
    );

  const limit = await rateLimit({
    scope: "ad-claim",
    identifier: userId,
    limit: AD_XP_DAILY_LIMIT,
    windowSeconds: 86_400,
  });
  if (!limit.allowed) return tooManyRequests(limit);

  await prisma.adWatchEvent.create({
    data: { userId, slot, xpAmount: XP_AD_WATCH, watchedSeconds },
  });
  await grantXp(prisma, {
    userId,
    amount: XP_AD_WATCH,
    type: "AD_WATCHED",
    sourceType: "Ad",
    description: `Anuncio visto (${slot})`,
    idempotencyKey: `xp:ad:${userId}:${crypto.randomUUID()}`,
  });

  return ok(
    { xpAwarded: XP_AD_WATCH, remainingToday: limit.remaining },
    "¡Gracias por apoyar Nova Gym! Sumaste XP.",
  );
}
