import { prisma } from "@gymchallenge/database";

function currentStreak(dates: Date[]) {
  const days = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  const cursor = new Date(); cursor.setUTCHours(0, 0, 0, 0);
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0; while (days.has(cursor.toISOString().slice(0, 10))) { count += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return count;
}

export async function publicFitnessStats(userId: string) {
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [attendances, globalPoints, challengePoints, friends, activeChallenges] = await Promise.all([
    prisma.attendance.findMany({ where: { userId, status: "COMPLETED" }, select: { localDate: true, durationMinutes: true }, orderBy: { localDate: "desc" } }),
    prisma.pointLedger.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.challengeParticipant.aggregate({ where: { userId }, _sum: { score: true } }),
    prisma.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
    prisma.challengeParticipant.count({ where: { userId, challenge: { status: "ACTIVE" } } }),
  ]);
  return {
    attendances: attendances.length,
    monthAttendances: attendances.filter((row) => row.localDate >= monthStart).length,
    streak: currentStreak(attendances.map((row) => row.localDate)),
    totalHours: Math.round(attendances.reduce((total, row) => total + (row.durationMinutes ?? 0), 0) / 60),
    globalPoints: globalPoints._sum.amount ?? 0,
    challengePoints: challengePoints._sum.score ?? 0,
    friends,
    activeChallenges,
  };
}
