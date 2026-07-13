import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getPrivateObject } from "@/lib/private-storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions); if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const photo = await prisma.attendancePhoto.findUnique({ where: { id: (await params).id } });
  if (!photo) return fail("NOT_FOUND", "Fotografía no encontrada", 404);
  const sharedChallenge = photo.ownerId === session.user.id || session.user.role === "ADMIN" ? null : await prisma.challengeScoreEvent.findFirst({
    where: {
      attendanceId: photo.attendanceId,
      challenge: {
        status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] },
        participants: { some: { userId: session.user.id, acceptedAt: { not: null } } },
      },
    },
    select: { challengeId: true },
  });
  if (photo.ownerId !== session.user.id && session.user.role !== "ADMIN" && !sharedChallenge) return fail("NOT_FOUND", "Fotografía no encontrada", 404);
  if (photo.ownerId !== session.user.id) await prisma.auditLog.create({ data: { actorId: session.user.id, action: sharedChallenge ? "CHALLENGE_EVIDENCE_VIEWED" : "ATTENDANCE_PHOTO_VIEWED", entityType: "AttendancePhoto", entityId: photo.id, correlationId: crypto.randomUUID(), newValues: sharedChallenge ? { challengeId: sharedChallenge.challengeId } : {} } });
  const object = await getPrivateObject(photo.objectKey);
  return new Response(Buffer.from(object.body), { headers: { "content-type": object.contentType, "cache-control": "private, max-age=300", "content-disposition": "inline" } });
}
