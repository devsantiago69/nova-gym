import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { StoriesBar, type StoryItem } from "@/components/stories/stories-bar";
import { authOptions } from "@/lib/auth";
import { resolveAppLocale } from "@/lib/i18n/locale";
import { activePlanEntitlements } from "@/modules/plans/entitlements";
import { canChooseAttendancePhotoFromDevice } from "@/modules/plans/attendance-photo-policy";

function dateInTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const [rows, profile, sharedEvents, currentUser, activePlan, restDays, activeChallengeMemberships] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId },
      include: {
        photos: { select: { id: true, type: true } },
        pointMovements: { select: { amount: true } },
      },
      orderBy: { localDate: "desc" },
      take: 370,
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
        firstName: true,
        timezone: true,
        locale: true,
        localeAuto: true,
        storyDurationSeconds: true,
        avatarKey: true,
        attendanceLocationEnabled: true,
      },
    }),
    prisma.challengeScoreEvent.findMany({
      where: {
        userId: { not: userId },
        challenge: {
          status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
          participants: { some: { userId, acceptedAt: { not: null } } },
        },
        attendance: {
          status: "COMPLETED",
          invalidatedAt: null,
          challengeReviews: { some: { reviewerId: userId } },
        },
      },
      select: {
        attendanceId: true,
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                storyDurationSeconds: true,
                avatarKey: true,
              },
            },
          },
        },
        challenge: { select: { id: true, name: true } },
        attendance: {
          select: {
            startedAt: true,
            durationMinutes: true,
            photos: {
              select: { id: true, type: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { username: true },
    }),
    activePlanEntitlements(userId),
    prisma.challengeRestDay.findMany({
      where: { userId },
      select: { localDate: true },
      distinct: ["localDate"],
      orderBy: { localDate: "desc" },
      take: 370,
    }),
    prisma.challengeParticipant.findMany({
      where: {
        userId,
        acceptedAt: { not: null },
        challenge: { status: "ACTIVE", startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
      },
      select: {
        challenge: {
          select: {
            restDaysAllowed: true,
            restDays: { where: { userId }, select: { id: true } },
          },
        },
      },
    }),
  ]);
  const timezone = profile?.timezone ?? "America/Bogota";
  const locale = resolveAppLocale({
    locale: profile?.locale ?? null,
    localeAuto: profile?.localeAuto ?? true,
    timezone,
  });
  const storyDurationSeconds = profile?.storyDurationSeconds ?? 10;
  const ownName = profile?.firstName ?? currentUser.username;
  const ownStories: StoryItem[] = rows
    .filter((row) => row.status === "COMPLETED")
    .slice(0, 12)
    .map((row) => ({
      id: `own-${row.id}`,
      attendanceId: row.id,
      ownerName: ownName,
      username: currentUser.username,
      avatarUrl: profile?.avatarKey
        ? `/api/v1/profile/avatar/${userId}`
        : undefined,
      isOwn: true,
      photos: row.photos,
      durationMinutes: row.durationMinutes,
      createdAt: row.localDate.toISOString(),
      storyDurationSeconds,
    }));
  const sharedMap = new Map<string, StoryItem>();
  for (const event of sharedEvents) {
    if (!event.attendanceId || !event.attendance) continue;
    if (sharedMap.has(event.attendanceId)) continue;
    const ownerName =
      `${event.user.profile?.firstName ?? ""} ${event.user.profile?.lastName ?? ""}`.trim() ||
      event.user.username;
    sharedMap.set(event.attendanceId, {
      id: `shared-${event.attendanceId}`,
      attendanceId: event.attendanceId,
      challengeId: event.challenge.id,
      challengeName: event.challenge.name,
      ownerName,
      username: event.user.username,
      avatarUrl: event.user.profile?.avatarKey
        ? `/api/v1/profile/avatar/${event.user.id}`
        : undefined,
      isOwn: false,
      photos: event.attendance.photos,
      durationMinutes: event.attendance.durationMinutes,
      createdAt: event.attendance.startedAt.toISOString(),
      storyDurationSeconds: event.user.profile?.storyDurationSeconds ?? 10,
    });
  }
  const stories = [...ownStories, ...sharedMap.values()].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return (
    <section>
      <p className="text-sm font-bold text-lime-400">MI ACTIVIDAD</p>
      <h1 className="mt-1 text-3xl font-black sm:text-4xl">Asistencia</h1>
      <p className="mb-4 mt-2 muted">
        Registra cada entrenamiento y revive historias de tus retos compartidos.
      </p>
      <StoriesBar items={stories} locale={locale} />
      <AttendanceManager
        locale={locale}
        storyDurationSeconds={storyDurationSeconds}
        locationEnabled={profile?.attendanceLocationEnabled === true}
        canChooseFromDevice={canChooseAttendancePhotoFromDevice(activePlan?.code)}
        planName={activePlan?.name ?? "Free"}
        initialRestDays={restDays.map((item) => item.localDate.toISOString().slice(0, 10))}
        restDaysRemaining={activeChallengeMemberships.length > 0 ? Math.min(...activeChallengeMemberships.map((item) => Math.max(0, item.challenge.restDaysAllowed - item.challenge.restDays.length))) : 0}
        hasActiveChallenges={activeChallengeMemberships.length > 0}
        todayKey={dateInTimezone(timezone)}
        initial={rows.map((row) => ({
          id: row.id,
          localDate: row.localDate.toISOString(),
          status: row.status,
          startedAt: row.startedAt.toISOString(),
          finishedAt: row.finishedAt?.toISOString() ?? null,
          durationMinutes: row.durationMinutes,
          timezone: row.timezone,
          startLatitude:
            row.startLatitude === null ? null : Number(row.startLatitude),
          startLongitude:
            row.startLongitude === null ? null : Number(row.startLongitude),
          startAccuracyMeters:
            row.startAccuracyMeters === null
              ? null
              : Number(row.startAccuracyMeters),
          endLatitude:
            row.endLatitude === null ? null : Number(row.endLatitude),
          endLongitude:
            row.endLongitude === null ? null : Number(row.endLongitude),
          endAccuracyMeters:
            row.endAccuracyMeters === null
              ? null
              : Number(row.endAccuracyMeters),
          photos: row.photos,
          pointMovements: row.pointMovements,
        }))}
      />
    </section>
  );
}
