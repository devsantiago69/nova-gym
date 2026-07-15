import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { challengeScoreForParticipant } from "@/modules/challenges/sync-progress";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";
import { evidenceTokenMatches } from "@/modules/challenges/evidence-access";

const bodySchema = z.object({ verdict: z.enum(["CONFIRMED", "REJECTED"]), note: z.string().trim().max(300).optional(), viewToken: z.string().min(20).max(200) });

export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string; attendanceId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Selecciona si la evidencia es válida o no", 422);
  const { challengeId, attendanceId } = await params;
  const eligibleEvents = await prisma.challengeScoreEvent.findMany({
    where: {
      attendanceId,
      userId: { not: session.user.id },
      challenge: {
        status: { in: ["ACTIVE", "COMPLETED"] },
        participants: { some: { userId: session.user.id, acceptedAt: { not: null } } },
      },
    },
    select: { challengeId: true, userId: true },
  });
  const challengeIds = [...new Set(eligibleEvents.map((event) => event.challengeId))];
  const evidenceOwnerId = eligibleEvents[0]?.userId;
  if (!evidenceOwnerId || !challengeIds.includes(challengeId)) return fail("NOT_FOUND", "Evidencia no encontrada en tus retos compartidos", 404);
  const view = await prisma.challengeEvidenceView.findUnique({ where: { attendanceId_viewerId: { attendanceId, viewerId: session.user.id } } });
  if (!view || view.challengeId !== challengeId || view.decidedAt || view.expiresAt.getTime() < Date.now() || !evidenceTokenMatches(parsed.data.viewToken, view.tokenHash)) return fail("PRIVATE_VIEW_EXPIRED", "La ventana de verificación terminó. Puedes abrir una nueva mientras tu voto siga pendiente.", 410);
  const previousReview = await prisma.challengeAttendanceReview.findFirst({ where: { challengeId: { in: challengeIds }, attendanceId, reviewerId: session.user.id }, select: { id: true } });
  if (previousReview) return fail("EVIDENCE_ALREADY_REVIEWED", "Ya registraste tu decisión para esta evidencia", 409);

  const reviewedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.challengeAttendanceReview.createMany({
      data: challengeIds.map((sharedChallengeId) => ({ challengeId: sharedChallengeId, attendanceId, reviewerId: session.user.id, verdict: parsed.data.verdict, note: parsed.data.note || null })),
      skipDuplicates: true,
    });
    await tx.challengeEvidenceView.update({ where: { id: view.id }, data: { decidedAt: new Date() } });
    for (const sharedChallengeId of challengeIds) {
      const score = await challengeScoreForParticipant(tx, sharedChallengeId, evidenceOwnerId);
      await tx.challengeParticipant.update({ where: { challengeId_userId: { challengeId: sharedChallengeId, userId: evidenceOwnerId } }, data: { score } });
    }
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_EVIDENCE_REVIEWED", entityType: "Attendance", entityId: attendanceId, correlationId: crypto.randomUUID(), newValues: { challengeIds, verdict: parsed.data.verdict } } });
  });
  const actorName = await userDisplayName(session.user.id);
  await createNotifications([{
    userId: evidenceOwnerId,
    actorId: session.user.id,
    type: "EVIDENCE_REVIEWED",
    title: parsed.data.verdict === "CONFIRMED" ? "Tu equipo validó tu asistencia" : "Tu evidencia necesita revisión",
    body: parsed.data.verdict === "CONFIRMED" ? `${actorName} confirmó que cumpliste el entrenamiento.` : `${actorName} marcó tu evidencia como dudosa${parsed.data.note ? `: ${parsed.data.note}` : "."}`,
    href: "/retos",
    data: { challengeIds, attendanceId, verdict: parsed.data.verdict },
    dedupeKey: `evidence-review:${attendanceId}:${session.user.id}:${reviewedAt.toISOString()}`,
  }]);
  return ok({ attendanceId, challengeIds, verdict: parsed.data.verdict, reviewedAt }, parsed.data.verdict === "CONFIRMED" ? "Confirmaste su asistencia en tus retos compartidos" : "Marcaste esta evidencia como dudosa en tus retos compartidos");
}
