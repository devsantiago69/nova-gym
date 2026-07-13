import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getPrivateObject } from "@/lib/private-storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions); if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const photo = await prisma.attendancePhoto.findUnique({ where: { id: (await params).id } });
  if (!photo || (photo.ownerId !== session.user.id && session.user.role !== "ADMIN")) return fail("NOT_FOUND", "Fotografía no encontrada", 404);
  if (session.user.role === "ADMIN" && photo.ownerId !== session.user.id) await prisma.auditLog.create({ data: { actorId: session.user.id, action: "ATTENDANCE_PHOTO_VIEWED", entityType: "AttendancePhoto", entityId: photo.id, correlationId: crypto.randomUUID() } });
  const object = await getPrivateObject(photo.objectKey);
  return new Response(Buffer.from(object.body), { headers: { "content-type": object.contentType, "cache-control": "private, max-age=300", "content-disposition": "inline" } });
}
