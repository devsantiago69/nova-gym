import { prisma } from "@gymchallenge/database";
import { cachedLevels, levelForXp } from "@/modules/gamification/xp";

export async function topLeaderboard(limit = 50, offset = 0) {
  const grouped = await prisma.xpLedger.groupBy({
    by: ["userId"],
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    skip: offset,
    take: limit,
  });
  const userIds = grouped.map((row) => row.userId);
  const [users, levels] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        profile: { select: { firstName: true, lastName: true, avatarKey: true } },
      },
    }),
    cachedLevels(),
  ]);
  const userMap = new Map(users.map((user) => [user.id, user]));
  return grouped.map((row, index) => {
    const user = userMap.get(row.userId);
    const totalXp = row._sum.amount ?? 0;
    const { current } = levelForXp(totalXp, levels);
    return {
      rank: offset + index + 1,
      userId: row.userId,
      username: user?.username ?? "usuario",
      name: user?.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
        : (user?.username ?? "Usuario"),
      avatarKey: user?.profile?.avatarKey ?? null,
      totalXp,
      level: current,
    };
  });
}

export async function rankOf(userId: string) {
  const grouped = await prisma.xpLedger.groupBy({
    by: ["userId"],
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  const index = grouped.findIndex((row) => row.userId === userId);
  if (index === -1) return { rank: grouped.length + 1, totalXp: 0 };
  return { rank: index + 1, totalXp: grouped[index]!._sum.amount ?? 0 };
}
