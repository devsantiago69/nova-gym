import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { addDays, localDateInTimezone, weekRange } from "@/lib/week";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { timezone: true },
  });
  const timezone = profile?.timezone ?? "America/Bogota";
  const today = localDateInTimezone(timezone);
  const { start: weekStart, end: weekEnd } = weekRange(timezone);
  const now = new Date();
  const [attendance, activeMemberships, existingToday, adjacent] =
    await Promise.all([
      prisma.attendance.findUnique({
        where: {
          userId_localDate: { userId: session.user.id, localDate: today },
        },
        select: { id: true },
      }),
      prisma.challengeParticipant.findMany({
        where: {
          userId: session.user.id,
          acceptedAt: { not: null },
          challenge: {
            status: "ACTIVE",
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
        select: {
          challenge: {
            select: { id: true, name: true, restDaysPerWeek: true },
          },
        },
      }),
      prisma.challengeRestDay.findMany({
        where: { userId: session.user.id, localDate: today },
        select: { challengeId: true },
      }),
      prisma.challengeRestDay.findFirst({
        where: {
          userId: session.user.id,
          localDate: { in: [addDays(today, -1), addDays(today, 1)] },
        },
        select: { localDate: true },
      }),
    ]);

  if (attendance)
    return fail(
      "ATTENDANCE_ALREADY_EXISTS",
      "Hoy ya registraste un entrenamiento; no puedes convertirlo en descanso.",
      409,
    );
  if (activeMemberships.length === 0)
    return fail(
      "ACTIVE_CHALLENGE_REQUIRED",
      "Necesitas participar en al menos un reto activo para usar un descanso.",
      409,
    );
  if (adjacent)
    return fail(
      "CONSECUTIVE_REST_NOT_ALLOWED",
      "Los descansos no pueden tomarse en días consecutivos.",
      409,
    );

  const existingIds = new Set(existingToday.map((item) => item.challengeId));
  const pending = activeMemberships.filter(
    (item) => !existingIds.has(item.challenge.id),
  );
  const pendingIds = new Set(pending.map((item) => item.challenge.id));
  const usages = await Promise.all(
    activeMemberships.map(async ({ challenge }) => ({
      challenge,
      used: await prisma.challengeRestDay.count({
        where: {
          challengeId: challenge.id,
          userId: session.user.id,
          localDate: { gte: weekStart, lt: weekEnd },
        },
      }),
    })),
  );
  const exhausted = usages.find(
    ({ challenge, used }) =>
      pendingIds.has(challenge.id) && used >= challenge.restDaysPerWeek,
  );
  if (exhausted)
    return fail(
      "REST_LIMIT_REACHED",
      `Ya utilizaste los ${exhausted.challenge.restDaysPerWeek} descansos semanales de “${exhausted.challenge.name}”. Se renuevan el próximo lunes.`,
      409,
    );

  if (pending.length > 0) {
    await prisma.challengeRestDay.createMany({
      data: pending.map(({ challenge }) => ({
        challengeId: challenge.id,
        userId: session.user.id,
        localDate: today,
      })),
      skipDuplicates: true,
    });
  }

  return ok(
    {
      localDate: today.toISOString(),
      challenges: activeMemberships.length,
      remaining: Math.min(
        ...usages.map(({ challenge, used }) =>
          Math.max(
            0,
            challenge.restDaysPerWeek -
              used -
              (pendingIds.has(challenge.id) ? 1 : 0),
          ),
        ),
      ),
    },
    "Día de descanso activado. Tu recuperación también cuenta.",
    201,
  );
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { timezone: true },
  });
  const today = localDateInTimezone(profile?.timezone ?? "America/Bogota");
  const result = await prisma.challengeRestDay.deleteMany({
    where: { userId: session.user.id, localDate: today },
  });
  if (result.count === 0)
    return fail("REST_NOT_FOUND", "Hoy no tienes un descanso activo", 404);
  return ok({ localDate: today.toISOString() }, "Descanso cancelado");
}
