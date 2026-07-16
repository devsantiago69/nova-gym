import { getServerSession } from "next-auth";
import { Prisma, prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { activePlanEntitlements } from "@/modules/plans/entitlements";
import { challengeRulesChecksum } from "@/modules/challenges/rule-snapshot";
import {
  createNotifications,
  userDisplayName,
} from "@/modules/notifications/service";
import { customChallengeSchema } from "./schema";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = customChallengeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Configuración inválida",
      422,
      parsed.error.issues[0]?.path.join(".") ?? null,
    );
  const input = parsed.data;
  const targetIds = [...new Set(input.targetIds)].filter(
    (id) => id !== session.user.id,
  );
  const [plan, activeCount, category, profile, friendships, draftAvailable] =
    await Promise.all([
      activePlanEntitlements(session.user.id),
      prisma.challengeParticipant.count({
        where: {
          userId: session.user.id,
          challenge: { status: { in: ["PENDING", "ACTIVE"] } },
        },
      }),
      prisma.challengeCategory.findFirst({
        where: { id: input.categoryId, status: "ACTIVE" },
      }),
      prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { timezone: true },
      }),
      targetIds.length === 0
        ? Promise.resolve(0)
        : prisma.friendship.count({
            where: {
              status: "ACCEPTED",
              OR: targetIds.flatMap((targetId) => [
                { requesterId: session.user.id, addresseeId: targetId },
                { requesterId: targetId, addresseeId: session.user.id },
              ]),
            },
          }),
      input.draftId
        ? prisma.challengeDraft.count({
            where: {
              id: input.draftId,
              ownerId: session.user.id,
              expiresAt: { gte: new Date() },
            },
          })
        : Promise.resolve(1),
    ]);
  if (!plan)
    return fail(
      "PLAN_REQUIRED",
      "Necesitas un plan activo para crear retos",
      403,
    );
  if (activeCount >= plan.activeChallengeLimit)
    return fail(
      "CHALLENGE_LIMIT_REACHED",
      `Tu plan permite hasta ${plan.activeChallengeLimit} retos activos`,
      409,
    );
  if (!category)
    return fail(
      "CATEGORY_NOT_FOUND",
      "La categoría oficial no está disponible",
      404,
    );
  if (friendships !== targetIds.length)
    return fail("FRIEND_REQUIRED", "Solo puedes invitar amigos aceptados", 403);
  if (!draftAvailable)
    return fail("DRAFT_NOT_FOUND", "El borrador no existe o ya venció", 404);
  const modality =
    targetIds.length === 0
      ? "SOLO"
      : targetIds.length === 1
        ? "HEAD_TO_HEAD"
        : "GROUP";
  const timezone = profile?.timezone ?? "America/Bogota";
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + input.durationDays * 86_400_000);
  const rules = {
    schemaVersion: 1,
    source: "CUSTOM",
    templateId: null,
    templateVersionId: null,
    name: input.name,
    description: input.description,
    categoryId: category.id,
    categoryName: category.name,
    challengeType: input.challengeType,
    modality,
    durationDays: input.durationDays,
    timezone,
    targetValue: input.targetValue,
    targetUnit: input.targetUnit,
    evidenceType: input.evidenceType,
    requiredPhotoCount:
      input.evidenceType === "TWO_PHOTOS"
        ? 2
        : input.evidenceType === "ONE_PHOTO" ||
            input.evidenceType === "PHOTO_AND_VALUE"
          ? 1
          : 0,
    pointsPerCompletion: input.pointsPerCompletion,
    completionBonus: input.completionBonus,
    winnerBonus: input.winnerBonus,
    maxDailyCompletions: input.maxDailyCompletions,
    validWeekdays: [...new Set(input.validWeekdays)].sort(),
    numericRules: {
      minimum: input.numericMinimum,
      maximum: input.numericMaximum,
      allowDecimals: input.allowDecimals,
      accumulate: true,
    },
    scoringRules: {
      pointsPerCompletion: input.pointsPerCompletion,
      completionBonus: input.completionBonus,
      winnerBonus: input.winnerBonus,
      checklistItems: input.checklistItems,
    },
    winningRule: { type: input.challengeType, target: input.targetValue },
    tieRule: { allowed: true },
    privacy: { evidence: "OWNER_AND_ADMIN", socialProgress: true },
    termsAcceptedAt: startsAt.toISOString(),
  } satisfies Prisma.InputJsonObject;
  const challenge = await prisma.$transaction(async (tx) => {
    if (input.draftId) {
      const draft = await tx.challengeDraft.findFirst({
        where: {
          id: input.draftId,
          ownerId: session.user.id,
          expiresAt: { gte: new Date() },
        },
      });
      if (!draft) throw new Error("DRAFT_NOT_FOUND");
    }
    const row = await tx.challenge.create({
      data: {
        categoryId: category.id,
        creatorId: session.user.id,
        name: input.name,
        description: input.description,
        modality,
        durationDays: input.durationDays,
        timezone,
        targetValue: input.targetValue,
        targetUnit: input.targetUnit,
        evidenceType: input.evidenceType,
        pointsPerCompletion: input.pointsPerCompletion,
        maxDailyCompletions: input.maxDailyCompletions,
        status: targetIds.length === 0 ? "ACTIVE" : "PENDING",
        startsAt,
        endsAt,
        acceptedAt: targetIds.length === 0 ? startsAt : null,
        participants: {
          create: [
            { userId: session.user.id, acceptedAt: startsAt },
            ...targetIds.map((userId) => ({ userId })),
          ],
        },
        ...(input.checklistItems.length
          ? {
              checklistItems: {
                create: input.checklistItems.map((item, index) => ({
                  ...item,
                  sortOrder: index,
                })),
              },
            }
          : {}),
      },
    });
    await tx.challengeRuleSnapshot.create({
      data: {
        challengeId: row.id,
        rules,
        checksum: challengeRulesChecksum(rules),
      },
    });
    if (input.saveAsPersonalTemplate) {
      const configuration = {
        categoryId: category.id,
        name: input.name,
        description: input.description,
        challengeType: input.challengeType,
        durationDays: input.durationDays,
        targetValue: input.targetValue,
        targetUnit: input.targetUnit,
        evidenceType: input.evidenceType,
        numericMinimum: input.numericMinimum,
        numericMaximum: input.numericMaximum,
        allowDecimals: input.allowDecimals,
        pointsPerCompletion: input.pointsPerCompletion,
        completionBonus: input.completionBonus,
        winnerBonus: input.winnerBonus,
        maxDailyCompletions: input.maxDailyCompletions,
        validWeekdays: [...new Set(input.validWeekdays)].sort(),
        checklistItems: input.checklistItems,
      } satisfies Prisma.InputJsonObject;
      await tx.userChallengeTemplate.create({
        data: {
          ownerId: session.user.id,
          categoryId: category.id,
          sourceChallengeId: row.id,
          name: input.name,
          description: input.description,
          configuration,
        },
      });
    }
    if (input.draftId)
      await tx.challengeDraft.delete({ where: { id: input.draftId } });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CUSTOM_CHALLENGE_CREATED",
        entityType: "Challenge",
        entityId: row.id,
        correlationId: crypto.randomUUID(),
        newValues: {
          name: input.name,
          modality,
          evidenceType: input.evidenceType,
          durationDays: input.durationDays,
          targetValue: input.targetValue,
          savedAsPersonalTemplate: input.saveAsPersonalTemplate,
          draftId: input.draftId ?? null,
        },
      },
    });
    return row;
  });
  const actorName = await userDisplayName(session.user.id);
  await createNotifications(
    targetIds.map((userId) => ({
      userId,
      actorId: session.user.id,
      type: "CHALLENGE_INVITE" as const,
      title: "Te diseñaron un reto",
      body: `${actorName} te invitó a “${input.name}”.`,
      href: "/retos",
      data: { challengeId: challenge.id, custom: true },
      dedupeKey: `custom-challenge-invite:${challenge.id}:${userId}`,
    })),
  );
  return ok(
    challenge,
    targetIds.length === 0
      ? "Tu reto personalizado comenzó con sus reglas protegidas."
      : `Reto creado e invitación enviada a ${targetIds.length} ${targetIds.length === 1 ? "amigo" : "amigos"}.`,
    201,
  );
}
