import Redis from "ioredis";
import { Prisma, type NotificationType } from "@prisma/client";
import { prisma } from "@gymchallenge/database";

const CHANNEL_PREFIX = "nova-gym:notifications:";
const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

type NotificationRecord = Prisma.NotificationGetPayload<{
  include: { actor: { select: { username: true; profile: { select: { firstName: true; lastName: true } } } } };
}>;

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  data: Prisma.JsonValue | null;
  readAt: string | null;
  createdAt: string;
  actor: { username: string; name: string } | null;
};

export type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  data?: Prisma.InputJsonValue;
  dedupeKey?: string | null;
};

declare global {
  var novaGymNotificationPublisher: Redis | undefined;
}

function publisher() {
  if (!globalThis.novaGymNotificationPublisher) {
    globalThis.novaGymNotificationPublisher = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    globalThis.novaGymNotificationPublisher.on("error", (error) => {
      console.error("[notifications] Redis publisher error", error.message);
    });
  }
  return globalThis.novaGymNotificationPublisher;
}

export function notificationChannel(userId: string) {
  return `${CHANNEL_PREFIX}${userId}`;
}

export function toNotificationDto(row: NotificationRecord): NotificationDto {
  const profile = row.actor?.profile;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    data: row.data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor ? { username: row.actor.username, name: fullName || row.actor.username } : null,
  };
}

async function publishNotification(userId: string, notification: NotificationDto) {
  try {
    const redis = publisher();
    if (redis.status === "wait") await redis.connect();
    if (redis.status === "ready") await redis.publish(notificationChannel(userId), JSON.stringify(notification));
  } catch (error) {
    // PostgreSQL remains the durable source. The client recovers missed events on its next sync.
    console.error("[notifications] Event persisted but realtime delivery failed", error);
  }
}

export async function createNotification(input: CreateNotificationInput) {
  if (input.actorId && input.actorId === input.userId) return null;
  try {
    const row = await prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        ...(input.data === undefined ? {} : { data: input.data }),
        dedupeKey: input.dedupeKey ?? null,
        createdAt: new Date(),
      },
      include: { actor: { select: { username: true, profile: { select: { firstName: true, lastName: true } } } } },
    });
    const dto = toNotificationDto(row);
    await publishNotification(input.userId, dto);
    return dto;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && input.dedupeKey) {
      return null;
    }
    throw error;
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  const results = await Promise.allSettled(inputs.map(createNotification));
  for (const result of results) {
    if (result.status === "rejected") console.error("[notifications] Could not create notification", result.reason);
  }
  return results;
}

export async function userDisplayName(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, profile: { select: { firstName: true, lastName: true } } } });
  if (!user) return "Un amigo";
  return user.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : `@${user.username}`;
}
