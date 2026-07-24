"use client";

import { useState } from "react";
import { Dumbbell, Sparkles } from "lucide-react";

export function ExerciseVisual({
  exerciseId,
  name,
  animated = false,
  licensed = false,
  showModeLabel = true,
  className = "",
}: {
  exerciseId: string;
  name: string;
  animated?: boolean;
  licensed?: boolean;
  showModeLabel?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const staticSource = `/api/v1/exercises/${exerciseId}/media?type=image&v=quality3`;
  const activeSource = `/api/v1/exercises/${exerciseId}/media?type=${animated ? "animation" : "image"}&v=quality3`;

  if (!licensed || failed)
    return (
      <div
        className={`relative grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_25%_20%,rgba(163,230,53,.22),transparent_34%),linear-gradient(145deg,#132033,#050914)] ${className}`}
      >
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative px-3 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime-300/15 text-lime-300">
            <Dumbbell size={28} />
          </span>
          <p className="mt-3 line-clamp-2 max-w-44 text-xs font-black text-white">
            {name}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">
            <Sparkles size={11} /> Guía Nova
          </span>
        </div>
      </div>
    );

  return (
    <div
      className={`relative isolate overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,.16),transparent_45%),linear-gradient(145deg,#111827,#030712)] ${className}`}
    >
      <img
        src={staticSource}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-[.16] blur-2xl saturate-150"
        draggable={false}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(2,6,23,.32)_100%)]" />
      <div className="absolute inset-[4%] grid place-items-center overflow-hidden rounded-[18px] border border-white/10 bg-white shadow-[0_18px_55px_rgba(0,0,0,.32)] sm:inset-[5%]">
        <img
          src={activeSource}
          alt={name}
          className="h-full w-full object-contain [image-rendering:auto]"
          onError={() => setFailed(true)}
          draggable={false}
        />
      </div>
      {showModeLabel ? (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-white/10 bg-slate-950/75 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-cyan-100 backdrop-blur-md">
          {animated ? "Movimiento" : "Postura"}
        </span>
      ) : null}
    </div>
  );
}
