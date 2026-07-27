import type { Prisma } from "@gymchallenge/database";
import { grantXp } from "@/modules/gamification/xp";
import { XP_CHALLENGE_COMPLETED } from "@/modules/gamification/constants";

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
) {
  const targetScore = input.targetValue * Math.max(1, input.pointsPerCompletion);
  if (input.score < targetScore) return;
  await grantXp(tx, {
    userId: input.userId,
    amount: XP_CHALLENGE_COMPLETED,
    type: "CHALLENGE_COMPLETED",
    sourceType: "Challenge",
    sourceId: input.challengeId,
    description: `Meta alcanzada en "${input.challengeName}"`,
    idempotencyKey: `xp:challenge:${input.challengeId}:${input.userId}:completed`,
  });
}
