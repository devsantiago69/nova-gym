import { Prisma, prisma } from "@gymchallenge/database";

function dateInTimezone(value: Date, timezone: string) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
  return new Date(`${date}T00:00:00.000Z`);
}

function addUtcDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function syncChallengeProgressInTransaction(tx: Prisma.TransactionClient, challengeId: string) {
  const challenge = await tx.challenge.findUnique({
    where: { id: challengeId },
    include: {
      participants: { include: { user: { include: { profile: true } } } },
    },
  });
  if (!challenge || challenge.status !== "ACTIVE") return;

  for (const participant of challenge.participants) {
    const timezone = participant.user.profile?.timezone ?? "America/Bogota";
    const firstDay = dateInTimezone(challenge.startsAt, timezone);
    const dayAfterLast = addUtcDays(firstDay, challenge.durationDays);
    const attendances = await tx.attendance.findMany({
      where: {
        userId: participant.userId,
        status: "COMPLETED",
        invalidatedAt: null,
        localDate: { gte: firstDay, lt: dayAfterLast },
      },
      select: { id: true },
    });

    if (challenge.pointsPerCompletion > 0 && attendances.length > 0) {
      await tx.challengeScoreEvent.createMany({
        data: attendances.map((attendance) => ({
          challengeId: challenge.id,
          userId: participant.userId,
          attendanceId: attendance.id,
          points: challenge.pointsPerCompletion,
          idempotencyKey: `challenge:${challenge.id}:attendance:${attendance.id}:user:${participant.userId}`,
        })),
        skipDuplicates: true,
      });
    }

    const score = await challengeScoreForParticipant(tx, challenge.id, participant.userId);
    await tx.challengeParticipant.update({
      where: { id: participant.id },
      data: { score },
    });
  }
}

export async function challengeScoreForParticipant(tx: Prisma.TransactionClient, challengeId: string, userId: string) {
  const events = await tx.challengeScoreEvent.findMany({
    where: { challengeId, userId },
    select: {
      points: true,
      attendance: {
        select: {
          challengeReviews: {
            where: { challengeId, verdict: "REJECTED" },
            select: { id: true },
          },
        },
      },
    },
  });
  return events.reduce((total, event) => total + (!event.attendance || event.attendance.challengeReviews.length === 0 ? event.points : 0), 0);
}

export async function syncChallengeProgress(challengeId: string) {
  await prisma.$transaction((tx) => syncChallengeProgressInTransaction(tx, challengeId));
}

export async function syncUserActiveChallenges(userId: string) {
  const memberships = await prisma.challengeParticipant.findMany({
    where: { userId, challenge: { status: "ACTIVE" } },
    select: { challengeId: true },
  });
  for (const membership of memberships) await syncChallengeProgress(membership.challengeId);
}
