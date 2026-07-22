import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

function localDate(timezone: string) {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${key}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { timezone: true },
  });
  const today = localDate(profile?.timezone ?? "America/Bogota");
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
            select: { id: true, name: true, restDaysAllowed: true },
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
        where: { challengeId: challenge.id, userId: session.user.id },
      }),
    })),
  );
  const exhausted = usages.find(
    ({ challenge, used }) =>
      pendingIds.has(challenge.id) && used >= challenge.restDaysAllowed,
  );
  if (exhausted)
    return fail(
      "REST_LIMIT_REACHED",
      `Ya utilizaste los ${exhausted.challenge.restDaysAllowed} descansos permitidos en “${exhausted.challenge.name}”.`,
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
            challenge.restDaysAllowed -
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
  const today = localDate(profile?.timezone ?? "America/Bogota");
  const result = await prisma.challengeRestDay.deleteMany({
    where: { userId: session.user.id, localDate: today },
  });
  if (result.count === 0)
    return fail("REST_NOT_FOUND", "Hoy no tienes un descanso activo", 404);
  return ok({ localDate: today.toISOString() }, "Descanso cancelado");
}
