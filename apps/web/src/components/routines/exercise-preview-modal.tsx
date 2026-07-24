"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Dumbbell,
  Image as ImageIcon,
  Play,
  Plus,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { ExerciseVisual } from "./exercise-visual";

export type RoutineExercisePreview = {
  id: string;
  displayName: string;
  target: string;
  equipment: string;
  bodyPart?: string;
  muscleGroup?: string | null;
  instructionsEs?: string;
  instructionStepsEs?: string[];
};

export function ExercisePreviewModal({
  exercise,
  licensed,
  selected = false,
  onClose,
  onToggle,
}: {
  exercise: RoutineExercisePreview;
  licensed: boolean;
  selected?: boolean;
  onClose: () => void;
  onToggle?: () => void;
}) {
  const [animated, setAnimated] = useState(true);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const steps = exercise.instructionStepsEs?.filter(Boolean).length
    ? exercise.instructionStepsEs.filter(Boolean)
    : exercise.instructionsEs
      ? [exercise.instructionsEs]
      : [];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/85 backdrop-blur-lg sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${exercise.displayName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#08111f] shadow-[0_-18px_80px_rgba(0,0,0,.55)] sm:rounded-[2rem]">
        <div className="relative h-[42dvh] min-h-72 shrink-0 sm:h-[28rem]">
          <ExerciseVisual
            licensed={licensed}
            animated={animated}
            exerciseId={exercise.id}
            name={exercise.displayName}
            className="h-full w-full"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-slate-950/80 to-transparent p-4 pb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-[9px] font-black uppercase tracking-[.16em] text-lime-300 backdrop-blur-xl">
              <Sparkles size={12} /> Vista previa
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista previa"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-slate-950/75 text-white backdrop-blur-xl"
            >
              <X size={20} />
            </button>
          </div>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/85 p-1 shadow-xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setAnimated(false)}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase transition ${!animated ? "bg-white text-slate-950" : "text-slate-300"}`}
            >
              <ImageIcon size={14} /> Postura
            </button>
            <button
              type="button"
              onClick={() => setAnimated(true)}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase transition ${animated ? "bg-lime-300 text-slate-950" : "text-slate-300"}`}
            >
              <Play size={14} /> Movimiento
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">
                {exercise.bodyPart || "Movimiento guiado"}
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl">
                {exercise.displayName}
              </h2>
            </div>
            {selected ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-lime-300/10 px-3 py-2 text-[10px] font-black text-lime-300">
                <Check size={14} /> En tu rutina
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/5 bg-slate-950/70 p-3">
              <Target size={16} className="text-lime-300" />
              <small className="mt-2 block text-[9px] font-black uppercase text-slate-500">
                Trabaja
              </small>
              <strong className="mt-0.5 block truncate text-sm capitalize text-white">
                {exercise.target}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-950/70 p-3">
              <Dumbbell size={16} className="text-cyan-300" />
              <small className="mt-2 block text-[9px] font-black uppercase text-slate-500">
                Necesitas
              </small>
              <strong className="mt-0.5 block truncate text-sm capitalize text-white">
                {exercise.equipment}
              </strong>
            </div>
          </div>

          {steps.length ? (
            <div className="mt-5">
              <h3 className="font-black text-white">Así se ejecuta</h3>
              <ol className="mt-3 space-y-2">
                {steps.slice(0, 4).map((step, index) => (
                  <li
                    key={`${exercise.id}-${index}`}
                    className="flex gap-3 rounded-2xl bg-white/[.035] p-3 text-sm leading-5 text-slate-300"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime-300/10 text-[10px] font-black text-lime-300">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black transition ${selected ? "border border-red-300/25 bg-red-400/10 text-red-200" : "bg-lime-300 text-slate-950 shadow-[0_14px_35px_rgba(163,230,53,.18)]"}`}
            >
              {selected ? <X size={18} /> : <Plus size={18} />}
              {selected ? "Quitar de mi rutina" : "Agregar a mi rutina"}
            </button>
          ) : null}
        </div>
      </article>
    </div>
  );
}
