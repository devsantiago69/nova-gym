import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { resolveAppLocale } from "@/lib/i18n/locale";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const dateOnly = (key: string) => new Date(`${key}T00:00:00.000Z`);

function currentStreak(dates: Date[]) {
  if (dates.length === 0) return 0;
  const uniqueDays = [...new Set(dates.map(dayKey))].sort().reverse();
  const todayUtc = Date.parse(`${dayKey(new Date())}T00:00:00Z`);
  const elapsed = Math.round((todayUtc - Date.parse(`${uniqueDays[0]}T00:00:00Z`)) / 86_400_000);
  if (elapsed > 1) return 0;
  let streak = 1;
  for (let index = 1; index < uniqueDays.length; index += 1) {
    if (Math.round((Date.parse(`${uniqueDays[index - 1]}T00:00:00Z`) - Date.parse(`${uniqueDays[index]}T00:00:00Z`)) / 86_400_000) !== 1) break;
    streak += 1;
  }
  return streak;
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { firstName: true, timezone: true, locale: true, localeAuto: true } });
  const timezone = profile?.timezone ?? "America/Bogota";
  const locale = resolveAppLocale({ locale: profile?.locale ?? null, localeAuto: profile?.localeAuto ?? true, timezone });
  const dateLocale = locale === "en" ? "en-US" : "es-CO";
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const today = dateOnly(todayKey);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return { key: dayKey(date), date };
  });
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [points, attendances, todayAttendance, challenges, friendships] = await Promise.all([
    prisma.pointLedger.aggregate({ where: { userId, logicalDate: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.attendance.findMany({ where: { userId, status: "COMPLETED", invalidatedAt: null }, select: { localDate: true }, orderBy: { localDate: "desc" } }),
    prisma.attendance.findFirst({ where: { userId, localDate: today, invalidatedAt: null }, select: { status: true, durationMinutes: true } }),
    prisma.challenge.findMany({
      where: { status: "ACTIVE", participants: { some: { userId } } },
      include: {
        category: true,
        participants: { where: { userId }, select: { score: true } },
        scoreEvents: { where: { userId }, select: { id: true } },
      },
      orderBy: { endsAt: "asc" },
      take: 4,
    }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { include: { profile: true, attendances: { where: { localDate: today, status: "COMPLETED", invalidatedAt: null }, select: { finishedAt: true, durationMinutes: true }, take: 1 } } },
        addressee: { include: { profile: true, attendances: { where: { localDate: today, status: "COMPLETED", invalidatedAt: null }, select: { finishedAt: true, durationMinutes: true }, take: 1 } } },
      },
    }),
  ]);

  const completedKeys = new Set(attendances.map(({ localDate }) => dayKey(localDate)));
  const streak = currentStreak(attendances.map(({ localDate }) => localDate));
  const activeAttendance = todayAttendance?.status === "IN_PROGRESS";
  const completedToday = todayAttendance?.status === "COMPLETED";
  const stats: Array<[string, string, LucideIcon, string]> = [
    ["Puntos del mes", String(points._sum.amount ?? 0), Trophy, "text-lime-300 bg-lime-400/10"],
    ["Asistencias", String(attendances.length), CalendarDays, "text-cyan-300 bg-cyan-400/10"],
    ["Racha actual", `${streak} ${streak === 1 ? "día" : "días"}`, Flame, "text-orange-300 bg-orange-400/10"],
    ["Retos activos", String(challenges.length), Dumbbell, "text-violet-300 bg-violet-400/10"],
  ];
  const friends = friendships.map((row) => row.requesterId === userId ? row.addressee : row.requester).map((friend) => ({
    id: friend.id,
    username: friend.username,
    name: `${friend.profile?.firstName ?? ""} ${friend.profile?.lastName ?? ""}`.trim() || friend.username,
    attendance: friend.attendances[0],
  })).sort((left, right) => Number(Boolean(right.attendance)) - Number(Boolean(left.attendance)));
  const friendsDone = friends.filter((friend) => friend.attendance).length;

  return <div className="space-y-7 pb-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-black uppercase tracking-[.14em] text-lime-400">TU CENTRO DE PROGRESO</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-black sm:text-5xl">Hola, {profile?.firstName ?? session!.user.name ?? "atleta"} <Sparkles className="h-7 w-7 shrink-0 text-lime-300 sm:h-9 sm:w-9" aria-hidden="true"/></h1><p className="mt-2 muted">Tu constancia, tu equipo y tus retos en un solo lugar.</p></div>
      <Link href="/asistencia" className="btn inline-flex items-center gap-2 px-5 py-3"><Dumbbell size={18}/>{completedToday ? "Ver mi entrenamiento" : activeAttendance ? "Continuar entrenamiento" : "Registrar asistencia"}</Link>
    </header>

    <section className="relative isolate overflow-hidden rounded-[32px] border border-lime-400/20 bg-gradient-to-br from-slate-900 via-emerald-950/55 to-slate-950 p-6 shadow-[0_25px_80px_rgba(34,197,94,.08)] sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl"/>
      <div className="grid gap-7 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${completedToday ? "bg-lime-400/15 text-lime-300" : activeAttendance ? "bg-orange-400/15 text-orange-300" : "bg-slate-800 text-slate-300"}`}>{completedToday ? <CheckCircle2 size={15}/> : <Activity size={15}/>} {completedToday ? "MISIÓN DE HOY COMPLETADA" : activeAttendance ? "ENTRENAMIENTO EN CURSO" : "TU DÍA ESTÁ LISTO"}</span><h2 className="mt-4 text-3xl font-black sm:text-4xl">{completedToday ? "Hoy ya sumaste." : activeAttendance ? "Termina fuerte." : "Haz que hoy cuente."}</h2><p className="mt-2 max-w-lg text-slate-300">{completedToday ? "Tu entrenamiento ya impulsa tu racha y tus retos activos." : activeAttendance ? "Agrega la foto final para cerrar tu sesión y sumar progreso." : "Registra tu entrenamiento y comparte el avance con tu equipo."}</p></div>
        <div className="grid grid-cols-7 gap-2">{week.map(({ key, date }) => { const done = completedKeys.has(key); const isToday = key === todayKey; return <div key={key} className={`rounded-2xl border px-1 py-3 text-center ${done ? "border-lime-400/40 bg-lime-400/15" : isToday ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/5 bg-black/20"}`}><span className="block text-[10px] font-black uppercase text-slate-400">{date.toLocaleDateString(dateLocale, { timeZone: "UTC", weekday: "narrow" })}</span><span className={`mt-2 grid h-8 place-items-center text-sm font-black ${done ? "mx-auto w-8 rounded-full bg-lime-400 text-slate-950" : "text-slate-300"}`}>{done ? <CheckCircle2 size={17}/> : date.getUTCDate()}</span></div>; })}</div>
      </div>
    </section>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{stats.map(([label, value, Icon, color]) => <article className="card p-4 sm:p-5" key={label}><span className={`grid h-11 w-11 place-items-center rounded-2xl ${color}`}><Icon size={21}/></span><strong className="mt-4 block text-2xl sm:text-3xl">{value}</strong><span className="text-xs muted sm:text-sm">{label}</span></article>)}</div>

    <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-5 sm:p-6"><div><p className="text-xs font-black text-cyan-300">PULSO DE TU EQUIPO</p><h2 className="mt-1 text-2xl font-black">¿Quién entrenó hoy?</h2></div><Link href="/comunidad" aria-label="Ver comunidad" className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:border-cyan-400"><ArrowUpRight size={19}/></Link></div>
        <div className="p-4 sm:p-5">
          <div className="mb-5 rounded-2xl bg-slate-950/70 p-4"><div className="flex items-center justify-between text-sm"><span className="muted">Equipo activo hoy</span><strong className="text-cyan-300">{friendsDone} de {friends.length}</strong></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-lime-400" style={{ width: `${friends.length ? Math.round(friendsDone / friends.length * 100) : 0}%` }}/></div></div>
          {friends.length === 0 ? <div className="py-8 text-center"><UsersRound className="mx-auto h-10 w-10 text-slate-600"/><p className="mt-3 font-bold">Tu equipo empieza aquí</p><Link href="/comunidad" className="mt-2 inline-block text-sm font-bold text-lime-300">Encontrar amigos</Link></div> : <div className="grid gap-2 sm:grid-cols-2">{friends.slice(0, 6).map((friend) => <article key={friend.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-black ${friend.attendance ? "bg-lime-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>{friend.name.charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{friend.name}</strong><span className={`mt-0.5 inline-flex items-center gap-1 text-xs ${friend.attendance ? "text-lime-300" : "text-slate-500"}`}>{friend.attendance ? <><CheckCircle2 size={13}/>Ya entrenó</> : <><Clock3 size={13}/>Aún no registra</>}</span></div>{friend.attendance?.durationMinutes && <small className="text-slate-500">{friend.attendance.durationMinutes} min</small>}</article>)}</div>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-5 sm:p-6"><div><p className="text-xs font-black text-orange-300">TUS RETOS</p><h2 className="mt-1 text-2xl font-black">La meta está cerca</h2></div><Link href="/retos" aria-label="Ver retos" className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:border-orange-400"><ArrowUpRight size={19}/></Link></div>
        <div className="space-y-3 p-4 sm:p-5">{challenges.length === 0 ? <div className="py-8 text-center"><Target className="mx-auto h-10 w-10 text-slate-600"/><p className="mt-3 font-bold">Activa tu primera meta</p><Link href="/retos" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-lime-300">Explorar retos <ChevronRight size={15}/></Link></div> : challenges.map((challenge) => { const count = challenge.scoreEvents.length; const progress = Math.min(100, Math.round(count / challenge.targetValue * 100)); return <Link href="/retos" key={challenge.id} className="block rounded-2xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-orange-400/40"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate">{challenge.name}</strong><span className="text-xs muted">{count} de {challenge.targetValue} asistencias</span></div><span className="rounded-full bg-orange-400/10 px-2.5 py-1 text-xs font-black text-orange-300">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-lime-400" style={{ width: `${progress}%` }}/></div><div className="mt-3 flex items-center justify-between text-xs"><span className="inline-flex items-center gap-1 text-slate-400"><Flame size={13} className="text-orange-400"/>{challenge.participants[0]?.score ?? 0} puntos</span><span className="text-slate-500">{Math.max(0, challenge.targetValue - count)} para la meta</span></div></Link>; })}</div>
      </section>
    </div>

    <section className="grid gap-3 sm:grid-cols-3">
      <Link href="/asistencia" className="group card flex items-center gap-4 p-5 transition hover:-translate-y-1 hover:border-lime-400/40"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-400/10 text-lime-300"><Dumbbell/></span><div className="flex-1"><strong>Registrar entrenamiento</strong><p className="text-xs muted">Suma a tu racha diaria</p></div><ChevronRight className="text-slate-600 group-hover:text-lime-300"/></Link>
      <Link href="/retos" className="group card flex items-center gap-4 p-5 transition hover:-translate-y-1 hover:border-orange-400/40"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-400/10 text-orange-300"><Flame/></span><div className="flex-1"><strong>Ver historias del equipo</strong><p className="text-xs muted">Valida esfuerzos privados</p></div><ChevronRight className="text-slate-600 group-hover:text-orange-300"/></Link>
      <Link href="/comunidad" className="group card flex items-center gap-4 p-5 transition hover:-translate-y-1 hover:border-cyan-400/40"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300"><UsersRound/></span><div className="flex-1"><strong>Ampliar mi equipo</strong><p className="text-xs muted">Conecta y crea nuevos retos</p></div><ChevronRight className="text-slate-600 group-hover:text-cyan-300"/></Link>
    </section>
  </div>;
}
