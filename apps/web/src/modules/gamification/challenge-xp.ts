import type { Prisma } from "@gymchallenge/database";
import { grantXp } from "@/modules/gamification/xp";
import { xpValue, XP_CHALLENGE_COMPLETED_DEFAULT } from "@/modules/gamification/constants";

export async function grantChallengeCompletionXpIfNeeded(
  tx: Prisma.TransactionClient,
  input: {
    challengeId: string;
    userId: string;
    challengeName: string;
    targetValue: number;
    pointsPerCompletion: number;
    score: number;
  },
): Promise<{ granted: boolean; xpAwarded: number }> {
  const targetScore = input.targetValue * Math.max(1, input.pointsPerCompletion);
  if (input.score < targetScore) return { granted: false, xpAwarded: 0 };
  const challengeXp = await xpValue("xp_challenge_completed", XP_CHALLENGE_COMPLETED_DEFAULT);
  const result = await grantXp(tx, {
    userId: input.userId,
    amount: challengeXp,
    type: "CHALLENGE_COMPLETED",
    sourceType: "Challenge",
    sourceId: input.challengeId,
    description: `Meta alcanzada en "${input.challengeName}"`,
    idempotencyKey: `xp:challenge:${input.challengeId}:${input.userId}:completed`,
  });
  return { granted: result.granted, xpAwarded: result.granted ? challengeXp : 0 };
}
