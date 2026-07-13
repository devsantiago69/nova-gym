"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Flame,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

export type ChallengeEvidence = {
  evidenceKey: string;
  challengeId: string;
  challengeName: string;
  attendanceId: string;
  ownerId: string;
  ownerName: string;
  username: string;
  localDate: string;
  durationMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photos: Array<{ id: string; type: string }>;
  myVerdict: "CONFIRMED" | "REJECTED" | null;
  confirmed: number;
  rejected: number;
};

type ViewerMode = "story" | "detail";

function evidenceStatus(item: ChallengeEvidence, own: boolean) {
  if (own) {
    if (item.rejected > 0) return { label: "El equipo pidió revisión", className: "bg-orange-500/20 text-orange-200" };
    if (item.confirmed > 0) return { label: "Esfuerzo validado", className: "bg-lime-400/15 text-lime-300" };
    return { label: "Esperando al equipo", className: "bg-slate-700/60 text-slate-300" };
  }
  if (item.myVerdict === "CONFIRMED") return { label: "Validaste el esfuerzo", className: "bg-lime-400/15 text-lime-300" };
  if (item.myVerdict === "REJECTED") return { label: "Pediste revisión", className: "bg-orange-500/20 text-orange-200" };
  return { label: "Tu voto pendiente", className: "bg-cyan-400/15 text-cyan-200" };
}

export function ChallengeEvidenceFeed({ currentUserId, initial }: { currentUserId: string; initial: ChallengeEvidence[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const [viewer, setViewer] = useState<{ evidenceKey: string; mode: ViewerMode }>();
  const [photoIndex, setPhotoIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  const pendingStories = useMemo(() => items.filter((item) => item.ownerId !== currentUserId && item.myVerdict === null), [items, currentUserId]);
  const activeItem = viewer ? items.find((item) => item.evidenceKey === viewer.evidenceKey) : undefined;
  const storyIndex = activeItem ? pendingStories.findIndex((item) => item.evidenceKey === activeItem.evidenceKey) : -1;

  function openViewer(evidenceKey: string, mode: ViewerMode) {
    setPhotoIndex(0);
    setViewer({ evidenceKey, mode });
    setMessage("");
  }

  function moveStory(direction: 1 | -1) {
    if (pendingStories.length === 0) { setViewer(undefined); return; }
    const currentIndex = storyIndex < 0 ? 0 : storyIndex;
    const target = pendingStories[currentIndex + direction];
    if (target) openViewer(target.evidenceKey, "story");
    else setViewer(undefined);
  }

  useEffect(() => {
    if (!viewer) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewer(undefined);
      if (viewer.mode === "story" && event.key === "ArrowRight") moveStory(1);
      if (viewer.mode === "story" && event.key === "ArrowLeft") moveStory(-1);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });

  async function review(evidenceKey: string, verdict: "CONFIRMED" | "REJECTED") {
    setBusy(evidenceKey);
    setMessage("");
    const before = items.find((item) => item.evidenceKey === evidenceKey);
    if (!before) return;
    const pendingBefore = items.filter((item) => item.ownerId !== currentUserId && item.myVerdict === null);
    const currentPendingIndex = pendingBefore.findIndex((item) => item.evidenceKey === evidenceKey);
    const response = await fetch(`/api/v1/challenges/${before.challengeId}/evidence/${before.attendanceId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ verdict }),
    });
    const json = await response.json() as { message: string; errors?: Array<{ message: string }> };
    setBusy(undefined);
    setMessage(response.ok ? json.message : (json.errors?.[0]?.message ?? json.message));
    if (!response.ok) return;

    setItems((current) => current.map((item) => item.evidenceKey !== evidenceKey ? item : {
      ...item,
      myVerdict: verdict,
      confirmed: item.confirmed + (verdict === "CONFIRMED" ? 1 : 0) - (item.myVerdict === "CONFIRMED" ? 1 : 0),
      rejected: item.rejected + (verdict === "REJECTED" ? 1 : 0) - (item.myVerdict === "REJECTED" ? 1 : 0),
    }));

    if (viewer?.mode === "story") {
      const next = pendingBefore[currentPendingIndex + 1] ?? pendingBefore[currentPendingIndex - 1];
      if (next && next.evidenceKey !== evidenceKey) openViewer(next.evidenceKey, "story");
      else setViewer(undefined);
    }
    router.refresh();
  }

  return <section className="mb-8 overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/30 p-5 shadow-[0_22px_80px_rgba(0,0,0,.18)] sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold text-lime-400">EVIDENCIAS DEL RETO</p><h4 className="mt-1 text-xl font-black">Historias del equipo</h4><p className="mt-1 text-sm muted">Revisa las nuevas evidencias. Cuando decidas, pasarán al historial del reto.</p></div>
      <span className="inline-flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-2 text-xs font-bold text-lime-300"><ShieldCheck size={15}/>Solo participantes</span>
    </div>

    {pendingStories.length > 0 ? <div className="relative mt-5"><div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{pendingStories.map((item) => <button key={item.evidenceKey} type="button" onClick={() => openViewer(item.evidenceKey, "story")} className="group w-[82px] shrink-0 snap-start text-center"><span className="relative mx-auto block h-[72px] w-[72px] rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-lime-400 p-[3px] shadow-[0_0_24px_rgba(163,230,53,.16)] transition group-hover:scale-105"><span className="relative block h-full w-full overflow-hidden rounded-full border-[3px] border-slate-950 bg-slate-900">{item.photos[0] ? <Image src={`/api/v1/attendance-photos/${item.photos[0].id}`} alt={`Historia de ${item.ownerName}`} fill unoptimized className="object-cover"/> : <span className="grid h-full place-items-center text-2xl font-black">{item.ownerName.charAt(0)}</span>}<span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-lime-400 text-slate-950"><Eye size={12}/></span></span></span><span className="mt-2 block truncate text-xs font-bold">{item.ownerName}</span><span className="block truncate text-[10px] text-orange-300">{item.challengeName}</span></button>)}</div><div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-900 to-transparent"/></div> : <div className="mt-5 flex items-center gap-4 rounded-2xl border border-lime-500/20 bg-lime-400/5 p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime-400 text-slate-950"><CheckCircle2 size={22}/></div><div><strong>Estás al día</strong><p className="text-sm muted">No tienes historias pendientes por validar.</p></div></div>}

    <div className="mt-7 flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">ACTIVIDAD DEL RETO</p><h4 className="mt-1 text-lg font-black">Entrenamientos</h4></div><span className="text-xs muted">{items.length} registros</span></div>
    {items.length > 0 ? <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{items.map((item) => {
      const own = item.ownerId === currentUserId;
      const status = evidenceStatus(item, own);
      const date = new Date(item.localDate);
      return <button key={item.evidenceKey} type="button" onClick={() => openViewer(item.evidenceKey, "detail")} className="w-[265px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 text-left transition hover:border-slate-600"><span className="relative block h-36 w-full bg-slate-800">{item.photos[0] ? <Image src={`/api/v1/attendance-photos/${item.photos[0].id}`} alt="Miniatura del entrenamiento" fill unoptimized className="object-cover"/> : <Flame className="m-auto h-full text-orange-400"/>}<span className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-bold backdrop-blur ${status.className}`}>{status.label}</span></span><span className="block p-3"><span className="flex items-center justify-between gap-2"><strong className="truncate">{own ? "Tu entrenamiento" : item.ownerName}</strong><span className="inline-flex items-center gap-1 text-xs font-bold text-lime-300">Ver <ChevronRight size={15}/></span></span><span className="mt-1 block truncate text-xs text-orange-300">{item.challengeName}</span><span className="mt-1 block text-xs muted">{date.toLocaleDateString("es-CO", { day: "numeric", month: "long", timeZone: "UTC" })} · {item.durationMinutes ?? 0} min</span></span></button>;
    })}</div> : <p className="mt-3 rounded-2xl border border-dashed border-slate-700 p-5 text-center text-sm muted">Las evidencias de tu equipo aparecerán aquí cuando registren una asistencia.</p>}

    {message && !viewer && <p role="status" className="mt-3 rounded-xl bg-slate-950 p-3 text-sm text-lime-300">{message}</p>}

    {viewer && activeItem && <div role="dialog" aria-modal="true" aria-label={viewer.mode === "story" ? "Historia de evidencia" : "Detalle del entrenamiento"} className="fixed inset-0 z-[70] grid bg-black/95 backdrop-blur-xl sm:place-items-center sm:p-5" onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (viewer.mode !== "story" || touchStart.current === null) return; const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current; if (Math.abs(distance) > 55) moveStory(distance < 0 ? 1 : -1); touchStart.current = null; }}>
      <article className="relative flex h-full w-full flex-col overflow-hidden bg-[#020617] sm:h-[min(880px,94vh)] sm:max-w-[460px] sm:rounded-[32px] sm:border sm:border-slate-700 sm:shadow-2xl">
        {viewer.mode === "story" && <div className="absolute inset-x-0 top-0 z-30 flex gap-1 p-3">{pendingStories.map((item, index) => <span key={item.evidenceKey} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><span className={`block h-full bg-white transition-all ${index <= storyIndex ? "w-full" : "w-0"}`}/></span>)}</div>}
        <div className={`absolute inset-x-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 ${viewer.mode === "story" ? "top-4 pt-4" : "top-0 pt-4"}`}><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-lime-400 font-black text-slate-950">{activeItem.ownerName.charAt(0).toUpperCase()}</div><div className="min-w-0"><strong className="block truncate">{activeItem.ownerId === currentUserId ? "Tu entrenamiento" : activeItem.ownerName}</strong><p className="truncate text-xs text-slate-300">@{activeItem.username} · {new Date(activeItem.localDate).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })}</p></div></div><button type="button" onClick={() => setViewer(undefined)} aria-label="Cerrar historia" className="rounded-full bg-black/40 p-2"><X/></button></div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-black">{activeItem.photos[photoIndex] ? <><Image src={`/api/v1/attendance-photos/${activeItem.photos[photoIndex].id}`} alt="" fill unoptimized priority aria-hidden className="scale-110 object-cover opacity-40 blur-2xl"/><div className="absolute inset-0 bg-black/20"/><Image src={`/api/v1/attendance-photos/${activeItem.photos[photoIndex].id}`} alt={`Evidencia de ${activeItem.ownerName}`} fill unoptimized priority className="object-contain"/></> : <div className="grid h-full place-items-center"><Flame className="h-16 w-16 text-orange-400"/></div>}
          {activeItem.photos.length > 1 && <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2">{activeItem.photos.map((photo, index) => <button type="button" key={photo.id} onClick={() => setPhotoIndex(index)} className={`rounded-full px-3 py-1.5 text-[10px] font-black backdrop-blur ${photoIndex === index ? "bg-white text-slate-950" : "bg-black/60 text-white"}`}>{photo.type === "START" ? "INICIO" : "FINAL"}</button>)}</div>}
          {viewer.mode === "story" && <><button type="button" aria-label="Historia anterior" onClick={() => moveStory(-1)} disabled={storyIndex <= 0} className="absolute bottom-16 left-2 top-24 z-10 w-16 disabled:opacity-0"><ChevronLeft className="rounded-full bg-black/35 p-2" size={38}/></button><button type="button" aria-label="Historia siguiente" onClick={() => moveStory(1)} disabled={storyIndex >= pendingStories.length - 1} className="absolute bottom-16 right-2 top-24 z-10 w-16 disabled:opacity-0"><ChevronRight className="ml-auto rounded-full bg-black/35 p-2" size={38}/></button></>}
        </div>

        <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap gap-2 text-xs"><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2"><Clock3 size={14}/>{activeItem.durationMinutes ?? 0} minutos</span>{activeItem.latitude !== null && activeItem.longitude !== null && <a href={`https://www.google.com/maps?q=${activeItem.latitude},${activeItem.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-lime-300"><MapPin size={14}/>Ver ubicación{activeItem.accuracy ? ` · ±${Math.round(activeItem.accuracy)} m` : ""}</a>}</div>
          {activeItem.ownerId === currentUserId ? <div className="mt-3 overflow-hidden rounded-2xl border border-lime-400/20 bg-gradient-to-r from-lime-400/10 to-cyan-400/5 p-4 text-sm"><div className="flex items-center gap-2 font-black"><Sparkles size={17} className="text-lime-300"/>El equipo está viendo tu esfuerzo</div><p className="mt-1 muted"><span className="font-bold text-lime-300">{activeItem.confirmed} validaciones</span>{activeItem.rejected > 0 && <span className="text-orange-300"> · {activeItem.rejected} solicitudes de revisión</span>}</p></div> : <div className="mt-4">
            <div className="mb-3"><p className="text-[10px] font-black tracking-[.18em] text-lime-300">VEREDICTO DEL EQUIPO</p><h3 className="mt-1 text-lg font-black">¿Esta evidencia enciende la racha?</h3><p className="mt-1 text-xs muted">Tu voto protege una competencia auténtica entre amigos.</p></div>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" disabled={busy === activeItem.evidenceKey} onClick={() => review(activeItem.evidenceKey, "CONFIRMED")} className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition duration-300 ${activeItem.myVerdict === "CONFIRMED" ? "border-lime-300 bg-gradient-to-br from-lime-300 to-emerald-400 text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.24)]" : "border-lime-400/25 bg-lime-400/[.06] hover:-translate-y-0.5 hover:border-lime-300"}`}>
                {activeItem.myVerdict === "CONFIRMED" && <span className="absolute right-2 top-2 rounded-full bg-slate-950/15 px-2 py-1 text-[8px] font-black tracking-wider">TU VOTO</span>}
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${activeItem.myVerdict === "CONFIRMED" ? "bg-slate-950 text-lime-300" : "bg-lime-400/15 text-lime-300"}`}><Flame size={19}/></span>
                <strong className="mt-3 block text-sm">Sí, cuenta</strong><span className={`mt-0.5 block text-[10px] ${activeItem.myVerdict === "CONFIRMED" ? "text-slate-800" : "text-slate-400"}`}>Esfuerzo validado</span>
              </button>
              <button type="button" disabled={busy === activeItem.evidenceKey} onClick={() => review(activeItem.evidenceKey, "REJECTED")} className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition duration-300 ${activeItem.myVerdict === "REJECTED" ? "border-orange-300 bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-[0_0_28px_rgba(251,146,60,.22)]" : "border-orange-400/20 bg-orange-400/[.05] hover:-translate-y-0.5 hover:border-orange-300"}`}>
                {activeItem.myVerdict === "REJECTED" && <span className="absolute right-2 top-2 rounded-full bg-black/20 px-2 py-1 text-[8px] font-black tracking-wider">TU VOTO</span>}
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${activeItem.myVerdict === "REJECTED" ? "bg-white/20 text-white" : "bg-orange-400/10 text-orange-300"}`}><ShieldAlert size={19}/></span>
                <strong className="mt-3 block text-sm">Pedir revisión</strong><span className={`mt-0.5 block text-[10px] ${activeItem.myVerdict === "REJECTED" ? "text-orange-50" : "text-slate-400"}`}>Algo no convence</span>
              </button>
            </div>
            {activeItem.myVerdict && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"><span className="text-[10px] muted">Puedes actualizar tu voto cuando quieras.</span><span className="shrink-0 text-[10px] font-black text-cyan-300">DECISIÓN ABIERTA</span></div>}
          </div>}
          {message && <p role="status" className="mt-3 text-center text-xs text-lime-300">{message}</p>}
        </div>
      </article>
    </div>}
  </section>;
}
