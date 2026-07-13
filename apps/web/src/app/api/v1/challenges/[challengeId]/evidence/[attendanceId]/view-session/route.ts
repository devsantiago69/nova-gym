import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { createEvidenceViewToken, EVIDENCE_VIEW_SECONDS } from "@/modules/challenges/evidence-access";

export async function POST(_: Request, { params }: { params: Promise<{ challengeId: string; attendanceId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { challengeId, attendanceId } = await params;
  const evidence = await prisma.challengeScoreEvent.findFirst({
    where: {
      challengeId,
      attendanceId,
      userId: { not: session.user.id },
      challenge: {
        status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
        participants: { some: { userId: session.user.id, acceptedAt: { not: null } } },
      },
      attendance: { challengeReviews: { none: { reviewerId: session.user.id } } },
    },
    select: { id: true, attendance: { select: { startLatitude: true, startLongitude: true, startAccuracyMeters: true } } },
  });
  if (!evidence) return fail("EVIDENCE_UNAVAILABLE", "Esta evidencia ya fue revisada o no está disponible", 410);
  const { token, tokenHash } = createEvidenceViewToken();
  const openedAt = new Date();
  const expiresAt = new Date(openedAt.getTime() + EVIDENCE_VIEW_SECONDS * 1000);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.challengeEvidenceView.create({ data: { challengeId, attendanceId, viewerId: session.user.id, tokenHash, openedAt, expiresAt } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_EVIDENCE_OPENED_ONCE", entityType: "Attendance", entityId: attendanceId, correlationId: crypto.randomUUID(), newValues: { challengeId, expiresAt: expiresAt.toISOString() } } });
    });
    return ok({ token, expiresAt: expiresAt.toISOString(), seconds: EVIDENCE_VIEW_SECONDS, location: { latitude: evidence.attendance.startLatitude === null ? null : Number(evidence.attendance.startLatitude), longitude: evidence.attendance.startLongitude === null ? null : Number(evidence.attendance.startLongitude), accuracy: evidence.attendance.startAccuracyMeters === null ? null : Number(evidence.attendance.startAccuracyMeters) } }, "Vista privada iniciada");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("EVIDENCE_ALREADY_VIEWED", "Esta asistencia ya fue vista en uno de tus retos", 410);
    console.error("challenge.evidence.view.failed", { challengeId, attendanceId, viewerId: session.user.id, error });
    return fail("INTERNAL_ERROR", "No fue posible iniciar la vista privada", 500);
  }
}
