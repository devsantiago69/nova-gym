import { Prisma, prisma, type LevelDefinition, type XpMovementType } from "@gymchallenge/database";

type XpClient = typeof prisma | Prisma.TransactionClient;

export async function grantXp(
  client: XpClient,
  input: {
    userId: string;
    amount: number;
    type: XpMovementType;
    sourceType: string;
    sourceId?: string;
    description?: string;
    logicalDate?: Date;
    actorId?: string;
    idempotencyKey: string;
  },
) {
  try {
    const row = await client.xpLedger.create({
      data: {
        userId: input.userId,
        amount: input.amount,
        type: input.type,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        description: input.description ?? null,
        logicalDate: input.logicalDate ?? null,
        actorId: input.actorId ?? null,
        idempotencyKey: input.idempotencyKey,
      },
    });
    return { granted: true as const, row };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { granted: false as const, row: undefined };
    }
    throw error;
  }
}

export async function totalXp(userId: string) {
  const result = await prisma.xpLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function totalXpForUsers(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, number>();
  const rows = await prisma.xpLedger.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { amount: true },
  });
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.userId, row._sum.amount ?? 0);
  return totals;
}

export function levelForXp(xpTotal: number, levels: LevelDefinition[]) {
  const sorted = [...levels].sort((a, b) => a.xpThreshold - b.xpThreshold);
  let current = sorted[0];
  let next: LevelDefinition | null = null;
  for (let index = 0; index < sorted.length; index += 1) {
    const level = sorted[index]!;
    if (level.xpThreshold <= xpTotal) {
      current = level;
      next = sorted[index + 1] ?? null;
    } else {
      next = level;
      break;
    }
  }
  if (!current) {
    return { current: null, next: null, progress: 0 };
  }
  const progress = next
    ? Math.min(
        1,
        Math.max(0, (xpTotal - current.xpThreshold) / (next.xpThreshold - current.xpThreshold)),
      )
    : 1;
  return { current, next, progress };
}

let levelsCache: { value: LevelDefinition[]; expiresAt: number } | undefined;

export async function cachedLevels() {
  const now = Date.now();
  if (levelsCache && levelsCache.expiresAt > now) return levelsCache.value;
  const value = await prisma.levelDefinition.findMany({ orderBy: { level: "asc" } });
  levelsCache = { value, expiresAt: now + 60_000 };
  return value;
}
