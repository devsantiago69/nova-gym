import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { ArrowLeft, Clock3, Dumbbell, Gauge } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { RoutineExerciseList } from "@/components/routines/routine-exercise-list";
import { StartRoutineButton } from "@/components/routines/start-routine-button";
import { routineInclude } from "@/modules/routines/queries";

export default async function RoutineDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const auth = await getServerSession(authOptions);
  const { slug } = await params;
  if (!auth) redirect("/login");
  const routine = await prisma.routine.findFirst({
    where: { slug, OR: [{ isPublic: true }, { ownerId: auth.user.id }] },
    include: routineInclude,
  });
  if (!routine) notFound();
  const licensed = process.env.EXERCISE_MEDIA_LICENSED === "1";
  return (
    <div className="mx-auto max-w-3xl pb-10">
      <Link
        href="/rutinas"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-400"
      >
        <ArrowLeft size={17} /> Rutinas
      </Link>
      <header className="mt-5 rounded-[2rem] border border-slate-700 bg-[linear-gradient(145deg,rgba(163,230,53,.11),rgba(34,211,238,.04),#080f1d)] p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-lime-300">
          {routine.goal}
        </p>
        <h1 className="mt-2 text-4xl font-black">{routine.name}</h1>
        <p className="mt-3 leading-6 text-slate-300">{routine.description}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <span className="rounded-2xl bg-black/25 p-3">
            <Clock3 className="mx-auto text-cyan-300" size={20} />
            <strong className="mt-1 block">{routine.estimatedMinutes}</strong>
            <small className="text-slate-500">minutos</small>
          </span>
          <span className="rounded-2xl bg-black/25 p-3">
            <Dumbbell className="mx-auto text-lime-300" size={20} />
            <strong className="mt-1 block">{routine.exercises.length}</strong>
            <small className="text-slate-500">ejercicios</small>
          </span>
          <span className="rounded-2xl bg-black/25 p-3">
            <Gauge className="mx-auto text-orange-300" size={20} />
            <strong className="mt-1 block text-xs">
              {routine.difficulty === "BEGINNER"
                ? "Inicial"
                : routine.difficulty === "INTERMEDIATE"
                  ? "Media"
                  : "Avanzada"}
            </strong>
            <small className="text-slate-500">nivel</small>
          </span>
        </div>
        <div className="mt-6">
          <StartRoutineButton routineId={routine.id} />
        </div>
      </header>
      <section className="mt-8">
        <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">
          Tu recorrido
        </p>
        <h2 className="mt-1 text-2xl font-black">Ejercicios de hoy</h2>
        <p className="mt-2 text-sm text-slate-400">
          Abre cualquier movimiento para revisar su postura, animación y técnica.
        </p>
        <RoutineExerciseList
          licensed={licensed}
          items={routine.exercises.map((item) => ({
            id: item.id,
            sets: item.sets,
            reps: item.reps,
            durationSeconds: item.durationSeconds,
            restSeconds: item.restSeconds,
            exercise: {
              id: item.exercise.id,
              displayName: item.exercise.nameEs || item.exercise.name,
              target: item.exercise.target,
              equipment: item.exercise.equipment,
              bodyPart: item.exercise.bodyPart,
              muscleGroup: item.exercise.muscleGroup,
              instructionsEs: item.exercise.instructionsEs,
              instructionStepsEs: item.exercise.instructionStepsEs,
            },
          }))}
        />
      </section>
    </div>
  );
}
