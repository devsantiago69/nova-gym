import { getServerSession } from "next-auth";
import { DomainError } from "@gymchallenge/domain";
import { Prisma, prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { putPrivateObject } from "@/lib/private-storage";
import { normalizeAttendanceImage } from "@/modules/attendance/image";
import { challengeScoreForParticipant } from "@/modules/challenges/sync-progress";
import {
  logicalDateInTimezone,
  requiredEvidenceFields,
  validateCompletionWindow,
  validateNumericEvidence,
  validateTextEvidence,
} from "@/modules/challenges/completion-rules";
import { canStoreBytes } from "@/modules/plans/entitlements";
import {
  createNotifications,
  userDisplayName,
} from "@/modules/notifications/service";

type SnapshotRules = {
  validWeekdays?: number[];
  requiredPhotoCount?: number;
  validationMethod?: "AUTOMATIC" | "ADMIN_REVIEW" | "SELF_REPORTED";
  numericRules?: {
    minimum?: number;
    maximum?: number;
    allowDecimals?: boolean;
    accumulate?: boolean;
  };
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const challengeId = new URL(request.url).searchParams.get("challengeId");
  if (!challengeId) return fail("VALIDATION_ERROR", "Falta el reto", 422);
  const member = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId: session.user.id } },
  });
  if (!member) return fail("FORBIDDEN", "No perteneces a este reto", 403);
  const rows = await prisma.challengeCompletion.findMany({
    where: { challengeId },
    select: {
      id: true,
      userId: true,
      logicalDate: true,
      status: true,
      calculatedPoints: true,
      unit: true,
      numericValue: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok(
    rows.map((row) => ({
      ...row,
      numericValue: row.numericValue === null ? null : Number(row.numericValue),
    })),
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  try {
    const form = await request.formData();
    const challengeId = String(form.get("challengeId") ?? "");
    const idempotencyKey = String(
      form.get("idempotencyKey") ?? crypto.randomUUID(),
    );
    const textValue = String(form.get("text") ?? "").trim() || null;
    const numericRaw = String(form.get("numericValue") ?? "").trim() || null;
    const now = new Date();
    const membership = await prisma.challengeParticipant.findFirst({
      where: {
        challengeId,
        userId: session.user.id,
        acceptedAt: { not: null },
        challenge: { status: "ACTIVE" },
      },
      include: {
        challenge: {
          include: {
            ruleSnapshot: true,
            checklistItems: { orderBy: { sortOrder: "asc" } },
            participants: {
              where: { acceptedAt: { not: null } },
              select: { userId: true },
            },
          },
        },
      },
    });
    if (!membership)
      throw new DomainError(
        "CHALLENGE_NOT_ACTIVE",
        "El reto no está activo o no perteneces a él",
      );
    const challenge = membership.challenge;
    const rules = (challenge.ruleSnapshot?.rules ?? {}) as SnapshotRules;
    validateCompletionWindow({
      now,
      startsAt: challenge.startsAt,
      endsAt: challenge.endsAt,
      timezone: challenge.timezone,
      validWeekdays: rules.validWeekdays ?? [1, 2, 3, 4, 5, 6, 7],
    });
    validateTextEvidence(challenge.evidenceType, textValue);
    const numericValue = validateNumericEvidence(
      challenge.evidenceType,
      numericRaw,
      rules.numericRules,
    );
    const checklistIds = JSON.parse(
      String(form.get("checklist") ?? "[]"),
    ) as string[];
    if (challenge.evidenceType === "CHECKLIST") {
      const required = challenge.checklistItems
        .filter((item) => item.required)
        .map((item) => item.id);
      if (required.length === 0)
        throw new DomainError(
          "CHECKLIST_NOT_CONFIGURED",
          "Este reto no tiene actividades configuradas",
        );
      if (required.some((id) => !checklistIds.includes(id)))
        throw new DomainError(
          "CHECKLIST_INCOMPLETE",
          "Completa todas las actividades obligatorias",
        );
    }
    const completionId = crypto.randomUUID();
    const uploads = [] as Array<{
      type: "START_PHOTO" | "END_PHOTO" | "SINGLE_PHOTO";
      image: Awaited<ReturnType<typeof normalizeAttendanceImage>>;
    }>;
    for (const field of requiredEvidenceFields(challenge.evidenceType)) {
      const file = form.get(field);
      if (!(file instanceof File) || file.size === 0)
        throw new DomainError(
          "PHOTO_REQUIRED",
          challenge.evidenceType === "TWO_PHOTOS"
            ? "Necesitas la fotografía inicial y final"
            : "La fotografía es obligatoria",
        );
      uploads.push({
        type:
          field === "startPhoto"
            ? "START_PHOTO"
            : field === "endPhoto"
              ? "END_PHOTO"
              : "SINGLE_PHOTO",
        image: await normalizeAttendanceImage(file),
      });
    }
    const totalBytes = uploads.reduce((sum, item) => sum + item.image.size, 0);
    if (totalBytes > 0) {
      const storage = await canStoreBytes(session.user.id, totalBytes);
      if (!storage.plan)
        throw new DomainError("PLAN_REQUIRED", "Necesitas un plan activo");
      if (!storage.allowed)
        throw new DomainError(
          "STORAGE_LIMIT_REACHED",
          `Alcanzaste los ${storage.plan.storageLimitMb} MB de tu plan`,
        );
    }
    for (const [position, item] of uploads.entries())
      await putPrivateObject(
        `challenge-completions/${session.user.id}/${completionId}/${item.type.toLowerCase()}.webp`,
        item.image.body,
        item.image.mimeType,
      );
    const logicalDate = logicalDateInTimezone(now, challenge.timezone);
    const checklistPoints = challenge.checklistItems
      .filter((item) => checklistIds.includes(item.id))
      .reduce((sum, item) => sum + item.points, 0);
    const points = challenge.pointsPerCompletion + checklistPoints;
    const validationMethod =
      rules.validationMethod ??
      (challenge.evidenceType === "NONE" ||
      challenge.evidenceType === "TEXT" ||
      challenge.evidenceType === "CHECKLIST"
        ? "SELF_REPORTED"
        : "AUTOMATIC");
    const completion = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`completion:${challenge.id}:${session.user.id}:${logicalDate.toISOString()}`}))`;
      const duplicate = await tx.challengeCompletion.findUnique({
        where: { idempotencyKey },
      });
      if (duplicate) return duplicate;
      const daily = await tx.challengeCompletion.count({
        where: {
          challengeId: challenge.id,
          userId: session.user.id,
          logicalDate,
          status: { in: ["SUBMITTED", "VALID"] },
        },
      });
      if (daily >= challenge.maxDailyCompletions)
        throw new DomainError(
          "DAILY_COMPLETION_LIMIT",
          challenge.maxDailyCompletions === 1
            ? "Ya registraste el cumplimiento de hoy"
            : `Alcanzaste el límite de ${challenge.maxDailyCompletions} cumplimientos de hoy`,
        );
      const status =
        validationMethod === "ADMIN_REVIEW" ? "SUBMITTED" : "VALID";
      const row = await tx.challengeCompletion.create({
        data: {
          id: completionId,
          challengeId: challenge.id,
          participantId: membership.id,
          userId: session.user.id,
          logicalDate,
          occurredAt: now,
          status,
          numericValue,
          unit: numericValue === null ? null : challenge.targetUnit,
          textValue,
          checklist: checklistIds,
          calculatedPoints: status === "VALID" ? points : 0,
          timezone: challenge.timezone,
          evidenceMethod: challenge.evidenceType,
          validationMethod,
          submittedAt: now,
          validatedAt: status === "VALID" ? now : null,
          idempotencyKey,
          evidence: {
            create: uploads.map((item, position) => ({
              type: item.type,
              objectKey: `challenge-completions/${session.user.id}/${completionId}/${item.type.toLowerCase()}.webp`,
              position,
              checksum: item.image.checksum,
              mimeType: item.image.mimeType,
              sizeBytes: item.image.size,
            })),
          },
          checklistItems: {
            create: challenge.checklistItems
              .filter((item) => checklistIds.includes(item.id))
              .map((item) => ({ itemId: item.id, checked: true })),
          },
        },
      });
      if (status === "VALID") {
        await tx.challengeScoreEvent.create({
          data: {
            challengeId: challenge.id,
            userId: session.user.id,
            completionId: row.id,
            points,
            idempotencyKey: `challenge:${challenge.id}:completion:${row.id}:user:${session.user.id}`,
          },
        });
        const score = await challengeScoreForParticipant(
          tx,
          challenge.id,
          session.user.id,
        );
        await tx.challengeParticipant.update({
          where: { id: membership.id },
          data: { score },
        });
      }
      return row;
    });
    const actorName = await userDisplayName(session.user.id);
    await createNotifications(
      challenge.participants
        .filter((item) => item.userId !== session.user.id)
        .map((item) => ({
          userId: item.userId,
          actorId: session.user.id,
          type: "CHALLENGE_PROGRESS" as const,
          title: "Nuevo avance en el reto",
          body: `${actorName} registró un cumplimiento en “${challenge.name}”.`,
          href: `/retos?challenge=${challenge.id}`,
          data: { challengeId: challenge.id, completionId: completion.id },
          dedupeKey: `challenge-completion:${completion.id}:${item.userId}`,
        })),
    );
    return ok(
      completion,
      completion.status === "VALID"
        ? numericValue === null
          ? `¡Cumplimiento registrado! Sumaste ${points} puntos.`
          : `¡Registraste ${numericValue} ${challenge.targetUnit}! Sumaste ${points} puntos.`
        : "Tu cumplimiento quedó pendiente de revisión.",
      201,
    );
  } catch (error) {
    if (error instanceof DomainError)
      return fail(error.code, error.message, 422);
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    )
      return fail(
        "DUPLICATE_COMPLETION",
        "Este cumplimiento ya fue registrado",
        409,
      );
    console.error("challenge.completion.failed", error);
    return fail(
      "INTERNAL_ERROR",
      "No fue posible registrar el cumplimiento",
      500,
    );
  }
}
