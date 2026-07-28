import { getServerSession } from "next-auth";
import { Prisma, prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { attendanceStreak } from "@/modules/gamification/streak";
import { grantXp } from "@/modules/gamification/xp";
import { xpValue, XP_STREAK_CLAIM_DEFAULT } from "@/modules/gamification/constants";
import { createNotification } from "@/modules/notifications/service";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const userId = session.user.id;

  const limit = await rateLimit({
    scope: "streak-claim",
    identifier: userId,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) return tooManyRequests(limit);

  const streak = await attendanceStreak(userId);
  const availableTier = Math.floor(streak.length / 2);
  if (availableTier < 1 || !streak.start)
    return fail(
      "NO_CLAIM_AVAILABLE",
      "Aún no tienes una recompensa de racha disponible",
      409,
    );

  const claimed = await prisma.streakClaim.findMany({
    where: { userId, streakStart: streak.start },
    select: { tier: true },
  });
  const claimedTiers = new Set(claimed.map((row) => row.tier));
  const pendingTiers = Array.from(
    { length: availableTier },
    (_, index) => index + 1,
  ).filter((tier) => !claimedTiers.has(tier));

  if (pendingTiers.length === 0)
    return fail(
      "ALREADY_CLAIMED",
      "Ya reclamaste la recompensa de esta racha",
      409,
    );

  const streakXp = await xpValue("xp_streak_claim", XP_STREAK_CLAIM_DEFAULT);
  const streakStart = streak.start;
  try {
    await prisma.$transaction(async (tx) => {
      for (const tier of pendingTiers) {
        await tx.streakClaim.create({
          data: {
            userId,
            tier,
            streakStart,
            xpAmount: streakXp,
          },
        });
        await grantXp(tx, {
          userId,
          amount: streakXp,
          type: "STREAK_CLAIM",
          sourceType: "Streak",
          description: `Racha de ${tier * 2} días`,
          idempotencyKey: `xp:streak:${userId}:${streakStart.toISOString().slice(0, 10)}:${tier}`,
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return fail(
        "ALREADY_CLAIMED",
        "Ya reclamaste la recompensa de esta racha",
        409,
      );
    throw error;
  }

  const totalAwarded = pendingTiers.length * streakXp;
  await createNotification({
    userId,
    type: "XP_EARNED",
    title: `+${totalAwarded} XP`,
    body: `Recompensa de racha reclamada: ${pendingTiers.length} ${pendingTiers.length === 1 ? "nivel" : "niveles"} de racha`,
    href: "/perfil",
    dedupeKey: `xp:streak:notif:${userId}:${streakStart.toISOString().slice(0, 10)}`,
  });

  return ok(
    {
      tiersClaimed: pendingTiers,
      xpAwarded: totalAwarded,
      streak: streak.length,
    },
    "¡Recompensa de racha reclamada!",
  );
}
