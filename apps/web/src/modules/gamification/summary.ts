import { prisma } from "@gymchallenge/database";
import { grantXp, totalXp, cachedLevels, levelForXp } from "@/modules/gamification/xp";
import { attendanceStreak } from "@/modules/gamification/streak";
import { rankOf } from "@/modules/gamification/leaderboard";
import { XP_DAILY_USAGE } from "@/modules/gamification/constants";

export async function gamificationSummary(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  await grantXp(prisma, {
    userId,
    amount: XP_DAILY_USAGE,
    type: "DAILY_USAGE",
    sourceType: "AppUsage",
    description: "Uso diario de la app",
    idempotencyKey: `xp:daily:${userId}:${today}`,
  });

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
