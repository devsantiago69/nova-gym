"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CheckCircle2, Clock3, Flame, Search, Sparkles, Swords, Target, UserPlus, UsersRound, X } from "lucide-react";

type Category = { id: string; name: string; durationDays: number; targetAttendances: number; pointsPerAttendance: number };
type Friend = { id: string; username: string; name: string };
type Invitation = { id: string; category: string; creator: string };

export function ChallengeActions({ categories, friends, invitations }: { categories: Category[]; friends: Friend[]; invitations: Invitation[] }) {
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const visibleFriends = friends.filter((friend) => `${friend.name} ${friend.username}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function action(body: object) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/v1/challenges", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json() as { message: string; errors?: Array<{ message: string }> };
    setBusy(false);
    setMessage(response.ok ? json.message : (json.errors?.[0]?.message ?? json.message));
    if (response.ok) setTimeout(() => location.reload(), 700);
  }

  function toggleFriend(id: string) {
    setMessage("");
    setSelectedFriends((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 3) { setMessage("Puedes invitar máximo 3 amigos por reto."); return current; }
      return [...current, id];
    });
  }

  return <div className="mb-9 space-y-6">
    {invitations.length > 0 && <section className="overflow-hidden rounded-3xl border border-orange-400/30 bg-gradient-to-br from-orange-400/10 via-slate-900 to-lime-400/5"><div className="flex items-center gap-3 border-b border-orange-400/20 p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-400 text-slate-950"><Swords/></span><div><p className="text-xs font-bold text-orange-300">NUEVOS RETOS</p><h2 className="text-xl font-black">Te están esperando</h2></div></div><div className="grid gap-3 p-4 sm:grid-cols-2">{invitations.map((invitation) => <article key={invitation.id} className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-lime-400 font-black text-slate-950">{invitation.creator.charAt(0)}</div><div><p><strong>{invitation.creator}</strong> te invitó</p><p className="mt-1 text-sm text-orange-300">{invitation.category}</p></div></div><button disabled={busy} onClick={() => action({ action: "accept", challengeId: invitation.id })} className="btn mt-4 w-full gap-2"><Check size={18}/>Aceptar reto</button></article>)}</div></section>}

    <form onSubmit={(event) => { event.preventDefault(); void action({ action: "create", targetIds: selectedFriends, categoryId }); }} className="card overflow-hidden">
      <div className="border-b border-slate-800 bg-gradient-to-r from-lime-500/10 via-cyan-500/5 to-orange-500/10 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="inline-flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-1.5 text-xs font-bold text-lime-300"><Sparkles size={14}/>NUEVO RETO SOCIAL</span><h2 className="mt-3 text-2xl font-black sm:text-3xl">Arma tu equipo</h2><p className="mt-2 muted">Selecciona entre 1 y 3 amigos. El reto comenzará cuando todos acepten.</p></div><span className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-bold"><UsersRound size={18} className="text-lime-400"/>{selectedFriends.length}/3 seleccionados</span></div></div>

      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-2">
        <section><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-lime-400">PASO 1</p><h3 className="mt-1 text-lg font-black">Elige tus amigos</h3></div>{selectedFriends.length > 0 && <button type="button" onClick={() => setSelectedFriends([])} className="text-xs font-bold text-slate-400 hover:text-red-300">Limpiar</button>}</div>
          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-lime-400"><Search className="text-slate-500" size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entre tus amigos" className="w-full bg-transparent py-3.5 outline-none"/>{query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}><X size={17}/></button>}</label>
          {selectedFriends.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selectedFriends.map((id) => { const friend = friends.find((item) => item.id === id)!; return <button type="button" key={id} onClick={() => toggleFriend(id)} className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-3 py-2 text-xs font-black text-slate-950"><span className="grid h-5 w-5 place-items-center rounded-full bg-slate-950 text-[10px] text-lime-300">{friend.name.charAt(0)}</span>{friend.name}<X size={13}/></button>; })}</div>}
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">{friends.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center"><UserPlus className="mx-auto text-slate-600"/><p className="mt-3 font-bold">Primero agrega amigos</p><Link href="/comunidad" className="mt-2 inline-block text-sm font-bold text-lime-400">Ir a Comunidad</Link></div> : visibleFriends.length === 0 ? <p className="rounded-xl bg-slate-950 p-4 text-sm muted">No encontramos amigos con esa búsqueda.</p> : visibleFriends.map((friend) => { const selected = selectedFriends.includes(friend.id); return <button type="button" key={friend.id} onClick={() => toggleFriend(friend.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-lime-400 bg-lime-400/10" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black ${selected ? "bg-lime-400 text-slate-950" : "bg-slate-800"}`}>{friend.name.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><strong className="block truncate">{friend.name}</strong><span className="block truncate text-xs muted">@{friend.username}</span></span>{selected ? <CheckCircle2 className="text-lime-400"/> : <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-600"><UserPlus size={13}/></span>}</button>; })}</div>
        </section>

        <section><div><p className="text-xs font-bold text-orange-300">PASO 2</p><h3 className="mt-1 text-lg font-black">Selecciona el desafío</h3></div><div className="mt-4 space-y-3">{categories.map((category) => { const selected = categoryId === category.id; return <button type="button" key={category.id} onClick={() => setCategoryId(category.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-orange-400 bg-orange-400/10 shadow-[0_0_24px_rgba(251,146,60,.08)]" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"}`}><div className="flex items-start gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${selected ? "bg-orange-400 text-slate-950" : "bg-orange-400/10 text-orange-300"}`}><Flame/></span><span className="min-w-0 flex-1"><strong className="text-lg">{category.name}</strong><span className="mt-2 flex flex-wrap gap-2 text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1"><Clock3 size={12}/>{category.durationDays} días</span><span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1"><Target size={12}/>{category.targetAttendances} asistencias</span><span className="rounded-full bg-slate-900 px-2 py-1">+{category.pointsPerAttendance} pts/día</span></span></span>{selected && <CheckCircle2 className="text-orange-400"/>}</div></button>; })}</div>
          <button disabled={busy || selectedFriends.length === 0 || !categoryId} className="btn mt-5 w-full gap-2 py-4 text-base"><Swords size={20}/>{busy ? "Creando reto…" : `Retar a ${selectedFriends.length || "tus"} ${selectedFriends.length === 1 ? "amigo" : "amigos"}`}</button>
        </section>
      </div>
    </form>
    {message && <p role="status" className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center text-sm font-bold text-lime-300">{message}</p>}
  </div>;
}
