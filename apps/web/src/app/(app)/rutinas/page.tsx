import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { Activity, ArrowRight, Clock3, Dumbbell, Flame, Plus, Sparkles, TimerReset } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { ExerciseVisual } from "@/components/routines/exercise-visual";
import { routineInclude } from "@/modules/routines/queries";

const difficulty = { BEGINNER: "Inicial", INTERMEDIATE: "Intermedia", ADVANCED: "Avanzada" } as const;

export default async function RoutinesPage() {
  const auth = await getServerSession(authOptions);
  if (!auth) redirect("/login");
  const userId = auth.user.id;
  const [routines, active, completed] = await Promise.all([
    prisma.routine.findMany({ where: { OR: [{ isPublic: true }, { ownerId: userId }] }, include: routineInclude, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }] }),
    prisma.workoutSession.findFirst({ where: { userId, status: { in: ["ACTIVE", "PAUSED"] } }, include: { routine: true }, orderBy: { createdAt: "desc" } }),
    prisma.workoutSession.count({ where: { userId, status: "COMPLETED" } }),
  ]);
  const licensed = process.env.EXERCISE_MEDIA_LICENSED === "1";
  return <div className="space-y-8 pb-8">
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-700/70 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_15%_85%,rgba(163,230,53,.16),transparent_35%),#0b1424] p-6 sm:p-9">
      <div className="relative max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full bg-lime-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-lime-300"><Sparkles size={13}/> Nova Training</span><h1 className="mt-4 text-4xl font-black leading-none sm:text-6xl">Tu entrenamiento.<br/><span className="text-lime-300">Tu ritmo.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Elige una rutina, sigue cada movimiento y deja que Nova mida tu tiempo, series y progreso.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/rutinas/crear" className="btn gap-2 px-5 py-3"><Plus size={18}/> Crear mi rutina</Link><Link href="/rutinas/ejercicios" className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-200"><Dumbbell size={18}/> Ver ejercicios</Link><span className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-black/20 px-4 text-xs font-bold"><Flame className="text-orange-300" size={17}/>{completed} sesiones completadas</span></div></div>
    </section>
    {active ? <Link href={`/rutinas/sesion/${active.id}`} className="group flex items-center gap-4 rounded-[1.6rem] border border-lime-300/30 bg-lime-300/10 p-4 transition hover:bg-lime-300/15"><span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lime-300 text-slate-950"><TimerReset/><span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-slate-900 bg-orange-400"/></span><span className="min-w-0 flex-1"><small className="font-black uppercase tracking-widest text-lime-300">Entrenamiento {active.status === "PAUSED" ? "en pausa" : "en curso"}</small><strong className="mt-1 block truncate text-lg">{active.routine.name}</strong><span className="text-xs text-slate-400">Toca para continuar exactamente donde quedaste</span></span><ArrowRight className="text-lime-300 transition group-hover:translate-x-1"/></Link> : null}
    <section><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Seleccionadas para ti</p><h2 className="mt-1 text-2xl font-black">Rutinas Nova</h2></div><Dumbbell className="text-slate-700"/></div><div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{routines.map((routine) => { const first = routine.exercises[0]?.exercise; return <Link key={routine.id} href={`/rutinas/${routine.slug}`} className="group min-w-[82vw] max-w-sm snap-center overflow-hidden rounded-[1.7rem] border border-slate-700 bg-slate-900/80 sm:min-w-[21rem]"><div className="relative h-44">{first ? <ExerciseVisual licensed={licensed} exerciseId={first.id} name={first.nameEs || first.name} className="h-full w-full"/> : null}<span className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/65 px-3 py-1 text-[10px] font-black uppercase text-white backdrop-blur">{routine.ownerId ? "Creada por ti" : "Nova original"}</span></div><div className="p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black">{routine.name}</h3><ArrowRight className="shrink-0 text-lime-300 transition group-hover:translate-x-1"/></div><p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-400">{routine.description}</p><div className="mt-4 flex gap-2 text-[10px] font-bold"><span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-cyan-200"><Clock3 size={11} className="mr-1 inline"/>{routine.estimatedMinutes} min</span><span className="rounded-full bg-orange-300/10 px-2.5 py-1 text-orange-200"><Activity size={11} className="mr-1 inline"/>{routine.exercises.length} ejercicios</span><span className="rounded-full bg-slate-800 px-2.5 py-1">{difficulty[routine.difficulty]}</span></div></div></Link>})}</div></section>
  </div>;
}
