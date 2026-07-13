import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { challengeScoreForParticipant } from "@/modules/challenges/sync-progress";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";

const bodySchema = z.object({ verdict: z.enum(["CONFIRMED", "REJECTED"]), note: z.string().trim().max(300).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string; attendanceId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Selecciona si la evidencia es válida o no", 422);
  const { challengeId, attendanceId } = await params;
  const challenge = await prisma.challenge.findFirst({
    where: {
      id: challengeId,
      status: { in: ["ACTIVE", "COMPLETED"] },
      participants: { some: { userId: session.user.id, acceptedAt: { not: null } } },
      scoreEvents: { some: { attendanceId } },
    },
    include: { scoreEvents: { where: { attendanceId }, select: { userId: true } } },
  });
  const evidenceOwnerId = challenge?.scoreEvents[0]?.userId;
  if (!challenge || !evidenceOwnerId) return fail("NOT_FOUND", "Evidencia no encontrada en este reto", 404);
  if (evidenceOwnerId === session.user.id) return fail("OWN_EVIDENCE", "No puedes validar tu propia evidencia", 403);

  const review = await prisma.$transaction(async (tx) => {
    const saved = await tx.challengeAttendanceReview.upsert({
      where: { challengeId_attendanceId_reviewerId: { challengeId, attendanceId, reviewerId: session.user.id } },
      update: { verdict: parsed.data.verdict, note: parsed.data.note || null },
      create: { challengeId, attendanceId, reviewerId: session.user.id, verdict: parsed.data.verdict, note: parsed.data.note || null },
    });
    const score = await challengeScoreForParticipant(tx, challengeId, evidenceOwnerId);
    await tx.challengeParticipant.update({ where: { challengeId_userId: { challengeId, userId: evidenceOwnerId } }, data: { score } });
    await tx.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_EVIDENCE_REVIEWED", entityType: "Attendance", entityId: attendanceId, correlationId: crypto.randomUUID(), newValues: { challengeId, verdict: parsed.data.verdict } } });
    return saved;
  });
  const actorName = await userDisplayName(session.user.id);
  await createNotifications([{
    userId: evidenceOwnerId,
    actorId: session.user.id,
    type: "EVIDENCE_REVIEWED",
    title: parsed.data.verdict === "CONFIRMED" ? "Tu equipo validó tu asistencia" : "Tu evidencia necesita revisión",
    body: parsed.data.verdict === "CONFIRMED" ? `${actorName} confirmó que cumpliste el entrenamiento.` : `${actorName} marcó tu evidencia como dudosa${parsed.data.note ? `: ${parsed.data.note}` : "."}`,
    href: "/retos",
    data: { challengeId, attendanceId, verdict: parsed.data.verdict },
    dedupeKey: `evidence-review:${review.id}:${review.updatedAt.toISOString()}`,
  }]);
  return ok(review, parsed.data.verdict === "CONFIRMED" ? "Confirmaste que sí asistió" : "Marcaste esta evidencia como dudosa");
}
