import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { DomainError } from "@gymchallenge/domain";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { putPrivateObject } from "@/lib/private-storage";
import { normalizeAttendanceImage } from "@/modules/attendance/image";
import { syncChallengeProgressInTransaction } from "@/modules/challenges/sync-progress";
import { canStoreBytes } from "@/modules/plans/entitlements";
import {
  createNotifications,
  userDisplayName,
} from "@/modules/notifications/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  try {
    const { id } = await params;
    const attendance = await prisma.attendance.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!attendance) return fail("NOT_FOUND", "Asistencia no encontrada", 404);
    if (attendance.status !== "IN_PROGRESS")
      return fail(
        "ALREADY_FINISHED",
        "Este entrenamiento ya fue finalizado",
        409,
      );
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File))
      throw new DomainError(
        "PHOTO_REQUIRED",
        "La fotografía final es obligatoria",
      );
    const latitude = Number(form.get("latitude"));
    const longitude = Number(form.get("longitude"));
    const accuracy = Number(form.get("accuracy"));
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    )
      throw new DomainError(
        "LOCATION_REQUIRED",
        "Debes permitir una ubicación válida",
      );
    const now = new Date();
    const duration = Math.floor(
      (now.getTime() - attendance.startedAt.getTime()) / 60_000,
    );
    if (duration < 15)
      return fail(
        "MINIMUM_DURATION",
        `Debes entrenar al menos 15 minutos. Llevas ${duration}.`,
        422,
      );
    const image = await normalizeAttendanceImage(file);
    const storage = await canStoreBytes(session.user.id, image.size);
    if (!storage.plan)
      return fail(
        "PLAN_REQUIRED",
        "Necesitas un plan activo para guardar evidencias",
        403,
      );
    if (!storage.allowed)
      return fail(
        "STORAGE_LIMIT_REACHED",
        `Alcanzaste los ${storage.plan.storageLimitMb} MB de almacenamiento de tu plan`,
        409,
      );
    const key = `attendance/${session.user.id}/${attendance.id}/end.webp`;
    await putPrivateObject(key, image.body, image.mimeType);
    const completed = await prisma.$transaction(async (tx) => {
      await tx.attendancePhoto.create({
        data: {
          attendanceId: id,
          ownerId: session.user.id,
          type: "END",
          objectKey: key,
          mimeType: image.mimeType,
          sizeBytes: image.size,
          checksum: image.checksum,
          width: image.width,
          height: image.height,
        },
      });
      const row = await tx.attendance.update({
        where: { id },
        data: {
          status: "COMPLETED",
          finishedAt: now,
          durationMinutes: duration,
          endLatitude: latitude,
          endLongitude: longitude,
          endAccuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
        },
      });
      const previousDailyPoint = await tx.pointLedger.findFirst({
        where: {
          userId: session.user.id,
          logicalDate: attendance.localDate,
          type: "ATTENDANCE_EARNED",
        },
      });
      if (
        previousDailyPoint?.attendanceId &&
        previousDailyPoint.attendanceId !== id
      ) {
        throw new DomainError(
          "DAILY_ATTENDANCE_EXISTS",
          "Ya existe otra asistencia válida para este día",
        );
      }
      if (previousDailyPoint) {
        await tx.pointLedger.update({
          where: { id: previousDailyPoint.id },
          data: {
            attendanceId: id,
            sourceId: id,
            description: "Asistencia completada",
            idempotencyKey: `attendance:${id}:earned`,
          },
        });
      } else {
        await tx.pointLedger.create({
          data: {
            userId: session.user.id,
            attendanceId: id,
            amount: 1,
            type: "ATTENDANCE_EARNED",
            sourceType: "Attendance",
            sourceId: id,
            logicalDate: attendance.localDate,
            description: "Asistencia completada",
            idempotencyKey: `attendance:${id}:earned`,
          },
        });
      }
      const activeChallenges = await tx.challengeParticipant.findMany({
        where: {
          userId: session.user.id,
          challenge: {
            status: "ACTIVE",
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
        select: { challengeId: true },
      });
      for (const participant of activeChallenges)
        await syncChallengeProgressInTransaction(tx, participant.challengeId);
      await tx.socialPost.upsert({
        where: { attendanceId: id },
        update: {},
        create: {
          userId: session.user.id,
          attendanceId: id,
          challengeId: activeChallenges[0]?.challengeId ?? null,
          type: "WORKOUT",
          audience: "FRIENDS",
        },
      });
      return row;
    });
    try {
      const [actorName, memberships] = await Promise.all([
        userDisplayName(session.user.id),
        prisma.challengeParticipant.findMany({
          where: { userId: session.user.id, challenge: { status: "ACTIVE" } },
          include: {
            challenge: {
              include: {
                participants: {
                  where: { acceptedAt: { not: null } },
                  select: { userId: true },
                },
              },
            },
          },
        }),
      ]);
      const validationTargets = new Map<
        string,
        { challengeIds: string[]; challengeNames: string[] }
      >();
      for (const membership of memberships)
        for (const participant of membership.challenge.participants) {
          if (participant.userId === session.user.id) continue;
          const current = validationTargets.get(participant.userId) ?? {
            challengeIds: [],
            challengeNames: [],
          };
          current.challengeIds.push(membership.challengeId);
          current.challengeNames.push(membership.challenge.name);
          validationTargets.set(participant.userId, current);
        }
      await createNotifications(
        [...validationTargets.entries()].map(([userId, target]) => ({
          userId,
          actorId: session.user.id,
          type: "ATTENDANCE_COMPLETED" as const,
          title: "Nueva evidencia por validar",
          body: `${actorName} completó ${duration} minutos en ${target.challengeNames[0]}. Tu voto está pendiente.`,
          href: `/retos?challenge=${encodeURIComponent(target.challengeIds[0]!)}`,
          data: {
            attendanceId: id,
            durationMinutes: duration,
            challengeIds: target.challengeIds,
            votePending: true,
          },
          dedupeKey: `attendance-evidence-pending:${id}:${userId}`,
        })),
      );
      for (const membership of memberships) {
        const targetScore =
          membership.challenge.targetValue *
          Math.max(1, membership.challenge.pointsPerCompletion);
        if (membership.score < targetScore) continue;
        const teammateIds = membership.challenge.participants
          .map(({ userId }) => userId)
          .filter((userId) => userId !== session.user.id);
        await createNotifications(
          teammateIds.map((userId) => ({
            userId,
            actorId: session.user.id,
            type: "CHALLENGE_COMPLETED" as const,
            title: "¡Meta alcanzada en el reto!",
            body: `${actorName} completó la meta de “${membership.challenge.name}”.`,
            href: "/retos",
            data: { challengeId: membership.challengeId, attendanceId: id },
            dedupeKey: `challenge-target-reached:${membership.challengeId}:${session.user.id}:${userId}`,
          })),
        );
      }
    } catch (notificationError) {
      console.error(
        "[attendance] Completion saved but notification dispatch failed",
        notificationError,
      );
    }
    return ok(completed, "Entrenamiento finalizado. Ganaste 1 punto.");
  } catch (error) {
    if (error instanceof DomainError)
      return fail(error.code, error.message, 422);
    console.error("attendance.finish.failed", {
      attendanceId: (await params).id,
      userId: session.user.id,
      error,
    });
    return fail(
      "INTERNAL_ERROR",
      "No fue posible finalizar el entrenamiento",
      500,
    );
  }
}
