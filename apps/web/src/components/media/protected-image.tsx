"use client";

import Image from "next/image";
import { ImageOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function ProtectedImage({ src, alt, className = "object-contain", priority = false, fallbackLabel = "Evidencia no disponible" }: { src: string; alt: string; className?: string; priority?: boolean; fallbackLabel?: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { setFailed(false); setAttempt(0); }, [src]);

  if (failed) return <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-950 via-slate-950 to-violet-950/40 p-6 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-slate-700 bg-slate-900 text-slate-400"><ImageOff size={29}/></span><strong className="mt-4 block text-sm text-slate-200">{fallbackLabel}</strong><p className="mx-auto mt-1 max-w-[240px] text-xs text-slate-500">La evidencia sigue protegida, pero el archivo no respondió.</p><button type="button" onClick={() => { setAttempt((value) => value + 1); setFailed(false); }} className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-lime-300"><RefreshCw size={14}/>Intentar nuevamente</button><span className="mt-4 flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-600"><ShieldCheck size={12}/>ALMACENAMIENTO PRIVADO</span></div></div>;

  const separator = src.includes("?") ? "&" : "?";
  return <Image key={`${src}-${attempt}`} src={`${src}${separator}mediaAttempt=${attempt}`} alt={alt} fill unoptimized priority={priority} draggable={false} onError={() => setFailed(true)} className={className}/>;
}
