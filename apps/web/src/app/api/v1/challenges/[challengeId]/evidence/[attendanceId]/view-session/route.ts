import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { createEvidenceViewToken, evidenceTokenMatches, normalizeEvidenceViewSeconds } from "@/modules/challenges/evidence-access";

export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string; attendanceId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { challengeId, attendanceId } = await params;
  const payload = await request.json().catch(() => ({})) as { mode?: string };
  const mode = payload.mode === "replay" ? "replay" : "verify";
  const evidence = await prisma.challengeScoreEvent.findFirst({
    where: {
      challengeId,
      attendanceId,
      userId: { not: session.user.id },
      challenge: {
        status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
        participants: { some: { userId: session.user.id, acceptedAt: { not: null } } },
      },
    },
    select: {
      id: true,
      user: { select: { profile: { select: { storyDurationSeconds: true } } } },
      attendance: { select: { startLatitude: true, startLongitude: true, startAccuracyMeters: true, challengeReviews: { where: { reviewerId: session.user.id, challengeId }, select: { id: true } } } },
    },
  });
  if (!evidence || !evidence.attendance) return fail("EVIDENCE_UNAVAILABLE", "Esta evidencia no está disponible en tus retos compartidos", 404);
  const reviewed = evidence.attendance.challengeReviews.length > 0;
  if (mode === "replay" && !reviewed) return fail("EVIDENCE_NOT_REVIEWED", "Primero debes validar esta evidencia desde Retos", 409);
  if (mode === "verify" && reviewed) return fail("EVIDENCE_ALREADY_REVIEWED", "La evidencia ya fue validada; ábrela desde el historial", 409);
  const { token, tokenHash } = createEvidenceViewToken();
  const openedAt = new Date();
  const seconds = normalizeEvidenceViewSeconds(evidence.user.profile?.storyDurationSeconds);
  const expiresAt = new Date(openedAt.getTime() + seconds * 1000);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.challengeEvidenceView.upsert({ where: { attendanceId_viewerId: { attendanceId, viewerId: session.user.id } }, create: { challengeId, attendanceId, viewerId: session.user.id, tokenHash, openedAt, expiresAt }, update: { challengeId, tokenHash, openedAt, expiresAt, pausedAt: null, pausedRemainingMs: null, decidedAt: null } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: mode === "replay" ? "CHALLENGE_EVIDENCE_REPLAYED" : "CHALLENGE_EVIDENCE_OPENED_ONCE", entityType: "Attendance", entityId: attendanceId, correlationId: crypto.randomUUID(), newValues: { challengeId, mode, seconds, expiresAt: expiresAt.toISOString() } } });
    });
    return ok({ token, expiresAt: expiresAt.toISOString(), seconds, mode, location: { latitude: evidence.attendance.startLatitude === null ? null : Number(evidence.attendance.startLatitude), longitude: evidence.attendance.startLongitude === null ? null : Number(evidence.attendance.startLongitude), accuracy: evidence.attendance.startAccuracyMeters === null ? null : Number(evidence.attendance.startAccuracyMeters) } }, mode === "replay" ? "Historia temporal iniciada" : "Vista privada iniciada");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("EVIDENCE_ALREADY_VIEWED", "Esta asistencia ya fue vista en uno de tus retos", 410);
    console.error("challenge.evidence.view.failed", { challengeId, attendanceId, viewerId: session.user.id, error });
    return fail("INTERNAL_ERROR", "No fue posible iniciar la vista privada", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ challengeId: string; attendanceId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { challengeId, attendanceId } = await params;
  const payload = await request.json().catch(() => null) as { action?: string; viewToken?: string; remainingMs?: number } | null;
  if (!payload || !["pause", "resume"].includes(payload.action ?? "") || typeof payload.viewToken !== "string") return fail("VALIDATION_ERROR", "Acción de reproducción inválida", 422);
  const view = await prisma.challengeEvidenceView.findUnique({ where: { attendanceId_viewerId: { attendanceId, viewerId: session.user.id } } });
  if (!view || view.challengeId !== challengeId || view.decidedAt || !evidenceTokenMatches(payload.viewToken, view.tokenHash)) return fail("PRIVATE_VIEW_EXPIRED", "La historia temporal ya no está disponible", 410);
  const now = new Date();
  if (payload.action === "pause") {
    const remainingMs = Math.min(20_000, Math.max(250, Math.round(payload.remainingMs ?? 0)));
    if (view.expiresAt.getTime() < now.getTime() || remainingMs <= 0) return fail("PRIVATE_VIEW_EXPIRED", "La historia temporal ya terminó", 410);
    const pauseExpiresAt = new Date(now.getTime() + 120_000);
    await prisma.challengeEvidenceView.update({ where: { id: view.id }, data: { pausedAt: now, pausedRemainingMs: remainingMs, expiresAt: pauseExpiresAt } });
    return ok({ paused: true, remainingMs, expiresAt: pauseExpiresAt.toISOString() }, "Historia pausada");
  }
  if (!view.pausedAt || !view.pausedRemainingMs || view.expiresAt.getTime() < now.getTime()) return fail("PRIVATE_VIEW_EXPIRED", "La pausa terminó; abre la historia nuevamente", 410);
  const expiresAt = new Date(now.getTime() + view.pausedRemainingMs);
  await prisma.challengeEvidenceView.update({ where: { id: view.id }, data: { pausedAt: null, pausedRemainingMs: null, expiresAt } });
  return ok({ paused: false, remainingMs: view.pausedRemainingMs, expiresAt: expiresAt.toISOString() }, "Historia reanudada");
}
