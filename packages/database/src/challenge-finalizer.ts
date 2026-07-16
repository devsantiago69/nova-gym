import { Prisma, PrismaClient } from "@prisma/client";

type MetricRow = {
  userId: string;
  metric: number;
  targetReached: boolean;
  firstReachedAt: Date | null;
};
export type FinalOutcome = {
  userId: string;
  result: "WIN" | "LOSS" | "DRAW" | "COMPLETED" | "FAILED";
  position: number | null;
};

export function calculateChallengeOutcomes(
  modality: string,
  challengeType: string,
  rows: MetricRow[],
): FinalOutcome[] {
  if (modality === "SOLO")
    return rows.map((row) => ({
      userId: row.userId,
      result: row.targetReached ? "COMPLETED" : "FAILED",
      position: row.targetReached ? 1 : null,
    }));
  if (
    challengeType === "REACH_TARGET" ||
    challengeType === "ACCUMULATED_AMOUNT"
  )
    return rows.map((row) => ({
      userId: row.userId,
      result: row.targetReached ? "WIN" : "LOSS",
      position: row.targetReached ? 1 : null,
    }));
  if (challengeType === "FIRST_TO_TARGET") {
    const reached = rows
      .filter((row) => row.targetReached && row.firstReachedAt)
      .sort(
        (a, b) => a.firstReachedAt!.getTime() - b.firstReachedAt!.getTime(),
      );
    const winner = reached[0];
    return rows.map((row) => ({
      userId: row.userId,
      result: winner && row.userId === winner.userId ? "WIN" : "LOSS",
      position: winner && row.userId === winner.userId ? 1 : null,
    }));
  }
  const best = Math.max(0, ...rows.map((row) => row.metric));
  const winners = rows.filter((row) => row.metric === best);
  return rows.map((row) => ({
    userId: row.userId,
    result:
      row.metric === best ? (winners.length > 1 ? "DRAW" : "WIN") : "LOSS",
    position:
      row.metric === best
        ? 1
        : 1 + rows.filter((other) => other.metric > row.metric).length,
  }));
}

function bestStreak(values: Date[]) {
  const days = [
    ...new Set(values.map((value) => value.toISOString().slice(0, 10))),
  ].sort();
  let best = 0,
    current = 0,
    previous: number | null = null;
  for (const day of days) {
    const timestamp = new Date(`${day}T00:00:00.000Z`).getTime();
    current =
      previous !== null && timestamp - previous === 86_400_000
        ? current + 1
        : 1;
    best = Math.max(best, current);
    previous = timestamp;
  }
  return best;
}

type Snapshot = {
  challengeType?: string;
  completionBonus?: number;
  winnerBonus?: number;
  scoringRules?: { completionBonus?: number; winnerBonus?: number };
};

export async function finalizeExpiredChallenges(
  prisma: PrismaClient,
  now = new Date(),
) {
  const expired = await prisma.challenge.findMany({
    where: { status: "ACTIVE", endsAt: { lte: now } },
    select: { id: true },
    orderBy: { endsAt: "asc" },
    take: 100,
  });
  let finalized = 0;
  for (const { id } of expired) {
    const closed = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`challenge-finalize:${id}`}))`;
        const challenge = await tx.challenge.findFirst({
          where: { id, status: "ACTIVE", endsAt: { lte: now } },
          include: {
            ruleSnapshot: true,
            participants: true,
            completions: {
              where: { status: "VALID" },
              orderBy: { occurredAt: "asc" },
            },
            scoreEvents: { orderBy: { createdAt: "asc" } },
          },
        });
        if (!challenge) return false;
        const snapshot = (challenge.ruleSnapshot?.rules ?? {}) as Snapshot;
        const type = snapshot.challengeType ?? "REACH_TARGET";
        const numeric = ["NUMERIC_VALUE", "PHOTO_AND_VALUE"].includes(
          challenge.evidenceType,
        );
        const metrics = challenge.participants.map((participant) => {
          const completions = challenge.completions.filter(
            (item) => item.userId === participant.userId,
          );
          const attendanceEvents = challenge.scoreEvents.filter(
            (item) => item.userId === participant.userId && item.attendanceId,
          );
          const accumulated = completions.reduce(
            (sum, item) =>
              sum +
              (item.numericValue === null ? 0 : Number(item.numericValue)),
            0,
          );
          const metric = numeric
            ? accumulated
            : challenge.targetUnit === "attendances"
              ? new Set(attendanceEvents.map((item) => item.attendanceId)).size
              : completions.length;
          let cumulative = 0;
          let firstReachedAt: Date | null = null;
          for (const item of completions) {
            cumulative += numeric ? Number(item.numericValue ?? 0) : 1;
            if (cumulative >= challenge.targetValue) {
              firstReachedAt = item.occurredAt;
              break;
            }
          }
          if (
            !numeric &&
            challenge.targetUnit === "attendances" &&
            attendanceEvents.length >= challenge.targetValue
          )
            firstReachedAt =
              attendanceEvents[challenge.targetValue - 1]?.createdAt ?? null;
          return {
            participant,
            userId: participant.userId,
            completions: completions.length,
            accumulated,
            metric,
            targetReached: metric >= challenge.targetValue,
            firstReachedAt,
            bestStreak: bestStreak(completions.map((item) => item.logicalDate)),
          };
        });
        const outcomes = calculateChallengeOutcomes(
          challenge.modality,
          type,
          metrics,
        );
        const completionBonus =
          snapshot.scoringRules?.completionBonus ??
          snapshot.completionBonus ??
          0;
        const winnerBonus =
          snapshot.scoringRules?.winnerBonus ?? snapshot.winnerBonus ?? 0;
        for (const stats of metrics) {
          const outcome = outcomes.find(
            (item) => item.userId === stats.userId,
          )!;
          const bonus =
            (stats.targetReached ? completionBonus : 0) +
            (outcome.result === "WIN" ? winnerBonus : 0);
          if (stats.targetReached && completionBonus > 0)
            await tx.challengeScoreEvent.createMany({
              data: [
                {
                  challengeId: id,
                  userId: stats.userId,
                  points: completionBonus,
                  idempotencyKey: `challenge:${id}:completion-bonus:user:${stats.userId}`,
                },
              ],
              skipDuplicates: true,
            });
          if (outcome.result === "WIN" && winnerBonus > 0)
            await tx.challengeScoreEvent.createMany({
              data: [
                {
                  challengeId: id,
                  userId: stats.userId,
                  points: winnerBonus,
                  idempotencyKey: `challenge:${id}:winner-bonus:user:${stats.userId}`,
                },
              ],
              skipDuplicates: true,
            });
          const scoreEvents = await tx.challengeScoreEvent.findMany({
            where: { challengeId: id, userId: stats.userId },
            include: {
              attendance: {
                select: {
                  challengeReviews: {
                    where: { challengeId: id, verdict: "REJECTED" },
                    select: { id: true },
                  },
                },
              },
            },
          });
          const points = scoreEvents.reduce(
            (total, event) =>
              total +
              (!event.attendance ||
              event.attendance.challengeReviews.length === 0
                ? event.points
                : 0),
            0,
          );
          await tx.challengeParticipant.update({
            where: { id: stats.participant.id },
            data: { score: points, result: outcome.result },
          });
          await tx.challengeResultRecord.upsert({
            where: { participantId: stats.participant.id },
            create: {
              challengeId: id,
              participantId: stats.participant.id,
              userId: stats.userId,
              position: outcome.position,
              result: outcome.result,
              completions: stats.completions,
              points,
              accumulatedValue: stats.accumulated,
              bestStreak: stats.bestStreak,
              targetReached: stats.targetReached,
              bonusPoints: bonus,
              algorithmVersion: 1,
              rules: (challenge.ruleSnapshot?.rules ??
                {}) as Prisma.InputJsonValue,
            },
            update: {
              position: outcome.position,
              result: outcome.result,
              completions: stats.completions,
              points,
              accumulatedValue: stats.accumulated,
              bestStreak: stats.bestStreak,
              targetReached: stats.targetReached,
              bonusPoints: bonus,
              calculatedAt: now,
              algorithmVersion: 1,
              rules: (challenge.ruleSnapshot?.rules ??
                {}) as Prisma.InputJsonValue,
            },
          });
          await tx.notification.create({
            data: {
              userId: stats.userId,
              type: "CHALLENGE_COMPLETED",
              title:
                outcome.result === "COMPLETED" || outcome.result === "WIN"
                  ? "¡Reto completado!"
                  : "Tu reto llegó al final",
              body: `${challenge.name}: ${stats.metric} de ${challenge.targetValue} ${challenge.targetUnit}.`,
              href: `/retos?challenge=${id}`,
              data: {
                challengeId: id,
                result: outcome.result,
                metric: stats.metric,
                target: challenge.targetValue,
              },
              dedupeKey: `challenge-finalized:${id}:${stats.userId}`,
            },
          });
        }
        await tx.challenge.update({
          where: { id },
          data: { status: "COMPLETED" },
        });
        await tx.auditLog.create({
          data: {
            action: "CHALLENGE_FINALIZED",
            entityType: "Challenge",
            entityId: id,
            correlationId: crypto.randomUUID(),
            newValues: { algorithmVersion: 1, participants: metrics.length },
          },
        });
        return true;
      },
      { maxWait: 5000, timeout: 20000 },
    );
    if (closed) finalized++;
  }
  return { scanned: expired.length, finalized };
}
