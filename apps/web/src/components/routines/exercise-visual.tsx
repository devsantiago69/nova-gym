"use client";
import { useState } from "react";
import { Dumbbell, ImageOff, Sparkles } from "lucide-react";

export function ExerciseVisual({ exerciseId, name, animated = false, licensed = false, className = "" }: { exerciseId: string; name: string; animated?: boolean; licensed?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!licensed || failed) return <div className={`relative grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_25%_20%,rgba(163,230,53,.22),transparent_34%),linear-gradient(145deg,#132033,#050914)] ${className}`}><div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:22px_22px]"/><div className="relative text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime-300/15 text-lime-300"><Dumbbell size={28}/></span><p className="mt-3 max-w-44 text-xs font-black text-white">{name}</p><span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300"><Sparkles size={11}/> Guía Nova</span></div></div>;
  return <img src={`/api/v1/exercises/${exerciseId}/media?type=${animated ? "animation" : "image"}&v=quality2`} alt={name} className={`object-cover [image-rendering:auto] ${className}`} onError={() => setFailed(true)} draggable={false}/>;
}
