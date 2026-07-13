import { prisma } from "@gymchallenge/database";

export async function activePlanEntitlements(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      plan: { status: "ACTIVE" },
    },
    include: { plan: true },
    orderBy: { startsAt: "desc" },
  });
  return subscription?.plan ?? null;
}

export async function storageUsageBytes(userId: string) {
  const usage = await prisma.attendancePhoto.aggregate({ where: { ownerId: userId }, _sum: { sizeBytes: true } });
  return usage._sum.sizeBytes ?? 0;
}

export async function canStoreBytes(userId: string, incomingBytes: number) {
  const plan = await activePlanEntitlements(userId);
  if (!plan) return { allowed: false, plan: null, usedBytes: 0, limitBytes: 0 };
  const usedBytes = await storageUsageBytes(userId);
  const limitBytes = plan.storageLimitMb * 1024 * 1024;
  return { allowed: usedBytes + incomingBytes <= limitBytes, plan, usedBytes, limitBytes };
}

export async function acceptedFriendCount(userId: string) {
  return prisma.friendship.count({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });
}
