"use client";

import { useState } from "react";
import { Activity, BellRing, CheckCircle2, ChevronRight, Eye, Flame, Trophy, UsersRound, X } from "lucide-react";
import { ChallengeEvidenceFeed, type ChallengeEvidence } from "@/components/challenges/challenge-evidence-feed";

export function ChallengeWorkoutPanel({
  challengeName,
  currentUserId,
  evidence,
  participants,
  targetAttendances,
  autoOpen = false,
}: {
  challengeName: string;
  currentUserId: string;
  evidence: ChallengeEvidence[];
  participants: Array<{ userId: string; name: string; username: string; score: number; accepted: boolean; isCurrent: boolean }>;
  targetAttendances: number;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const pending = evidence.filter((item) => item.ownerId !== currentUserId && item.myVerdict === null && !item.viewConsumed).length;
  const missed = evidence.filter((item) => item.ownerId !== currentUserId && item.myVerdict === null && item.viewConsumed).length;
  const reviewed = evidence.filter((item) => item.ownerId !== currentUserId && item.myVerdict !== null).length;
  const acceptedParticipants = participants.filter((participant) => participant.accepted);
  const visibleEvidence = selectedUserId === "all" ? evidence : evidence.filter((item) => item.ownerId === selectedUserId);
  const selectedParticipant = participants.find((participant) => participant.userId === selectedUserId);

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`mt-3 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${pending > 0 ? "border-orange-400/35 bg-orange-400/[.07] hover:bg-orange-400/10" : "border-slate-700 bg-slate-950/60 hover:border-lime-400/45 hover:bg-lime-400/[.04]"}`}>
      <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl ${pending > 0 ? "bg-orange-400/15 text-orange-300" : "bg-lime-400/10 text-lime-300"}`}><Activity size={19}/>{pending > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-orange-400 px-1 text-[9px] font-black text-slate-950">{pending}</span>}</span>
      <span className="min-w-0 flex-1"><strong className="block text-sm">Ver entrenamientos</strong><span className="text-xs muted">{evidence.length} {evidence.length === 1 ? "historia" : "historias"} · votos y ubicaciones</span></span>
      {pending > 0 ? <span className="hidden rounded-full bg-orange-400/15 px-2 py-1 text-[9px] font-black text-orange-200 sm:inline">VOTA AHORA</span> : null}<ChevronRight size={18} className="text-slate-500"/>
    </button>

    {open && <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/85 backdrop-blur-xl sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label={`Entrenamientos de ${challengeName}`} className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[30px] border border-slate-700 bg-[#070c16] shadow-2xl sm:rounded-[30px]">
        <header className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-5 backdrop-blur-xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black tracking-[.18em] text-lime-300">CENTRO DE COMPETENCIA</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">Entrenamientos del reto</h2><p className="mt-1 text-sm muted">{challengeName} · evidencia, votos y lugares verificados</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar entrenamientos" className="rounded-full bg-slate-950 p-2.5"><X/></button></div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"><Eye size={16} className="text-cyan-300"/><strong className="mt-2 block text-lg">{evidence.length}</strong><span className="text-[10px] muted">Historias</span></div>
            <div className={`rounded-2xl border p-3 ${pending > 0 ? "border-orange-400/25 bg-orange-400/[.07]" : "border-slate-800 bg-slate-950/60"}`}><BellRing size={16} className={pending > 0 ? "text-orange-300" : "text-slate-500"}/><strong className="mt-2 block text-lg">{pending}</strong><span className="text-[10px] muted">Por votar</span></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"><CheckCircle2 size={16} className="text-lime-300"/><strong className="mt-2 block text-lg">{reviewed}</strong><span className="text-[10px] muted">Revisadas</span></div>
          </div>
          {pending > 0 && <div className="mt-3 flex items-start gap-3 rounded-2xl border border-orange-400/25 bg-gradient-to-r from-orange-400/10 to-rose-400/[.04] p-3 text-sm"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-400 text-slate-950"><Flame size={18}/></span><p><strong className="block text-orange-200">Tu equipo espera tu decisión</strong><span className="text-xs muted">Tienes {pending} {pending === 1 ? "entrenamiento nuevo" : "entrenamientos nuevos"} por validar.</span></p></div>}
          {missed > 0 && <p className="mt-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-400"><strong className="text-orange-200">{missed} sin voto:</strong> la ventana privada terminó antes de registrar tu decisión.</p>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <section className="mb-5 overflow-hidden rounded-[24px] border border-slate-800 bg-gradient-to-br from-slate-900 to-cyan-950/20 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.16em] text-cyan-300">ELIGE UN INTEGRANTE</p><h3 className="mt-1 text-lg font-black">Recorrido del equipo</h3><p className="mt-1 text-xs muted">Mira el progreso y los entrenamientos de cada participante.</p></div><UsersRound size={24} className="shrink-0 text-cyan-300"/></div>
            <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setSelectedUserId("all")} className={`w-[104px] shrink-0 snap-start rounded-2xl border p-3 text-left transition ${selectedUserId === "all" ? "border-lime-300 bg-lime-300 text-slate-950" : "border-slate-700 bg-slate-950/70 hover:border-cyan-400/50"}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${selectedUserId === "all" ? "bg-slate-950 text-lime-300" : "bg-cyan-400/10 text-cyan-300"}`}><UsersRound size={19}/></span><strong className="mt-2 block text-sm">Todos</strong><small className={selectedUserId === "all" ? "text-slate-800" : "muted"}>{evidence.length} registros</small></button>
              {acceptedParticipants.map((participant) => {
                const attendanceCount = evidence.filter((item) => item.ownerId === participant.userId).length;
                const progress = Math.min(100, Math.round(attendanceCount / Math.max(1, targetAttendances) * 100));
                const selected = selectedUserId === participant.userId;
                return <button type="button" key={participant.userId} onClick={() => setSelectedUserId(participant.userId)} className={`w-[132px] shrink-0 snap-start rounded-2xl border p-3 text-left transition ${selected ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-700 bg-slate-950/70 hover:border-cyan-400/50"}`}><span className="flex items-center justify-between gap-2"><span className={`grid h-10 w-10 place-items-center rounded-xl font-black ${selected ? "bg-slate-950 text-cyan-300" : "bg-gradient-to-br from-lime-400 to-cyan-400 text-slate-950"}`}>{participant.name.charAt(0).toUpperCase()}</span>{participant.isCurrent ? <span className={`rounded-full px-2 py-1 text-[8px] font-black ${selected ? "bg-slate-950/15" : "bg-lime-400/15 text-lime-300"}`}>TÚ</span> : null}</span><strong className="mt-2 block truncate text-sm">{participant.isCurrent ? "Mi progreso" : participant.name}</strong><small className={`block truncate ${selected ? "text-slate-800" : "muted"}`}>@{participant.username} · {attendanceCount}</small><span className={`mt-2 block h-1 overflow-hidden rounded-full ${selected ? "bg-slate-950/20" : "bg-slate-800"}`}><span className={`block h-full rounded-full ${selected ? "bg-slate-950" : "bg-gradient-to-r from-orange-400 to-lime-400"}`} style={{ width: `${progress}%` }}/></span></button>;
              })}
            </div>
          </section>
          {visibleEvidence.length > 0 ? <ChallengeEvidenceFeed key={selectedUserId} embedded currentUserId={currentUserId} initial={visibleEvidence}/> : <div className="grid min-h-[260px] place-items-center rounded-[24px] border border-dashed border-slate-700 bg-slate-900/35 p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-slate-900 text-slate-500"><Trophy size={28}/></span><h3 className="mt-4 text-xl font-black">Todavía no hay entrenamientos</h3><p className="mx-auto mt-2 max-w-sm text-sm muted">{selectedParticipant ? `${selectedParticipant.name} aún no ha registrado una asistencia que cuente para este reto.` : "El equipo todavía no ha sumado asistencias en esta competencia."}</p></div></div>}
        </div>
      </section>
    </div>}
  </>;
}
