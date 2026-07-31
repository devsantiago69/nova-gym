import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { createNotifications } from "@/modules/notifications/service";

const broadcastSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "Elige al menos un destinatario"),
  title: z.string().trim().min(1, "Escribe un título").max(140),
  body: z.string().trim().min(1, "Escribe un mensaje").max(500),
  href: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN")
    return fail("FORBIDDEN", "Solo administradores pueden enviar notificaciones", 403);

  const parsed = broadcastSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Revisa los datos", 422);

  const { userIds, title, body, href } = parsed.data;

  await createNotifications(
    userIds.map((userId) => ({
      userId,
      actorId: session.user.id,
      type: "SYSTEM" as const,
      title,
      body,
      href: href ?? null,
    })),
  );

  return ok({ sent: userIds.length }, `Notificación enviada a ${userIds.length} ${userIds.length === 1 ? "usuario" : "usuarios"}`);
}
