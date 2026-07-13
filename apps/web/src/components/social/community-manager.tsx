"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Clock3, Search, Send, Sparkles, Swords, UserCheck, UserPlus, UsersRound, X } from "lucide-react";

type Person = { id: string; username: string; profile: { firstName: string; lastName: string } | null };
type Connection = { friendshipId: string; person: Person };

function displayName(person: Person) {
  return `${person.profile?.firstName ?? ""} ${person.profile?.lastName ?? ""}`.trim() || person.username;
}

function Avatar({ person, large = false }: { person: Person; large?: boolean }) {
  return <span className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 font-black text-slate-950 ${large ? "h-14 w-14 text-xl" : "h-11 w-11"}`}>{displayName(person).charAt(0).toUpperCase()}</span>;
}

export function CommunityManager({ people, friends, incoming, outgoing }: { people: Person[]; friends: Connection[]; incoming: Connection[]; outgoing: Connection[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string>();
  const relatedIds = useMemo(() => new Set([...friends, ...incoming, ...outgoing].map((item) => item.person.id)), [friends, incoming, outgoing]);
  const discover = people.filter((person) => !relatedIds.has(person.id) && `${person.username} ${person.profile?.firstName ?? ""} ${person.profile?.lastName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function action(body: { action: string; targetId?: string; friendshipId?: string }, key: string) {
    setBusy(key);
    setMessage("");
    const response = await fetch("/api/v1/friends", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json() as { message: string; errors?: Array<{ message: string }> };
    setBusy(undefined);
    setMessage(response.ok ? json.message : (json.errors?.[0]?.message ?? json.message));
    if (response.ok) router.refresh();
  }

  return <div className="space-y-7">
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <article className="card p-4 sm:p-5"><UserCheck className="text-lime-400"/><p className="mt-3 text-2xl font-black">{friends.length}</p><p className="text-xs muted sm:text-sm">Amigos</p></article>
      <article className="card p-4 sm:p-5"><Send className="text-cyan-400"/><p className="mt-3 text-2xl font-black">{incoming.length}</p><p className="text-xs muted sm:text-sm">Por responder</p></article>
      <article className="card p-4 sm:p-5"><Clock3 className="text-orange-400"/><p className="mt-3 text-2xl font-black">{outgoing.length}</p><p className="text-xs muted sm:text-sm">Enviadas</p></article>
    </div>

    {incoming.length > 0 && <section className="overflow-hidden rounded-3xl border border-lime-500/30 bg-gradient-to-br from-lime-400/10 to-slate-900">
      <div className="flex items-center gap-3 border-b border-lime-500/20 p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-400 text-slate-950"><Sparkles/></span><div><p className="text-xs font-bold text-lime-300">NUEVAS CONEXIONES</p><h2 className="text-xl font-black">Quieren entrenar contigo</h2></div></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">{incoming.map(({ friendshipId, person }) => <article key={friendshipId} className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4"><div className="flex items-center gap-3"><Avatar person={person}/><div className="min-w-0"><strong className="block truncate">{displayName(person)}</strong><p className="truncate text-sm muted">@{person.username}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><button disabled={busy === friendshipId} onClick={() => action({ action: "accept", friendshipId }, friendshipId)} className="btn gap-2"><Check size={17}/>Aceptar</button><button disabled={busy === friendshipId} onClick={() => action({ action: "reject", friendshipId }, friendshipId)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 p-3 text-sm font-bold hover:border-red-400 hover:text-red-300"><X size={17}/>Ahora no</button></div></article>)}</div>
    </section>}

    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-lime-400">TU EQUIPO</p><h2 className="mt-1 text-2xl font-black">Mis amigos</h2></div>{friends.length > 0 && <Link href="/retos" className="inline-flex items-center gap-2 rounded-xl border border-lime-500/40 px-4 py-2 text-sm font-bold text-lime-300"><Swords size={17}/>Crear reto</Link>}</div>
      {friends.length === 0 ? <div className="card p-8 text-center"><UsersRound className="mx-auto h-12 w-12 text-slate-600"/><p className="mt-4 font-bold">Tu equipo está por comenzar</p><p className="mt-1 text-sm muted">Busca personas y envía tu primera solicitud.</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{friends.map(({ friendshipId, person }) => <article key={friendshipId} className="card group p-5 transition hover:-translate-y-1 hover:border-lime-500/40"><div className="flex items-center gap-3"><Avatar person={person} large/><div className="min-w-0"><strong className="block truncate text-lg">{displayName(person)}</strong><p className="truncate text-sm muted">@{person.username}</p></div></div><Link href="/retos" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-950 p-3 text-sm font-bold transition group-hover:bg-lime-400 group-hover:text-slate-950"><Swords size={17}/>Invitar a un reto</Link></article>)}</div>}
    </section>

    {outgoing.length > 0 && <section><div className="mb-3"><p className="text-xs font-bold text-orange-300">EN ESPERA</p><h2 className="mt-1 text-xl font-black">Solicitudes enviadas</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{outgoing.map(({ friendshipId, person }) => <article key={friendshipId} className="card flex items-center gap-3 p-4"><Avatar person={person}/><div className="min-w-0 flex-1"><strong className="block truncate">{displayName(person)}</strong><p className="truncate text-xs muted">@{person.username} · Pendiente</p></div><button aria-label={`Cancelar solicitud a ${person.username}`} disabled={busy === friendshipId} onClick={() => action({ action: "cancel", friendshipId }, friendshipId)} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:border-red-400 hover:text-red-300"><X size={18}/></button></article>)}</div></section>}

    <section className="card overflow-hidden">
      <div className="border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-lime-500/5 p-5 sm:p-6"><p className="text-xs font-bold text-cyan-300">DESCUBRIR</p><h2 className="mt-1 text-2xl font-black">Encuentra personas</h2><p className="mt-1 text-sm muted">Busca por nombre o usuario y amplía tu círculo deportivo.</p><label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-lime-400"><Search className="text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o @usuario" className="w-full bg-transparent py-4 outline-none"/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="text-slate-500"><X size={18}/></button>}</label></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{discover.length === 0 ? <div className="p-5 text-sm muted sm:col-span-2 lg:col-span-3">{query ? "No encontramos personas con esa búsqueda." : "No hay nuevas personas disponibles por ahora."}</div> : discover.map((person) => <article key={person.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-3"><Avatar person={person}/><div className="min-w-0"><strong className="block truncate">{displayName(person)}</strong><p className="truncate text-sm muted">@{person.username}</p></div></div><button disabled={busy === person.id} onClick={() => action({ action: "send", targetId: person.id }, person.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-lime-500/50 p-3 text-sm font-bold text-lime-300 transition hover:bg-lime-400 hover:text-slate-950"><UserPlus size={17}/>{busy === person.id ? "Enviando…" : "Agregar amigo"}</button></article>)}</div>
    </section>

    {message && <p role="status" className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-center text-sm font-bold text-lime-300 shadow-2xl">{message}</p>}
  </div>;
}
