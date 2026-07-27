import { prisma } from "@gymchallenge/database";
import { computeStreak } from "@/modules/gamification/streak";

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
    streak: computeStreak(attendances.map((row) => row.localDate)).length,
    totalHours: Math.round(attendances.reduce((total, row) => total + (row.durationMinutes ?? 0), 0) / 60),
    globalPoints: globalPoints._sum.amount ?? 0,
    challengePoints: challengePoints._sum.score ?? 0,
    friends,
    activeChallenges,
  };
}
