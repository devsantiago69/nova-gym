"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Crown, Flame, Hourglass, LogOut, Medal, ShieldCheck, UsersRound, X } from "lucide-react";

type Member = {
  id: string;
  userId: string;
  name: string;
  username: string;
  score: number;
  attendanceCount: number;
  accepted: boolean;
  isCreator: boolean;
  isCurrent: boolean;
};

export function ChallengeTeamPanel({ challengeId, challengeName, members, targetAttendances, canLeave, currentUserIsCreator }: { challengeId: string; challengeName: string; members: Member[]; targetAttendances: number; canLeave: boolean; currentUserIsCreator: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const sorted = [...members].sort((left, right) => right.score - left.score || right.attendanceCount - left.attendanceCount);

  async function leaveChallenge() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/v1/challenges", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "leave", challengeId }) });
    const json = await response.json() as { message: string; errors?: Array<{ message: string }> };
    setBusy(false); setMessage(response.ok ? json.message : (json.errors?.[0]?.message ?? json.message));
    if (response.ok) setTimeout(() => { setOpen(false); router.refresh(); }, 700);
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setConfirming(false); setMessage(""); }} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-left transition hover:border-cyan-400/50 hover:bg-cyan-400/[.05]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><UsersRound size={19}/></span><span className="min-w-0 flex-1"><strong className="block text-sm">Ver integrantes</strong><span className="text-xs muted">{members.length} {members.length === 1 ? "persona" : "personas"} · progreso del equipo</span></span><ChevronRight size={18} className="text-slate-500"/>
    </button>

    {open && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-0 backdrop-blur-lg sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label={`Integrantes de ${challengeName}`} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[30px] border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-[30px]">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 p-5 backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.18em] text-cyan-300">VESTUARIO DEL EQUIPO</p><h2 className="mt-1 text-2xl font-black">Integrantes</h2><p className="mt-1 text-sm muted">{challengeName}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar integrantes" className="rounded-full bg-slate-950 p-2"><X/></button></div></header>
        <div className="space-y-3 p-4 sm:p-5">{sorted.map((member, index) => {
          const progress = Math.min(100, Math.round(member.attendanceCount / targetAttendances * 100));
          return <article key={member.id} className={`rounded-2xl border p-4 ${member.isCurrent ? "border-lime-400/35 bg-lime-400/[.06]" : "border-slate-800 bg-slate-950/60"}`}><div className="flex items-center gap-3"><span className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-black ${member.accepted ? "bg-gradient-to-br from-lime-400 to-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>{member.name.charAt(0).toUpperCase()}{index === 0 && member.accepted && <Medal size={15} className="absolute -right-1 -top-1 rounded-full bg-orange-400 p-0.5 text-slate-950"/>}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><strong className="truncate">{member.name}</strong>{member.isCurrent && <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[8px] font-black text-slate-950">TÚ</span>}{member.isCreator && <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-0.5 text-[8px] font-black text-orange-300"><Crown size={9}/>LÍDER</span>}</span><span className="block truncate text-xs muted">@{member.username}</span></span><span className="text-right"><strong className="block text-lime-300">{member.score} pts</strong><span className={`inline-flex items-center gap-1 text-[10px] ${member.accepted ? "text-cyan-300" : "text-orange-300"}`}>{member.accepted ? <CheckCircle2 size={11}/> : <Hourglass size={11}/>}{member.accepted ? "En competencia" : "Por aceptar"}</span></span></div><div className="mt-3 flex items-center justify-between text-[11px]"><span className="muted">{member.attendanceCount} de {targetAttendances} asistencias</span><strong>{progress}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-lime-400" style={{ width: `${progress}%` }}/></div></article>;
        })}</div>
        <div className="border-t border-slate-800 p-4 sm:p-5"><div className="flex gap-3 rounded-2xl bg-slate-950/70 p-4 text-xs muted"><ShieldCheck className="shrink-0 text-lime-300" size={19}/><p>Solo estos integrantes pueden ver y validar las evidencias privadas de este reto.</p></div>
          {canLeave && (!confirming ? <button type="button" onClick={() => { setConfirming(true); setMessage(""); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 py-3.5 font-bold text-red-300 transition hover:bg-red-400/10"><LogOut size={18}/>Salir del reto</button> : <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/[.06] p-4"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-400/10 text-red-300"><Flame size={19}/></span><div><strong>¿Dejar este reto?</strong><p className="mt-1 text-xs muted">Perderás acceso a sus historias, fotos y ubicaciones.{currentUserIsCreator ? " Si el equipo no puede continuar, el reto será cancelado." : " Tu progreso del reto dejará de aparecer al equipo."}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-slate-700 p-3 font-bold">Seguir dentro</button><button type="button" disabled={busy} onClick={leaveChallenge} className="rounded-xl bg-red-500 p-3 font-black text-white disabled:opacity-60">{busy ? "Saliendo…" : "Sí, salir"}</button></div></div>)}
          {message && <p role="status" className={`mt-3 rounded-xl p-3 text-center text-sm ${message.includes("No ") ? "bg-red-400/10 text-red-300" : "bg-lime-400/10 text-lime-300"}`}>{message}</p>}
        </div>
      </section>
    </div>}
  </>;
}
