import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { toNotificationDto } from "@/modules/notifications/service";
import { notificationActionSchema } from "@/modules/notifications/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { actor: { select: { username: true, profile: { select: { firstName: true, lastName: true } } } } },
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);
  return ok({ notifications: rows.map(toNotificationDto), unreadCount });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = notificationActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Acción de notificación inválida", 422);
  const now = new Date();
  if (parsed.data.action === "read") {
    await prisma.notification.updateMany({ where: { id: parsed.data.id, userId: session.user.id, readAt: null }, data: { readAt: now } });
  } else {
    await prisma.notification.updateMany({ where: { userId: session.user.id, readAt: null }, data: { readAt: now } });
  }
  const unreadCount = await prisma.notification.count({ where: { userId: session.user.id, readAt: null } });
  return ok({ unreadCount });
}
