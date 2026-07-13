import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { DomainError } from "@gymchallenge/domain";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { putPrivateObject } from "@/lib/private-storage";
import { normalizeAttendanceImage } from "@/modules/attendance/image";
import { activePlanEntitlements, canStoreBytes } from "@/modules/plans/entitlements";

function localDate(timezone: string) { return new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())}T00:00:00.000Z`); }
function coordinates(form: FormData) { const latitude=Number(form.get("latitude"));const longitude=Number(form.get("longitude"));const accuracy=Number(form.get("accuracy"));if(!Number.isFinite(latitude)||latitude < -90||latitude > 90||!Number.isFinite(longitude)||longitude < -180||longitude > 180)throw new DomainError("LOCATION_REQUIRED","Debes permitir una ubicación válida");return {latitude,longitude,accuracy:Number.isFinite(accuracy)?accuracy:null}; }
async function userSession() { return getServerSession(authOptions); }

export async function GET() {
  const session = await userSession(); if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const plan = await activePlanEntitlements(session.user.id);
  const oldestDate = plan?.historyMonths ? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - plan.historyMonths, 1)) : undefined;
  const rows = await prisma.attendance.findMany({ where: { userId: session.user.id, ...(oldestDate ? { localDate: { gte: oldestDate } } : {}) }, include: { photos: { select: { id: true, type: true } }, pointMovements: { select: { amount: true } } }, orderBy: { localDate: "desc" }, take: 1200 });
  return ok(rows);
}

export async function POST(request: Request) {
  const session = await userSession(); if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  try {
    const form = await request.formData(); const file = form.get("photo"); const location=coordinates(form);
    if (!(file instanceof File)) throw new DomainError("PHOTO_REQUIRED", "La fotografía inicial es obligatoria");
    const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId: session.user.id } });
    const date = localDate(profile.timezone);
    const existing = await prisma.attendance.findUnique({ where: { userId_localDate: { userId: session.user.id, localDate: date } }, select: { status: true } });
    if (existing) return fail("ATTENDANCE_ALREADY_EXISTS", existing.status === "COMPLETED" ? "Ya completaste el entrenamiento de hoy. Vuelve mañana para continuar tu racha." : "Ya tienes un registro de entrenamiento para hoy", 409);
    const image = await normalizeAttendanceImage(file); const storage = await canStoreBytes(session.user.id, image.size);
    if (!storage.plan) return fail("PLAN_REQUIRED", "Necesitas un plan activo para registrar evidencias", 403);
    if (!storage.allowed) return fail("STORAGE_LIMIT_REACHED", `Alcanzaste los ${storage.plan.storageLimitMb} MB de almacenamiento de tu plan`, 409);
    const attendanceId = crypto.randomUUID();
    const key = `attendance/${session.user.id}/${attendanceId}/start.webp`;
    await putPrivateObject(key, image.body, image.mimeType);
    const attendance = await prisma.attendance.create({ data: { id: attendanceId, userId: session.user.id, localDate: date, timezone: profile.timezone, startLatitude:location.latitude,startLongitude:location.longitude,startAccuracyMeters:location.accuracy,photos: { create: { ownerId: session.user.id, type: "START", objectKey: key, mimeType: image.mimeType, sizeBytes: image.size, checksum: image.checksum, width: image.width, height: image.height } } } });
    return ok(attendance, "Entrenamiento iniciado", 201);
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, 422);
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") return fail("ATTENDANCE_ALREADY_EXISTS", "Ya registraste un entrenamiento para hoy", 409);
    return fail("INTERNAL_ERROR", "No fue posible iniciar el entrenamiento", 500);
  }
}
