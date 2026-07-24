"use client";

import { useState } from "react";
import { Eye, Repeat2, Timer } from "lucide-react";
import { ExerciseVisual } from "./exercise-visual";
import {
  ExercisePreviewModal,
  type RoutineExercisePreview,
} from "./exercise-preview-modal";

type RoutineExerciseItem = {
  id: string;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  exercise: RoutineExercisePreview;
};

export function RoutineExerciseList({
  items,
  licensed,
}: {
  items: RoutineExerciseItem[];
  licensed: boolean;
}) {
  const [preview, setPreview] = useState<RoutineExercisePreview | null>(null);

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreview(item.exercise)}
            className="group flex gap-3 overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-cyan-300/35 sm:gap-4"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28">
              <ExerciseVisual
                licensed={licensed}
                exerciseId={item.exercise.id}
                name={item.exercise.displayName}
                showModeLabel={false}
                className="h-full w-full"
              />
              <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-lime-300 text-[10px] font-black text-slate-950">
                {index + 1}
              </span>
            </div>
            <span className="min-w-0 flex-1 py-1">
              <small className="inline-flex items-center gap-1 font-black uppercase tracking-wider text-cyan-300">
                <Eye size={11} /> Ver movimiento
              </small>
              <strong className="mt-1 line-clamp-2 block text-sm text-white sm:text-base">
                {item.exercise.displayName}
              </strong>
              <span className="mt-1 block truncate text-[10px] capitalize text-slate-500">
                {item.exercise.target} · {item.exercise.equipment}
              </span>
              <span className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-slate-300">
                <span className="rounded-full bg-lime-300/10 px-2 py-1 text-lime-200">
                  <Repeat2 size={11} className="mr-1 inline" />
                  {item.sets} × {item.reps ?? `${item.durationSeconds}s`}
                </span>
                <span className="rounded-full bg-orange-300/10 px-2 py-1 text-orange-200">
                  <Timer size={11} className="mr-1 inline" />
                  {item.restSeconds}s
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {preview ? (
        <ExercisePreviewModal
          exercise={preview}
          licensed={licensed}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}
