import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { grantXp } from "@/modules/gamification/xp";
import { xpValue, AD_MIN_WATCH_SECONDS_DEFAULT, AD_XP_DAILY_LIMIT_DEFAULT, XP_AD_WATCH_DEFAULT } from "@/modules/gamification/constants";
import { createNotification } from "@/modules/notifications/service";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const userId = session.user.id;

  const body = await request.json().catch(() => null) as { slot?: unknown; watchedSeconds?: unknown } | null;
  const slot = typeof body?.slot === "string" ? body.slot.slice(0, 60) : "";
  const watchedSeconds = typeof body?.watchedSeconds === "number" ? body.watchedSeconds : 0;
  if (!slot) return fail("VALIDATION_ERROR", "Falta el identificador del anuncio", 422);
  const minWatchSeconds = await xpValue("ad_min_watch_seconds", AD_MIN_WATCH_SECONDS_DEFAULT);
  if (watchedSeconds < minWatchSeconds)
    return fail(
      "AD_NOT_WATCHED",
      "Debes ver el anuncio completo antes de reclamar tu recompensa",
      422,
    );

  const adXpDailyLimit = await xpValue("ad_xp_daily_limit", AD_XP_DAILY_LIMIT_DEFAULT);
  const limit = await rateLimit({
    scope: "ad-claim",
    identifier: userId,
    limit: adXpDailyLimit,
    windowSeconds: 86_400,
  });
  if (!limit.allowed) return tooManyRequests(limit);

  const adXp = await xpValue("xp_ad_watch", XP_AD_WATCH_DEFAULT);
  await prisma.adWatchEvent.create({
    data: { userId, slot, xpAmount: adXp, watchedSeconds },
  });
  await grantXp(prisma, {
    userId,
    amount: adXp,
    type: "AD_WATCHED",
    sourceType: "Ad",
    description: `Anuncio visto (${slot})`,
    idempotencyKey: `xp:ad:${userId}:${crypto.randomUUID()}`,
  });

  await createNotification({
    userId,
    type: "XP_EARNED",
    title: `+${adXp} XP`,
    body: "Gracias por apoyar Nova Gym con tu anuncio",
    href: "/perfil",
    dedupeKey: `xp:ad:notif:${userId}:${crypto.randomUUID()}`,
  });

  return ok(
    { xpAwarded: adXp, remainingToday: limit.remaining },
    "¡Gracias por apoyar Nova Gym! Sumaste XP.",
  );
}
