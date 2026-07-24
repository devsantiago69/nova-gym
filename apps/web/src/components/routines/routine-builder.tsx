"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Eye,
  Flame,
  Gauge,
  HeartPulse,
  LoaderCircle,
  Minus,
  Move3d,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import { ExerciseVisual } from "./exercise-visual";
import {
  ExercisePreviewModal,
  type RoutineExercisePreview,
} from "./exercise-preview-modal";

type Exercise = RoutineExercisePreview;
type Picked = Exercise & { sets: number; reps: number; restSeconds: number };

const goals = [
  { label: "Ganar fuerza", detail: "Más potencia y control", icon: Zap },
  {
    label: "Aumentar masa muscular",
    detail: "Volumen y progresión",
    icon: Dumbbell,
  },
  { label: "Bajar grasa", detail: "Ritmo y gasto energético", icon: Flame },
  {
    label: "Mejorar resistencia",
    detail: "Más capacidad y constancia",
    icon: HeartPulse,
  },
  {
    label: "Movilidad y bienestar",
    detail: "Movimiento y recuperación",
    icon: Move3d,
  },
];

const steps = [
  { number: 1, label: "Objetivo" },
  { number: 2, label: "Ejercicios" },
  { number: 3, label: "Series" },
  { number: 4, label: "Vista previa" },
];

export function RoutineBuilder({ licensed }: { licensed: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState(goals[0]!.label);
  const [difficulty, setDifficulty] = useState("BEGINNER");
  const [minutes, setMinutes] = useState(30);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingExercises(true);
      try {
        const response = await fetch(
          `/api/v1/exercises?query=${encodeURIComponent(query)}&take=36`,
          { signal: controller.signal },
        );
        if (response.ok) setResults((await response.json()).data);
      } finally {
        if (!controller.signal.aborted) setLoadingExercises(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const totals = useMemo(
    () => ({
      exercises: picked.length,
      sets: picked.reduce((total, item) => total + item.sets, 0),
      reps: picked.reduce((total, item) => total + item.sets * item.reps, 0),
    }),
    [picked],
  );

  const isSelected = (id: string) => picked.some((item) => item.id === id);

  function toggle(exercise: Exercise) {
    if (isSelected(exercise.id)) {
      setPicked((current) => current.filter((item) => item.id !== exercise.id));
      setNotice(`${exercise.displayName} salió de tu rutina`);
      return;
    }
    setPicked((current) => [
      ...current,
      { ...exercise, sets: 3, reps: 10, restSeconds: 60 },
    ]);
    setNotice(`${exercise.displayName} se agregó a tu recorrido`);
  }

  function update(id: string, values: Partial<Picked>) {
    setPicked((current) =>
      current.map((item) => (item.id === id ? { ...item, ...values } : item)),
    );
  }

  function move(id: string, direction: -1 | 1) {
    setPicked((current) => {
      const from = current.findIndex((item) => item.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      const moved = next[from]!;
      next[from] = next[to]!;
      next[to] = moved;
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          goal,
          difficulty,
          estimatedMinutes: minutes,
          exercises: picked.map((item) => ({
            exerciseId: item.id,
            sets: item.sets,
            reps: item.reps,
            restSeconds: item.restSeconds,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(
          payload.errors?.[0]?.message ??
            payload.message ??
            "No pudimos guardar la rutina. Revisa los datos.",
        );
        return;
      }
      setNotice("Rutina creada. Estamos preparando tu recorrido...");
      router.push(`/rutinas/${payload.data.slug}`);
      router.refresh();
    } catch {
      setMessage("Perdimos la conexión. Intenta guardar nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  const currentStep = steps[step - 1] ?? steps[0]!;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_85%_5%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_10%_95%,rgba(163,230,53,.15),transparent_34%),#0a1322] p-5 shadow-[0_30px_90px_rgba(0,0,0,.28)] sm:p-8">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">
              <Sparkles size={12} /> Constructor Nova
            </span>
            <h1 className="mt-3 max-w-xl text-3xl font-black leading-[1.05] text-white sm:text-5xl">
              Diseña una rutina que se sienta tuya.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Revisa cada movimiento, organiza el orden y confirma el recorrido
              antes de guardarlo.
            </p>
          </div>
          <span className="hidden rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-right sm:block">
            <small className="block text-[9px] font-black uppercase tracking-wider text-lime-300">
              Tu sesión
            </small>
            <strong className="text-lg text-white">{minutes} min</strong>
          </span>
        </div>

        <div className="relative mt-6 grid grid-cols-4 gap-2">
          {steps.map((item) => (
            <button
              key={item.number}
              type="button"
              disabled={item.number > step || (item.number > 2 && !picked.length)}
              onClick={() => setStep(item.number)}
              className="min-w-0 text-left disabled:cursor-not-allowed"
            >
              <span
                className={`block h-1.5 rounded-full transition ${item.number <= step ? "bg-gradient-to-r from-lime-300 to-cyan-300" : "bg-slate-700"}`}
              />
              <span
                className={`mt-2 hidden text-[9px] font-black uppercase tracking-wider sm:block ${item.number === step ? "text-white" : "text-slate-600"}`}
              >
                {item.number}. {item.label}
              </span>
            </button>
          ))}
        </div>
        <p className="relative mt-3 text-[10px] font-black uppercase tracking-[.18em] text-lime-300 sm:hidden">
          Paso {currentStep.number} · {currentStep.label}
        </p>
      </header>

      {notice ? (
        <div
          aria-live="polite"
          className="fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[150] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-lime-300/25 bg-[#101d20]/95 p-4 text-sm font-bold text-lime-100 shadow-2xl backdrop-blur-xl"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-300 text-slate-950">
            <Check size={17} />
          </span>
          {notice}
        </div>
      ) : null}

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-slate-900/55 p-5 shadow-[0_25px_70px_rgba(0,0,0,.18)] backdrop-blur-xl sm:p-8">
        {step === 1 ? (
          <div className="mx-auto max-w-3xl">
            <StepHeading
              eyebrow="Paso 1 · Tu intención"
              title="¿Qué quieres conseguir?"
              description="Dale identidad a la sesión para reconocerla fácilmente cuando quieras volver a entrenar."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre de la rutina" hint="Mínimo 3 caracteres">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Piernas imparables"
                  className="control"
                  maxLength={140}
                />
              </Field>
              <Field label="Tiempo aproximado" hint="Puedes ajustarlo después">
                <div className="flex h-[3.35rem] items-center rounded-2xl border border-slate-700 bg-slate-950 p-2">
                  <button
                    type="button"
                    aria-label="Restar cinco minutos"
                    onClick={() => setMinutes(Math.max(5, minutes - 5))}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-300"
                  >
                    <Minus size={17} />
                  </button>
                  <strong className="flex-1 text-center text-white">
                    <Clock3 size={15} className="mr-2 inline text-cyan-300" />
                    {minutes} min
                  </strong>
                  <button
                    type="button"
                    aria-label="Sumar cinco minutos"
                    onClick={() => setMinutes(Math.min(240, minutes + 5))}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-300"
                  >
                    <Plus size={17} />
                  </button>
                </div>
              </Field>
            </div>

            <Field
              label="¿Cómo será este entrenamiento?"
              hint={`${description.length}/600 caracteres`}
              className="mt-4"
            >
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={600}
                placeholder="Ej. Una sesión intensa de tren inferior, priorizando técnica y control..."
                className="control resize-none"
              />
            </Field>

            <p className="mt-6 text-sm font-black text-white">
              Objetivo principal
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {goals.map(({ label, detail, icon: Icon }) => {
                const active = goal === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setGoal(label)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-lime-300/60 bg-lime-300/10 shadow-[inset_0_0_25px_rgba(163,230,53,.06)]" : "border-slate-700 bg-slate-950/60 hover:border-slate-500"}`}
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${active ? "bg-lime-300 text-slate-950" : "bg-slate-800 text-slate-400"}`}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-white">{label}</strong>
                      <small className="mt-0.5 block text-slate-500">{detail}</small>
                    </span>
                    {active ? <Check size={18} className="text-lime-300" /> : null}
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-sm font-black text-white">Tu nivel actual</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([
                ["BEGINNER", "Inicial", "Voy paso a paso"],
                ["INTERMEDIATE", "Intermedio", "Ya tengo ritmo"],
                ["ADVANCED", "Avanzado", "Busco intensidad"],
              ] as const).map(([value, label, detail]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  className={`rounded-2xl border p-3 text-left transition ${difficulty === value ? "border-cyan-300/60 bg-cyan-300/10" : "border-slate-700 bg-slate-950/60"}`}
                >
                  <Gauge size={17} className="text-cyan-300" />
                  <strong className="mt-2 block text-xs text-white">{label}</strong>
                  <small className="mt-1 hidden text-[9px] text-slate-500 sm:block">
                    {detail}
                  </small>
                </button>
              ))}
            </div>

            <PrimaryButton
              disabled={name.trim().length < 3 || description.trim().length < 10}
              onClick={() => setStep(2)}
            >
              Diseñar mi recorrido <ArrowRight size={18} />
            </PrimaryButton>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <StepHeading
              eyebrow="Paso 2 · Tu recorrido"
              title="Elige y revisa cada movimiento"
              description="Toca Vista previa para comprobar técnica y animación. Solo se agrega cuando tú lo confirmas."
            />

            {picked.length ? (
              <div className="mt-5 rounded-[1.5rem] border border-lime-300/20 bg-lime-300/[.055] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-lime-300">
                      Tu recorrido actual
                    </p>
                    <strong className="mt-1 block text-sm text-white">
                      {picked.length} {picked.length === 1 ? "ejercicio" : "ejercicios"} seleccionado{picked.length === 1 ? "" : "s"}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-xl bg-lime-300 px-3 py-2 text-[10px] font-black text-slate-950"
                  >
                    Configurar
                  </button>
                </div>
                <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {picked.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreview(item)}
                      className="flex min-w-[11rem] snap-start items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-2 text-left"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                        <ExerciseVisual
                          licensed={licensed}
                          exerciseId={item.id}
                          name={item.displayName}
                          showModeLabel={false}
                          className="h-full w-full"
                        />
                      </div>
                      <span className="min-w-0">
                        <small className="font-black text-lime-300">{index + 1}</small>
                        <strong className="block truncate text-xs text-white">
                          {item.displayName}
                        </strong>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 shadow-inner focus-within:border-cyan-300">
              <Search className="text-slate-500" size={20} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca ejercicio, músculo o equipo"
                className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-slate-600"
              />
              {loadingExercises ? (
                <LoaderCircle className="animate-spin text-cyan-300" size={18} />
              ) : query ? (
                <button type="button" onClick={() => setQuery("")}>
                  <Minus size={18} className="text-slate-500" />
                </button>
              ) : null}
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {results.map((exercise) => {
                const selected = isSelected(exercise.id);
                return (
                  <article
                    key={exercise.id}
                    className={`group overflow-hidden rounded-[1.4rem] border bg-slate-950/75 transition ${selected ? "border-lime-300/55 shadow-[0_0_0_1px_rgba(163,230,53,.08)]" : "border-slate-800 hover:border-cyan-300/35"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setPreview(exercise)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <ExerciseVisual
                          licensed={licensed}
                          exerciseId={exercise.id}
                          name={exercise.displayName}
                          showModeLabel={false}
                          className="h-full w-full"
                        />
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/75 px-2.5 py-1.5 text-[9px] font-black text-white backdrop-blur-md">
                          <Eye size={12} /> Vista previa
                        </span>
                        {selected ? (
                          <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-lime-300 text-slate-950 shadow-lg">
                            <Check size={16} />
                          </span>
                        ) : null}
                      </div>
                      <div className="p-3 pb-2">
                        <strong className="line-clamp-2 min-h-10 text-sm leading-5 text-white">
                          {exercise.displayName}
                        </strong>
                        <small className="mt-1 block truncate capitalize text-slate-500">
                          {exercise.target} · {exercise.equipment}
                        </small>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(exercise)}
                      className={`m-3 mt-1 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 rounded-xl py-2.5 text-[10px] font-black transition ${selected ? "bg-lime-300/10 text-lime-300" : "bg-slate-800 text-slate-200 hover:bg-lime-300 hover:text-slate-950"}`}
                    >
                      {selected ? <Check size={14} /> : <Plus size={14} />}
                      {selected ? "Agregado" : "Agregar"}
                    </button>
                  </article>
                );
              })}
            </div>

            {!loadingExercises && !results.length ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-700 p-10 text-center">
                <Search className="mx-auto text-slate-600" />
                <p className="mt-3 font-black text-white">No encontramos coincidencias</p>
                <p className="mt-1 text-xs text-slate-500">
                  Prueba con un músculo, equipo u otro nombre.
                </p>
              </div>
            ) : null}

            <StepNavigation
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextLabel="Configurar series"
              disabled={!picked.length}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <StepHeading
              eyebrow="Paso 3 · Tu ritmo"
              title="Ordena y configura la sesión"
              description="Ajusta series, repeticiones y descansos. Puedes abrir nuevamente cualquier ejercicio."
            />

            <div className="mt-6 space-y-3">
              {picked.map((item, index) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-700/80 bg-slate-950/75"
                >
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    <button
                      type="button"
                      onClick={() => setPreview(item)}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
                      aria-label={`Ver ${item.displayName}`}
                    >
                      <ExerciseVisual
                        licensed={licensed}
                        exerciseId={item.id}
                        name={item.displayName}
                        showModeLabel={false}
                        className="h-full w-full"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-slate-950/20 opacity-0 transition hover:opacity-100">
                        <Eye size={20} />
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-lime-300">
                        Movimiento {index + 1}
                      </span>
                      <h3 className="mt-1 line-clamp-2 font-black text-white">
                        {item.displayName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setPreview(item)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300"
                      >
                        <Eye size={12} /> Revisar técnica
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(item.id, -1)}
                        aria-label="Mover arriba"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 disabled:opacity-25"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === picked.length - 1}
                        onClick={() => move(item.id, 1)}
                        aria-label="Mover abajo"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-slate-300 disabled:opacity-25"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked((current) =>
                            current.filter((row) => row.id !== item.id),
                          );
                          setNotice(`${item.displayName} se eliminó`);
                        }}
                        aria-label="Eliminar ejercicio"
                        className="col-span-2 grid h-8 place-items-center rounded-lg bg-red-400/10 text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-px border-t border-white/5 bg-white/5">
                    {[
                      ["Series", "sets", item.sets, 1, 10],
                      ["Repeticiones", "reps", item.reps, 1, 200],
                      ["Descanso (s)", "restSeconds", item.restSeconds, 0, 600],
                    ].map(([label, key, value, min, max]) => (
                      <label
                        key={String(key)}
                        className="bg-slate-950/90 p-3 text-center"
                      >
                        <span className="block truncate text-[8px] font-black uppercase tracking-wider text-slate-500 sm:text-[10px]">
                          {label}
                        </span>
                        <input
                          type="number"
                          min={Number(min)}
                          max={Number(max)}
                          value={Number(value)}
                          onChange={(event) =>
                            update(item.id, {
                              [String(key)]: Math.max(
                                Number(min),
                                Math.min(Number(max), Number(event.target.value)),
                              ),
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-center text-sm font-black text-white outline-none focus:border-lime-300"
                        />
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {!picked.length ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-700 p-8 text-center">
                <Dumbbell className="mx-auto text-slate-600" />
                <p className="mt-3 font-black text-white">Tu recorrido quedó vacío</p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-3 text-sm font-black text-lime-300"
                >
                  Volver a elegir ejercicios
                </button>
              </div>
            ) : null}

            <StepNavigation
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextLabel="Ver rutina completa"
              disabled={!picked.length}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <StepHeading
              eyebrow="Paso 4 · Antes de guardar"
              title="Así quedó tu entrenamiento"
              description="Revísalo completo. Puedes volver y cambiar cualquier dato o movimiento."
            />

            <div className="relative mt-6 overflow-hidden rounded-[1.8rem] border border-lime-300/20 bg-[radial-gradient(circle_at_90%_10%,rgba(163,230,53,.18),transparent_32%),linear-gradient(145deg,#101b2d,#070d18)] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-3 py-1 text-[9px] font-black uppercase text-slate-950">
                    <Trophy size={12} /> Lista para entrenar
                  </span>
                  <h2 className="mt-4 text-3xl font-black leading-tight text-white">
                    {name}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    {description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="shrink-0 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-[10px] font-black text-cyan-200"
                >
                  Editar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Metric icon={Clock3} value={`${minutes}`} label="minutos" />
                <Metric icon={Dumbbell} value={`${totals.exercises}`} label="ejercicios" />
                <Metric icon={Target} value={`${totals.sets}`} label="series" />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">
                  Orden de la sesión
                </p>
                <h3 className="mt-1 text-xl font-black text-white">Tu recorrido</h3>
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-black text-slate-300"
              >
                Cambiar orden
              </button>
            </div>

            <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {picked.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPreview(item)}
                  className="min-w-[72vw] max-w-[18rem] snap-center overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950 text-left sm:min-w-[17rem]"
                >
                  <div className="relative aspect-[16/10]">
                    <ExerciseVisual
                      licensed={licensed}
                      exerciseId={item.id}
                      name={item.displayName}
                      showModeLabel={false}
                      className="h-full w-full"
                    />
                    <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-lime-300 text-xs font-black text-slate-950">
                      {index + 1}
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur">
                      <Eye size={11} className="mr-1 inline" /> Ver movimiento
                    </span>
                  </div>
                  <div className="p-4">
                    <strong className="line-clamp-2 text-sm text-white">
                      {item.displayName}
                    </strong>
                    <p className="mt-2 text-[10px] font-bold text-slate-400">
                      {item.sets} series × {item.reps} reps · {item.restSeconds}s de descanso
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.055] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="shrink-0 text-cyan-300" size={20} />
                <div>
                  <strong className="text-sm text-white">Todo queda editable antes de guardar</strong>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Regresa a cualquier paso para cambiar ejercicios, orden, series o identidad.
                  </p>
                </div>
              </div>
            </div>

            {message ? (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm font-bold text-red-200"
              >
                {message}
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-[.75fr_1.5fr] gap-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 py-4 text-sm font-black text-slate-300"
              >
                <ArrowLeft size={17} /> Cambiar
              </button>
              <button
                type="button"
                disabled={busy || !picked.length}
                onClick={() => void save()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-lime-300 py-4 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(163,230,53,.18)] disabled:opacity-50"
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Check size={18} />
                )}
                {busy ? "Creando tu rutina..." : "Guardar mi rutina"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {preview ? (
        <ExercisePreviewModal
          exercise={preview}
          licensed={licensed}
          selected={isSelected(preview.id)}
          onClose={() => setPreview(null)}
          onToggle={() => toggle(preview)}
        />
      ) : null}
    </div>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-lime-300">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-white">{label}</span>
        <small className="text-[9px] font-bold text-slate-500">{hint}</small>
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-300 py-4 text-sm font-black text-slate-950 shadow-[0_16px_40px_rgba(163,230,53,.18)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StepNavigation({
  onBack,
  onNext,
  nextLabel,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-7 grid grid-cols-[.7fr_1.4fr] gap-2">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 py-4 text-sm font-black text-slate-300"
      >
        <ArrowLeft size={17} /> Atrás
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onNext}
        className="flex items-center justify-center gap-2 rounded-2xl bg-lime-300 py-4 text-sm font-black text-slate-950 disabled:opacity-40"
      >
        {nextLabel} <ChevronRight size={17} />
      </button>
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock3;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/55 p-3 text-center backdrop-blur">
      <Icon size={17} className="mx-auto text-cyan-300" />
      <strong className="mt-2 block text-xl text-white">{value}</strong>
      <small className="text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </small>
    </div>
  );
}
