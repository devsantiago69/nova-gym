import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { authOptions } from "@/lib/auth";
import { resolveAppLocale } from "@/lib/i18n/locale";

function dateInTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  const [rows, profile] = await Promise.all([
    prisma.attendance.findMany({ where: { userId: session!.user.id }, include: { photos: { select: { id: true, type: true } }, pointMovements: { select: { amount: true } } }, orderBy: { localDate: "desc" }, take: 370 }),
    prisma.userProfile.findUnique({ where: { userId: session!.user.id }, select: { timezone: true, locale: true, localeAuto: true } }),
  ]);
  const timezone = profile?.timezone ?? "America/Bogota";
  const locale = resolveAppLocale({ locale: profile?.locale ?? null, localeAuto: profile?.localeAuto ?? true, timezone });
  return <section><p className="text-sm font-bold text-lime-400">MI ACTIVIDAD</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Asistencia</h1><p className="mb-7 mt-2 muted">Registra cada entrenamiento, construye tu constancia y consulta tu calendario.</p><AttendanceManager locale={locale} todayKey={dateInTimezone(timezone)} initial={rows.map(row=>({id:row.id,localDate:row.localDate.toISOString(),status:row.status,startedAt:row.startedAt.toISOString(),finishedAt:row.finishedAt?.toISOString()??null,durationMinutes:row.durationMinutes,timezone:row.timezone,startLatitude:row.startLatitude===null?null:Number(row.startLatitude),startLongitude:row.startLongitude===null?null:Number(row.startLongitude),startAccuracyMeters:row.startAccuracyMeters===null?null:Number(row.startAccuracyMeters),endLatitude:row.endLatitude===null?null:Number(row.endLatitude),endLongitude:row.endLongitude===null?null:Number(row.endLongitude),endAccuracyMeters:row.endAccuracyMeters===null?null:Number(row.endAccuracyMeters),photos:row.photos,pointMovements:row.pointMovements}))}/></section>;
}
