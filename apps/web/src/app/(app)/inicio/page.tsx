import Link from "next/link";
import { getServerSession } from "next-auth";
import { CalendarDays, Dumbbell, Flame, Trophy, type LucideIcon } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";

function currentStreak(dates: Date[]) {
  if (dates.length === 0) return 0;
  const uniqueDays = [...new Set(dates.map((date) => date.toISOString().slice(0, 10)))].sort().reverse();
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const latest = Date.parse(`${uniqueDays[0]}T00:00:00Z`);
  const elapsed = Math.round((todayUtc - latest) / 86_400_000);
  if (elapsed > 1) return 0;
  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previous = Date.parse(`${uniqueDays[index - 1]}T00:00:00Z`);
    const current = Date.parse(`${uniqueDays[index]}T00:00:00Z`);
    if (Math.round((previous - current) / 86_400_000) !== 1) break;
    streak += 1;
  }
  return streak;
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const [points, attendances, activeAttendance, activeChallenges] = await Promise.all([
    prisma.pointLedger.aggregate({ where: { userId, logicalDate: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.attendance.findMany({ where: { userId, status: "COMPLETED", invalidatedAt: null }, select: { localDate: true }, orderBy: { localDate: "desc" } }),
    prisma.attendance.findFirst({ where: { userId, status: "IN_PROGRESS" }, orderBy: { startedAt: "desc" } }),
    prisma.challenge.count({ where: { status: "ACTIVE", participants: { some: { userId } } } }),
  ]);
  const streak = currentStreak(attendances.map(({ localDate }) => localDate));
  const stats: Array<[string, string, LucideIcon]> = [
    ["Puntos del mes", String(points._sum.amount ?? 0), Trophy],
    ["Asistencias", String(attendances.length), CalendarDays],
    ["Racha actual", `${streak} ${streak === 1 ? "día" : "días"}`, Flame],
    ["Retos activos", String(activeChallenges), Dumbbell],
  ];

  return <div className="space-y-5">
    <div><p className="muted">Tu progreso de hoy</p><h1 className="text-3xl font-black">¡Vamos a entrenar!</h1></div>
    <section className="card p-6">
      <span className={`rounded-full px-3 py-1 text-sm ${activeAttendance ? "bg-lime-400/15 text-lime-300" : "bg-slate-700"}`}>{activeAttendance ? "Entrenamiento en curso" : "Sin entrenamiento activo"}</span>
      <h2 className="mt-4 text-2xl font-bold">{activeAttendance ? "Continúa tu entrenamiento" : "Registra tu asistencia"}</h2>
      <p className="my-2 muted">{activeAttendance ? "Cuando termines, agrega tu fotografía final y completa la asistencia." : "Toma una foto al comenzar y construye tu racha."}</p>
      <Link className="btn mt-4" href="/asistencia"><Dumbbell className="mr-2"/> {activeAttendance ? "Ir al entrenamiento" : "Ir a asistencia"}</Link>
    </section>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{stats.map(([label, value, Icon]) => <article className="card p-4" key={label}><Icon className="mb-4 text-lime-400"/><strong className="block text-2xl">{value}</strong><span className="text-sm muted">{label}</span></article>)}</div>
  </div>;
}
