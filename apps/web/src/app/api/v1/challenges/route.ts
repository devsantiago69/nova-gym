import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { syncChallengeProgress } from "@/modules/challenges/sync-progress";
import { activePlanEntitlements } from "@/modules/plans/entitlements";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";
import { resolveChallengeRules } from "@/modules/challenges/rule-snapshot";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const body = await request.json().catch(() => null) as { action?: string; targetId?: string; targetIds?: string[]; categoryId?: string; templateId?: string; challengeId?: string } | null;

  if (body?.action === "create" && (body.categoryId || body.templateId)) {
    const targetIds = [...new Set(Array.isArray(body.targetIds) ? body.targetIds : body.targetId ? [body.targetId] : [])].filter((id) => id !== session.user.id);
    if (targetIds.length > 3) return fail("INVALID_TEAM_SIZE", "Puedes invitar máximo 3 amigos", 422);
    const friendships = targetIds.length === 0 ? 0 : await prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: targetIds.flatMap((targetId) => [
          { requesterId: session.user.id, addresseeId: targetId },
          { requesterId: targetId, addresseeId: session.user.id },
        ]),
      },
    });
    if (friendships !== targetIds.length) return fail("FRIEND_REQUIRED", "Solo puedes retar a amigos aceptados", 403);
    const plan = await activePlanEntitlements(session.user.id);
    const activeCount = await prisma.challengeParticipant.count({ where: { userId: session.user.id, challenge: { status: { in: ["PENDING", "ACTIVE"] } } } });
    if (!plan) return fail("PLAN_REQUIRED", "Necesitas un plan activo para crear retos", 403);
    if (activeCount >= plan.activeChallengeLimit) return fail("CHALLENGE_LIMIT_REACHED", `Tu plan permite hasta ${plan.activeChallengeLimit} retos activos`, 409);
    const created = await prisma.$transaction(async (tx) => {
      const resolved = await resolveChallengeRules(tx, { ...(body.categoryId ? { categoryId: body.categoryId } : {}), ...(body.templateId ? { templateId: body.templateId } : {}), creatorId: session.user.id, participantCount: targetIds.length + 1 });
      if (!resolved) return null;
      const startsAt = new Date();
      const challenge = await tx.challenge.create({
        data: {
          ...resolved.challengeData,
          creatorId: session.user.id,
          status: targetIds.length === 0 ? "ACTIVE" : "PENDING",
          startsAt,
          endsAt: new Date(startsAt.getTime() + resolved.challengeData.durationDays * 86_400_000),
          acceptedAt: targetIds.length === 0 ? startsAt : null,
          participants: { create: [{ userId: session.user.id, acceptedAt: startsAt }, ...targetIds.map((userId) => ({ userId }))] },
          ...(resolved.checklistItems.length ? { checklistItems:{ create:resolved.checklistItems } } : {}),
        },
      });
      await tx.challengeRuleSnapshot.create({
        data: {
          challengeId: challenge.id,
          templateId: resolved.template?.id ?? null,
          templateVersionId: resolved.version?.id ?? null,
          templateVersion: resolved.version?.version ?? null,
          rules: resolved.rules,
          checksum: resolved.checksum,
        },
      });
      if (resolved.template) await tx.challengeTemplate.update({ where: { id: resolved.template.id }, data: { usageCount: { increment: 1 } } });
      return { challenge, name: resolved.challengeData.name };
    });
    if (!created) return fail("CATEGORY_NOT_FOUND", "Categoría no disponible", 404);
    const { challenge } = created;
    const actorName = await userDisplayName(session.user.id);
    await createNotifications(targetIds.map((userId) => ({
      userId,
      actorId: session.user.id,
      type: "CHALLENGE_INVITE" as const,
      title: "Tienes un nuevo reto",
      body: `${actorName} te invitó a “${created.name}”. ¿Te unes al equipo?`,
      href: "/retos",
      data: { challengeId: challenge.id },
      dedupeKey: `challenge-invite:${challenge.id}:${userId}`,
    })));
    return ok(challenge, targetIds.length === 0 ? "Tu reto personal comenzó. ¡Primer día, primera oportunidad!" : `Invitación enviada a ${targetIds.length} ${targetIds.length === 1 ? "amigo" : "amigos"}`, 201);
  }

  if (body?.action === "accept" && body.challengeId) {
    const participant = await prisma.challengeParticipant.findFirst({ where: { challengeId: body.challengeId, userId: session.user.id, acceptedAt: null, challenge: { status: "PENDING" } }, include: { challenge: true } });
    if (!participant) return fail("NOT_FOUND", "Invitación no encontrada", 404);
    const plan = await activePlanEntitlements(session.user.id);
    if (!plan) return fail("PLAN_REQUIRED", "Necesitas un plan activo para aceptar retos", 403);
    const otherActiveChallenges = await prisma.challengeParticipant.count({ where: { userId: session.user.id, challengeId: { not: participant.challengeId }, challenge: { status: { in: ["PENDING", "ACTIVE"] } } } });
    if (otherActiveChallenges >= plan.activeChallengeLimit) return fail("CHALLENGE_LIMIT_REACHED", `Tu plan permite hasta ${plan.activeChallengeLimit} retos activos`, 409);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      await tx.challengeParticipant.update({ where: { id: participant.id }, data: { acceptedAt: now } });
      const pending = await tx.challengeParticipant.count({ where: { challengeId: participant.challengeId, acceptedAt: null } });
      if (pending > 0) return { activated: false, pending };
      await tx.challenge.update({ where: { id: participant.challengeId }, data: { status: "ACTIVE", acceptedAt: now, startsAt: now, endsAt: new Date(now.getTime() + participant.challenge.durationDays * 86400000) } });
      return { activated: true, pending: 0 };
    });
    if (result.activated) await syncChallengeProgress(participant.challengeId);
    const actorName = await userDisplayName(session.user.id);
    const teammates = await prisma.challengeParticipant.findMany({ where: { challengeId: participant.challengeId, userId: { not: session.user.id }, acceptedAt: { not: null } }, select: { userId: true } });
    await createNotifications(teammates.map(({ userId }) => ({
      userId,
      actorId: session.user.id,
      type: result.activated ? "CHALLENGE_STARTED" as const : "CHALLENGE_PROGRESS" as const,
      title: result.activated ? "¡El reto comenzó!" : "Tu equipo está creciendo",
      body: result.activated ? `${actorName} aceptó. “${participant.challenge.name}” ya está en marcha.` : `${actorName} aceptó el reto. Faltan ${result.pending} por unirse.`,
      href: "/retos",
      data: { challengeId: participant.challengeId },
      dedupeKey: `challenge-accepted:${participant.challengeId}:${session.user.id}`,
    })));
    return ok(result, result.activated ? "¡El reto comenzó! Las asistencias válidas de hoy ya cuentan." : `Aceptaste el reto. Faltan ${result.pending} ${result.pending === 1 ? "persona" : "personas"} por aceptar.`);
  }

  if (body?.action === "leave" && body.challengeId) {
    const membership = await prisma.challengeParticipant.findFirst({
      where: { challengeId: body.challengeId, userId: session.user.id, challenge: { status: { in: ["PENDING", "ACTIVE"] } } },
      include: { challenge: { include: { participants: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!membership) return fail("CHALLENGE_NOT_LEAVABLE", "Este reto ya no se puede abandonar o no perteneces a él", 409);
    const remaining = membership.challenge.participants.filter((participant) => participant.userId !== session.user.id);
    const wasCreator = membership.challenge.creatorId === session.user.id;
    const now = new Date();
    const outcome = await prisma.$transaction(async (tx) => {
      await tx.challengeAttendanceReview.deleteMany({ where: { challengeId: membership.challengeId, OR: [{ reviewerId: session.user.id }, { attendance: { userId: session.user.id } }] } });
      await tx.challengeScoreEvent.deleteMany({ where: { challengeId: membership.challengeId, userId: session.user.id } });
      await tx.challengeParticipant.delete({ where: { id: membership.id } });
      const nextCreator = remaining.find((participant) => participant.acceptedAt !== null) ?? remaining[0];
      if (remaining.length < 2) {
        await tx.challenge.update({ where: { id: membership.challengeId }, data: { status: "CANCELED", ...(wasCreator && nextCreator ? { creatorId: nextCreator.userId } : {}) } });
        return "canceled" as const;
      }
      const pending = remaining.filter((participant) => participant.acceptedAt === null).length;
      await tx.challenge.update({
        where: { id: membership.challengeId },
        data: {
          ...(wasCreator && nextCreator ? { creatorId: nextCreator.userId } : {}),
          ...(membership.challenge.status === "PENDING" && pending === 0 ? { status: "ACTIVE", acceptedAt: now, startsAt: now, endsAt: new Date(now.getTime() + membership.challenge.durationDays * 86_400_000) } : {}),
        },
      });
      return wasCreator ? "transferred" as const : "continued" as const;
    });
    await prisma.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_LEFT", entityType: "Challenge", entityId: membership.challengeId, correlationId: crypto.randomUUID(), newValues: { wasCreator, outcome } } });
    const actorName = await userDisplayName(session.user.id);
    await createNotifications(remaining.map(({ userId }) => ({
      userId,
      actorId: session.user.id,
      type: "CHALLENGE_PROGRESS" as const,
      title: outcome === "canceled" ? "Reto cancelado" : "Cambio en el equipo",
      body: outcome === "canceled" ? `${actorName} salió y el reto se cerró por falta de integrantes.` : `${actorName} salió del reto “${membership.challenge.name}”.`,
      href: "/retos",
      data: { challengeId: membership.challengeId },
      dedupeKey: `challenge-left:${membership.challengeId}:${session.user.id}`,
    })));
    return ok({ challengeId: membership.challengeId, outcome }, outcome === "canceled" ? "Saliste del reto. Se canceló porque ya no quedaba un equipo suficiente." : outcome === "transferred" ? "Saliste del reto y otro integrante quedó como líder." : "Saliste del reto correctamente.");
  }

  return fail("VALIDATION_ERROR", "Acción inválida", 422);
}
