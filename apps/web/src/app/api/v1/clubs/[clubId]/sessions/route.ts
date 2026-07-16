import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { activeClubMembership } from "@/modules/clubs/access";
import { createClubSessionSchema } from "@/modules/clubs/session-schema";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";

export async function POST(request: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId } = await params;
  const membership = await activeClubMembership(clubId, auth.user.id);
  if (!membership) return fail("FORBIDDEN", "Solo los integrantes pueden crear sesiones", 403);
  const parsed = createClubSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Revisa los datos", 422);
  const input = parsed.data;
  const training = await prisma.clubSession.create({
    data: {
      clubId,
      creatorId: auth.user.id,
      title: input.title,
      description: input.description || null,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      placeName: input.placeName,
      address: input.address || null,
      ...(input.latitude === undefined ? {} : { latitude: input.latitude }),
      ...(input.longitude === undefined ? {} : { longitude: input.longitude }),
      capacity: input.capacity,
      participants: { create: { userId: auth.user.id, status: "GOING", joinedAt: new Date() } },
    },
  });
  const [members, actorName] = await Promise.all([
    prisma.clubMembership.findMany({ where: { clubId, status: "ACTIVE", userId: { not: auth.user.id } }, select: { userId: true } }),
    userDisplayName(auth.user.id),
  ]);
  await createNotifications(members.map(({ userId }) => ({
    userId,
    actorId: auth.user.id,
    type: "CLUB_SESSION" as const,
    title: `Nuevo plan en ${membership.club.name}`,
    body: `${actorName} te invita a “${training.title}”. Confirma tu cupo.`,
    href: `/clubes/${membership.club.slug}?tab=sessions`,
    data: { clubId, sessionId: training.id },
    dedupeKey: `club-session-created:${training.id}:${userId}`,
  })));
  return ok({ id: training.id }, "Sesión publicada. El club ya fue avisado", 201);
}
