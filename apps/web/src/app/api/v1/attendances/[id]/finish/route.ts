import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { DomainError } from "@gymchallenge/domain";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { putPrivateObject } from "@/lib/private-storage";
import { normalizeAttendanceImage } from "@/modules/attendance/image";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions); if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  try {
    const { id } = await params; const attendance = await prisma.attendance.findFirst({ where: { id, userId: session.user.id } });
    if (!attendance) return fail("NOT_FOUND", "Asistencia no encontrada", 404);
    if (attendance.status !== "IN_PROGRESS") return fail("ALREADY_FINISHED", "Este entrenamiento ya fue finalizado", 409);
    const form = await request.formData(); const file = form.get("photo"); if (!(file instanceof File)) throw new DomainError("PHOTO_REQUIRED", "La fotografía final es obligatoria");const latitude=Number(form.get("latitude"));const longitude=Number(form.get("longitude"));const accuracy=Number(form.get("accuracy"));if(!Number.isFinite(latitude)||latitude < -90||latitude > 90||!Number.isFinite(longitude)||longitude < -180||longitude > 180)throw new DomainError("LOCATION_REQUIRED","Debes permitir una ubicación válida");
    const now = new Date(); const duration = Math.floor((now.getTime() - attendance.startedAt.getTime()) / 60_000);
    if (duration < 15) return fail("MINIMUM_DURATION", `Debes entrenar al menos 15 minutos. Llevas ${duration}.`, 422);
    const image = await normalizeAttendanceImage(file); const key = `attendance/${session.user.id}/${attendance.id}/end.webp`; await putPrivateObject(key, image.body, image.mimeType);
    const completed = await prisma.$transaction(async (tx) => {
      await tx.attendancePhoto.create({ data: { attendanceId: id, ownerId: session.user.id, type: "END", objectKey: key, mimeType: image.mimeType, sizeBytes: image.size, checksum: image.checksum, width: image.width, height: image.height } });
      const row = await tx.attendance.update({ where: { id }, data: { status: "COMPLETED", finishedAt: now, durationMinutes: duration,endLatitude:latitude,endLongitude:longitude,endAccuracyMeters:Number.isFinite(accuracy)?accuracy:null } });
      await tx.pointLedger.create({ data: { userId: session.user.id, attendanceId: id, amount: 1, type: "ATTENDANCE_EARNED", sourceType: "Attendance", sourceId: id, logicalDate: attendance.localDate, description: "Asistencia completada", idempotencyKey: `attendance:${id}:earned` } });
      return row;
    });
    return ok(completed, "Entrenamiento finalizado. Ganaste 1 punto.");
  } catch (error) { if (error instanceof DomainError) return fail(error.code, error.message, 422); return fail("INTERNAL_ERROR", "No fue posible finalizar el entrenamiento", 500); }
}
