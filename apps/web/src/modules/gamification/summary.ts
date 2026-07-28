import { prisma } from "@gymchallenge/database";
import { grantXp, totalXp, cachedLevels, levelForXp } from "@/modules/gamification/xp";
import { attendanceStreak } from "@/modules/gamification/streak";
import { rankOf } from "@/modules/gamification/leaderboard";
import { xpValue, XP_DAILY_USAGE_DEFAULT } from "@/modules/gamification/constants";
import { createNotification } from "@/modules/notifications/service";

export async function gamificationSummary(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const dailyXp = await xpValue("xp_daily_usage", XP_DAILY_USAGE_DEFAULT);
  const dailyResult = await grantXp(prisma, {
    userId,
    amount: dailyXp,
    type: "DAILY_USAGE",
    sourceType: "AppUsage",
    description: "Uso diario de la app",
    idempotencyKey: `xp:daily:${userId}:${today}`,
  });

  if (dailyResult.granted) {
    await createNotification({
      userId,
      type: "XP_EARNED",
      title: `+${dailyXp} XP`,
      body: "Ganaste experiencia por usar la app hoy",
      href: "/perfil",
      dedupeKey: `xp:daily:notif:${userId}:${today}`,
    });
  }

  const [xpTotal, levels, streak, rank] = await Promise.all([
    totalXp(userId),
    cachedLevels(),
    attendanceStreak(userId),
    rankOf(userId),
  ]);

  const claimedTiers = streak.start
    ? (
        await prisma.streakClaim.findMany({
          where: { userId, streakStart: streak.start },
          select: { tier: true },
          orderBy: { tier: "asc" },
        })
      ).map((row) => row.tier)
    : [];
  const availableTier = Math.floor(streak.length / 2);
  const claimableTiers = Math.max(0, availableTier - claimedTiers.length);

  const { current, next, progress } = levelForXp(xpTotal, levels);

  // Detect streak loss
  if (streak.length === 0) {
    const lastAttendance = await prisma.attendance.findFirst({
      where: { userId, status: "COMPLETED" },
      select: { localDate: true },
      orderBy: { localDate: "desc" },
    });
    if (lastAttendance) {
      const lastDate = lastAttendance.localDate.toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
      if (lastDate < yesterday) {
        await createNotification({
          userId,
          type: "STREAK_LOST",
          title: "Racha perdida",
          body: lastDate === twoDaysAgo
            ? "Perdiste tu racha por un día. ¡No pares, vuelve a entrenar hoy!"
            : "Tu racha se interrumpió. Cada día cuenta, ¡entrena hoy!",
          href: "/perfil",
          dedupeKey: `streak:lost:${userId}:${lastDate}`,
        });
      }
    }
  }

  return {
    totalXp: xpTotal,
    level: current,
    nextLevel: next,
    progress,
    streak: {
      length: streak.length,
      claimableTiers,
      claimedTiers,
    },
    rank: rank.rank,
  };
}
