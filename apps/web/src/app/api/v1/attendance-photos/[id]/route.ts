import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getPrivateObject } from "@/lib/private-storage";
import { evidenceTokenMatches } from "@/modules/challenges/evidence-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions); if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const photo = await prisma.attendancePhoto.findUnique({ where: { id: (await params).id } });
  if (!photo) return fail("NOT_FOUND", "Fotografía no encontrada", 404);
  if (photo.ownerId !== session.user.id && session.user.role !== "ADMIN") {
    const url = new URL(request.url);
    const challengeId = url.searchParams.get("challengeId");
    const viewToken = url.searchParams.get("viewToken");
    if (!challengeId || !viewToken) return fail("PRIVATE_VIEW_REQUIRED", "Esta fotografía requiere una vista privada temporal", 403);
    const view = await prisma.challengeEvidenceView.findUnique({ where: { attendanceId_viewerId: { attendanceId: photo.attendanceId, viewerId: session.user.id } } });
    if (!view || view.challengeId !== challengeId || view.decidedAt || view.expiresAt.getTime() < Date.now() || !evidenceTokenMatches(viewToken, view.tokenHash)) return fail("PRIVATE_VIEW_EXPIRED", "La vista privada de esta fotografía terminó", 410);
  }
  const object = await getPrivateObject(photo.objectKey);
  return new Response(Buffer.from(object.body), { headers: { "content-type": object.contentType, "cache-control": "private, no-store, max-age=0", pragma: "no-cache", expires: "0", "content-disposition": "inline", "x-content-type-options": "nosniff" } });
}
