"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, Flame, MapPin, Navigation, ShieldCheck, Timer, Trophy, X } from "lucide-react";

export type AttendanceStoryData = {
  id: string;
  localDate: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMinutes: number | null;
  timezone: string;
  startLatitude: number | null;
  startLongitude: number | null;
  startAccuracyMeters: number | null;
  endLatitude: number | null;
  endLongitude: number | null;
  endAccuracyMeters: number | null;
  photos: Array<{ id: string; type: string }>;
  pointMovements: Array<{ amount: number }>;
};

function mapUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function AttendanceDetailStory({ attendance, onClose, locale }: { attendance: AttendanceStoryData; onClose: () => void; locale: "es" | "en" }) {
  const dateLocale = locale === "en" ? "en-US" : "es-CO";
  const photos = useMemo(() => [...attendance.photos].sort((a, b) => (a.type === "START" ? -1 : b.type === "START" ? 1 : 0)), [attendance.photos]);
  const stripRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const date = new Date(attendance.localDate);
  const points = attendance.pointMovements.reduce((total, movement) => total + movement.amount, 0);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);

  function goTo(index: number) {
    const next = Math.max(0, Math.min(photos.length - 1, index));
    setActiveIndex(next);
    stripRef.current?.children.item(next)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  function updateIndex() {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    setActiveIndex(Math.round(strip.scrollLeft / strip.clientWidth));
  }

  return <div role="dialog" aria-modal="true" aria-label="Detalles del entrenamiento" className="fixed inset-0 z-[90] bg-[#02050a] sm:grid sm:place-items-center sm:bg-slate-950/90 sm:p-5 sm:backdrop-blur-xl">
    <section className="relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-[#050a14] sm:h-[min(860px,94vh)] sm:rounded-[2.25rem] sm:border sm:border-slate-700 sm:shadow-2xl">
      <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/90 via-black/35 to-transparent px-4 pb-12 pt-3">
        <div className="flex gap-1.5">{photos.map((photo, index) => <span key={photo.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><span className={`block h-full rounded-full bg-lime-400 transition-all duration-300 ${index <= activeIndex ? "w-full" : "w-0"}`}/></span>)}</div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-400 font-black text-slate-950"><Flame size={20}/></span><div className="min-w-0"><strong className="block truncate text-sm text-white">Mi entrenamiento</strong><span className="block text-xs capitalize text-slate-300">{date.toLocaleDateString(dateLocale, { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" })}</span></div></div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalles" className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md"><X size={22}/></button>
        </div>
      </div>

      <div className="relative h-[57vh] min-h-[380px] shrink-0 overflow-hidden bg-black sm:h-[58%]">
        {photos.length > 0 ? <div ref={stripRef} onScroll={updateIndex} className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{photos.map((photo) => <article key={photo.id} className="relative h-full min-w-full snap-center"><Image src={`/api/v1/attendance-photos/${photo.id}`} alt={photo.type === "START" ? "Evidencia de inicio" : "Evidencia final"} fill unoptimized priority className="object-contain"/><span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/65 px-4 py-2 text-xs font-black uppercase tracking-[.15em] text-white backdrop-blur-lg">{photo.type === "START" ? "Inicio" : "Meta cumplida"}</span></article>)}</div> : <div className="grid h-full place-items-center text-center"><div><ShieldCheck className="mx-auto h-12 w-12 text-slate-600"/><p className="mt-3 font-bold text-slate-400">Sin evidencia disponible</p></div></div>}
        {activeIndex > 0 && <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Fotografía anterior" className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur sm:grid"><ChevronLeft/></button>}
        {activeIndex < photos.length - 1 && <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Fotografía siguiente" className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur sm:grid"><ChevronRight/></button>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-t-[2rem] border-t border-slate-800 bg-[#08101e] p-5 -mt-4 relative z-20">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-lime-400">Entrenamiento completado</p><h2 className="mt-1 text-2xl font-black text-white">Tu esfuerzo quedó registrado</h2></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-400 text-slate-950"><CheckCircle2 size={25}/></span></div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><Timer size={18} className="text-cyan-300"/><strong className="mt-2 block text-lg text-white">{attendance.durationMinutes ?? "—"}</strong><span className="text-[10px] text-slate-500">minutos</span></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><Trophy size={18} className="text-lime-300"/><strong className="mt-2 block text-lg text-white">+{points}</strong><span className="text-[10px] text-slate-500">puntos</span></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><CalendarDays size={18} className="text-violet-300"/><strong className="mt-2 block text-lg text-white">{date.getUTCDate()}</strong><span className="text-[10px] capitalize text-slate-500">{date.toLocaleDateString(dateLocale, { timeZone: "UTC", month: "short" }).replace(".", "")}</span></div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-center gap-2 text-sm font-black text-white"><Clock3 size={17} className="text-lime-400"/>Tu sesión</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><span className="block text-xs text-slate-500">Comenzaste</span><strong className="mt-1 block text-white">{new Date(attendance.startedAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}</strong></div><div><span className="block text-xs text-slate-500">Finalizaste</span><strong className="mt-1 block text-white">{attendance.finishedAt ? new Date(attendance.finishedAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" }) : "En curso"}</strong></div></div></div>
        {(attendance.startLatitude !== null || attendance.endLatitude !== null) && <div className="mt-4"><div className="flex items-center gap-2 text-sm font-black text-white"><Navigation size={17} className="text-lime-400"/>Puntos verificados</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{attendance.startLatitude !== null && attendance.startLongitude !== null && <a href={mapUrl(attendance.startLatitude, attendance.startLongitude)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-lime-400/50"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><MapPin size={19}/></span><span><strong className="block text-sm text-white">Punto de inicio</strong><small className="text-slate-500">Precisión ±{Math.round(attendance.startAccuracyMeters ?? 0)} m</small></span></span><ExternalLink size={15} className="text-slate-500"/></a>}{attendance.endLatitude !== null && attendance.endLongitude !== null && <a href={mapUrl(attendance.endLatitude, attendance.endLongitude)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-lime-400/50"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400/10 text-lime-300"><CheckCircle2 size={19}/></span><span><strong className="block text-sm text-white">Punto final</strong><small className="text-slate-500">Precisión ±{Math.round(attendance.endAccuracyMeters ?? 0)} m</small></span></span><ExternalLink size={15} className="text-slate-500"/></a>}</div></div>}
        <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck size={14}/>Fotos y ubicaciones visibles únicamente para ti y tus retos autorizados.</p>
      </div>
    </section>
  </div>;
}
