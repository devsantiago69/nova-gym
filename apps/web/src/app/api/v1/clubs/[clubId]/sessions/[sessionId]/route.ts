import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { activeClubMembership } from "@/modules/clubs/access";
import { clubSessionActionSchema } from "@/modules/clubs/session-schema";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";

export async function POST(request: Request, { params }: { params: Promise<{ clubId: string; sessionId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId, sessionId } = await params;
  const membership = await activeClubMembership(clubId, auth.user.id);
  if (!membership) return fail("FORBIDDEN", "Solo los integrantes pueden participar", 403);
  const parsed = clubSessionActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Acción no válida", 422);
  const training = await prisma.clubSession.findFirst({
    where: { id: sessionId, clubId },
    include: { participants: { where: { status: { in: ["GOING", "WAITLIST"] } }, select: { userId: true, status: true } } },
  });
  if (!training) return fail("NOT_FOUND", "Sesión no encontrada", 404);
  const action = parsed.data.action;
  if (action === "join") {
    if (training.status !== "SCHEDULED" || training.startsAt <= new Date()) return fail("SESSION_CLOSED", "Esta sesión ya cerró confirmaciones", 409);
    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "club_sessions" WHERE "id" = ${sessionId}::uuid FOR UPDATE`;
        const fresh = await tx.clubSession.findUniqueOrThrow({ where: { id: sessionId }, select: { capacity: true, status: true, startsAt: true } });
        if (fresh.status !== "SCHEDULED" || fresh.startsAt <= new Date()) throw new Error("SESSION_CLOSED");
        const going = await tx.clubSessionParticipant.count({ where: { sessionId, status: "GOING" } });
        const status = going < fresh.capacity ? "GOING" : "WAITLIST";
        await tx.clubSessionParticipant.upsert({
          where: { sessionId_userId: { sessionId, userId: auth.user.id } },
          create: { sessionId, userId: auth.user.id, status, joinedAt: new Date() },
          update: { status, joinedAt: new Date() },
        });
        return status;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await createNotifications([{ userId: training.creatorId, actorId: auth.user.id, type: "CLUB_SESSION", title: result === "GOING" ? "Nuevo compañero confirmado" : "Lista de espera activa", body: `${await userDisplayName(auth.user.id)} quiere entrenar contigo en “${training.title}”.`, href: `/clubes/${membership.club.slug}?tab=sessions`, data: { clubId, sessionId } }]);
      return ok({ status: result }, result === "GOING" ? "Tu cupo está confirmado" : "Quedaste en lista de espera");
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_CLOSED") return fail("SESSION_CLOSED", "Esta sesión ya cerró confirmaciones", 409);
      throw error;
    }
  }
  if (action === "leave") {
    if (training.creatorId === auth.user.id) return fail("CREATOR_CANNOT_LEAVE", "Cancela la sesión si ya no puedes asistir", 409);
    const promotedUserId = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "club_sessions" WHERE "id" = ${sessionId}::uuid FOR UPDATE`;
      const current = await tx.clubSessionParticipant.findUnique({ where: { sessionId_userId: { sessionId, userId: auth.user.id } } });
      if (!current || current.status === "CANCELED") return null;
      await tx.clubSessionParticipant.update({ where: { id: current.id }, data: { status: "CANCELED", joinedAt: null } });
      if (current.status !== "GOING") return null;
      const next = await tx.clubSessionParticipant.findFirst({ where: { sessionId, status: "WAITLIST" }, orderBy: { joinedAt: "asc" } });
      if (next) await tx.clubSessionParticipant.update({ where: { id: next.id }, data: { status: "GOING" } });
      return next?.userId ?? null;
    });
    if (promotedUserId) await createNotifications([{ userId: promotedUserId, type: "CLUB_SESSION", title: "¡Tu cupo está confirmado!", body: `Se liberó un lugar para “${training.title}”. Ya estás dentro.`, href: `/clubes/${membership.club.slug}?tab=sessions`, data: { clubId, sessionId } }]);
    return ok(null, "Liberaste tu cupo");
  }
  const canManage = training.creatorId === auth.user.id || ["OWNER", "ADMIN"].includes(membership.role);
  if (!canManage) return fail("FORBIDDEN", "No puedes administrar esta sesión", 403);
  if (training.status !== "SCHEDULED") return fail("SESSION_CLOSED", "Esta sesión ya fue cerrada", 409);
  if (action === "cancel") {
    await prisma.clubSession.update({ where: { id: sessionId }, data: { status: "CANCELED" } });
    await createNotifications(training.participants.filter(({ userId }) => userId !== auth.user.id).map(({ userId }) => ({ userId, actorId: auth.user.id, type: "CLUB_SESSION" as const, title: "Sesión cancelada", body: `“${training.title}” fue cancelada.`, href: `/clubes/${membership.club.slug}?tab=sessions`, data: { clubId, sessionId } })));
    return ok(null, "Sesión cancelada y participantes avisados");
  }
  await prisma.$transaction([
    prisma.clubSession.update({ where: { id: sessionId }, data: { status: "COMPLETED" } }),
    prisma.socialPost.create({
      data: {
        userId: auth.user.id,
        clubId,
        audience: "CLUB",
        type: "ACHIEVEMENT",
        content: `Sesión completada: ${training.title} · ${training.participants.filter(({ status }) => status === "GOING").length} integrantes entrenaron juntos.`,
      },
    }),
  ]);
  await createNotifications(training.participants.filter(({ userId, status }) => userId !== auth.user.id && status === "GOING").map(({ userId }) => ({ userId, actorId: auth.user.id, type: "CLUB_SESSION" as const, title: "Entrenamiento en equipo completado", body: `“${training.title}” ya forma parte de la historia del club.`, href: `/clubes/${membership.club.slug}`, data: { clubId, sessionId } })));
  return ok(null, "Sesión marcada como completada");
}
