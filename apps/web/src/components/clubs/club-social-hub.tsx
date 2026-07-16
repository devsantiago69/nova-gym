"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  LocateFixed,
  MapPin,
  MessageSquareText,
  Plus,
  Send,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { SocialFeed } from "@/components/social/social-feed";
import type { SocialFeedItem } from "@/modules/social/feed";

export type ClubTrainingDto = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  durationMinutes: number;
  placeName: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  capacity: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED";
  isCreator: boolean;
  canManage: boolean;
  myStatus: "GOING" | "WAITLIST" | "CANCELED" | null;
  going: number;
  waiting: number;
  creatorName: string;
  participants: Array<{ id: string; name: string; username: string; avatarUrl: string | null }>;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function defaultStart() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ClubSocialHub({
  clubId,
  initialFeed,
  initialSessions,
  initialTab = "feed",
}: {
  clubId: string;
  initialFeed: SocialFeedItem[];
  initialSessions: ClubTrainingDto[];
  initialTab?: "feed" | "sessions";
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [post, setPost] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "Entrenamiento en equipo",
    description: "",
    startsAt: defaultStart(),
    durationMinutes: 60,
    placeName: "",
    address: "",
    capacity: 8,
    latitude: "",
    longitude: "",
  });

  async function publish() {
    if (post.trim().length < 2) return;
    setBusy("post");
    setMessage("");
    const response = await fetch(`/api/v1/clubs/${clubId}/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: post }),
    });
    const json = (await response.json()) as { message: string; errors?: Array<{ message: string }> };
    setBusy(undefined);
    setMessage(response.ok ? "Tu club ya puede verlo" : (json.errors?.[0]?.message ?? json.message));
    if (response.ok) {
      setPost("");
      router.refresh();
    }
  }

  function locate() {
    if (!navigator.geolocation) return setMessage("Este dispositivo no permite compartir ubicación");
    setBusy("location");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({ ...current, latitude: String(coords.latitude), longitude: String(coords.longitude) }));
        setBusy(undefined);
        setMessage("Punto de encuentro ubicado");
      },
      () => {
        setBusy(undefined);
        setMessage("No pudimos leer tu ubicación. Puedes escribir la dirección.");
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  async function createTraining() {
    setBusy("create");
    setMessage("");
    const payload = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      latitude: form.latitude || undefined,
      longitude: form.longitude || undefined,
    };
    const response = await fetch(`/api/v1/clubs/${clubId}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as { message: string; errors?: Array<{ message: string }> };
    setBusy(undefined);
    setMessage(response.ok ? "Plan publicado y equipo notificado" : (json.errors?.[0]?.message ?? json.message));
    if (response.ok) {
      setShowCreate(false);
      router.refresh();
    }
  }

  async function sessionAction(sessionId: string, action: string) {
    setBusy(sessionId);
    setMessage("");
    const response = await fetch(`/api/v1/clubs/${clubId}/sessions/${sessionId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await response.json()) as { message: string; errors?: Array<{ message: string }> };
    setBusy(undefined);
    setMessage(response.ok ? json.message : (json.errors?.[0]?.message ?? json.message));
    if (response.ok) router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/70 shadow-[0_24px_90px_rgba(0,0,0,.22)]">
      <header className="border-b border-slate-800 bg-[linear-gradient(120deg,rgba(34,211,238,.08),transparent_45%,rgba(163,230,53,.07))] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[.16em] text-cyan-300">ZONA DEL EQUIPO</p>
            <h2 className="mt-1 text-2xl font-black">La vida del club</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300"><Sparkles size={21} /></span>
        </div>
        <nav className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-950/70 p-1.5">
          <button onClick={() => setTab("feed")} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition ${tab === "feed" ? "bg-white/10 text-white" : "text-slate-500"}`}>
            <MessageSquareText size={16} /> Pulso
          </button>
          <button onClick={() => setTab("sessions")} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition ${tab === "sessions" ? "bg-lime-300 text-slate-950" : "text-slate-500"}`}>
            <Dumbbell size={16} /> Entrena conmigo
          </button>
        </nav>
      </header>

      <div className="p-4 sm:p-6">
        {tab === "feed" ? (
          <div className="space-y-5">
            <div className="rounded-[26px] border border-slate-800 bg-slate-950/60 p-4">
              <textarea value={post} onChange={(event) => setPost(event.target.value)} maxLength={800} rows={3} placeholder="¿Qué mueve hoy al club? Comparte un plan, logro o motivación…" className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-600" />
              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><UsersRound size={13} /> Solo el club</span>
                <button disabled={busy === "post" || post.trim().length < 2} onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40"><Send size={15} /> Publicar</button>
              </div>
            </div>
            <SocialFeed initial={initialFeed} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="font-black">Próximos encuentros</h3><p className="text-xs muted">Confirma tu cupo y lleguen juntos.</p></div>
              <button onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-3.5 py-2.5 text-xs font-black text-slate-950"><Plus size={16} /> Crear plan</button>
            </div>
            {showCreate ? (
              <div className="rounded-[28px] border border-lime-300/20 bg-gradient-to-br from-lime-300/[.07] to-cyan-300/[.04] p-4 sm:p-5">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-black tracking-widest text-lime-300">NUEVO ENCUENTRO</p><h3 className="text-xl font-black">¿Entrenamos juntos?</h3></div><button onClick={() => setShowCreate(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-950"><X size={17} /></button></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Nombre del plan</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></label>
                  <label><span className="mb-1.5 block text-xs font-bold">Día y hora</span><input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="input" /></label>
                  <label><span className="mb-1.5 block text-xs font-bold">Duración</span><select value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} className="input"><option value={45}>45 minutos</option><option value={60}>1 hora</option><option value={90}>1 h 30 min</option><option value={120}>2 horas</option></select></label>
                  <label><span className="mb-1.5 block text-xs font-bold">Punto de encuentro</span><input value={form.placeName} onChange={(e) => setForm({ ...form, placeName: e.target.value })} placeholder="Recepción del gimnasio" className="input" /></label>
                  <label><span className="mb-1.5 block text-xs font-bold">Cupos</span><input type="number" min={2} max={100} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="input" /></label>
                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Dirección o referencia</span><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección, piso o indicación para llegar" className="input" /></label>
                  <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold">Mensaje para el equipo</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input resize-none" placeholder="Qué van a entrenar, qué llevar…" /></label>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button onClick={locate} disabled={busy === "location"} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-300/20 py-3 text-xs font-black text-cyan-200"><LocateFixed size={16} /> {form.latitude ? "Ubicación agregada" : "Usar mi ubicación"}</button>
                  <button onClick={() => void createTraining()} disabled={busy === "create"} className="btn flex-1 py-3">Publicar y avisar</button>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 xl:grid-cols-2">
              {initialSessions.map((training) => {
                const available = Math.max(0, training.capacity - training.going);
                const mapHref = training.latitude && training.longitude ? `https://www.google.com/maps?q=${training.latitude},${training.longitude}` : training.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.address)}` : null;
                return (
                  <article key={training.id} className={`relative overflow-hidden rounded-[26px] border p-4 ${training.status === "CANCELED" ? "border-red-400/15 bg-red-400/[.04] opacity-70" : "border-slate-800 bg-slate-950/60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime-300/10 text-lime-300"><Dumbbell size={20} /></span>
                      <div className="min-w-0 flex-1"><h4 className="truncate font-black">{training.title}</h4><p className="text-xs text-slate-500">Organiza {training.creatorName}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${training.status === "SCHEDULED" ? "bg-lime-300/10 text-lime-300" : training.status === "COMPLETED" ? "bg-cyan-300/10 text-cyan-300" : "bg-red-400/10 text-red-300"}`}>{training.status === "SCHEDULED" ? "ABIERTO" : training.status === "COMPLETED" ? "COMPLETADO" : "CANCELADO"}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <span className="flex items-center gap-2 rounded-xl bg-white/[.04] p-2.5"><CalendarDays size={15} className="text-cyan-300" /> {dateLabel(training.startsAt)}</span>
                      <span className="flex items-center gap-2 rounded-xl bg-white/[.04] p-2.5"><Clock3 size={15} className="text-orange-300" /> {training.durationMinutes} min</span>
                      <span className="col-span-2 flex items-center gap-2 rounded-xl bg-white/[.04] p-2.5"><MapPin size={15} className="text-lime-300" /> <span className="truncate">{training.placeName}</span>{mapHref ? <a href={mapHref} target="_blank" rel="noreferrer" className="ml-auto font-black text-lime-300">Mapa</a> : null}</span>
                    </div>
                    {training.description ? <p className="mt-3 text-sm text-slate-300">{training.description}</p> : null}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex -space-x-2">{training.participants.slice(0, 4).map((person) => <span key={person.id} title={person.name} className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-slate-950 bg-gradient-to-br from-cyan-300 to-lime-300 text-[10px] font-black text-slate-950">{person.name.charAt(0)}</span>)}</div>
                      <span className="text-xs text-slate-400"><strong className="text-white">{training.going}</strong> confirmados · {available} libres{training.waiting ? ` · ${training.waiting} esperando` : ""}</span>
                    </div>
                    {training.status === "SCHEDULED" ? <div className="mt-4 flex gap-2">
                      {training.myStatus === "GOING" ? <button disabled={busy === training.id} onClick={() => void sessionAction(training.id, "leave")} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 py-3 text-xs font-black"><CheckCircle2 size={16} className="text-lime-300" /> Confirmado · Liberar</button> : training.myStatus === "WAITLIST" ? <button disabled={busy === training.id} onClick={() => void sessionAction(training.id, "leave")} className="flex-1 rounded-xl border border-orange-300/30 py-3 text-xs font-black text-orange-200">En espera · Salir</button> : <button disabled={busy === training.id} onClick={() => void sessionAction(training.id, "join")} className="btn flex-1 gap-2 py-3"><UserRoundCheck size={17} /> Quiero ir</button>}
                      {training.canManage && new Date(training.startsAt).getTime() <= Date.now() ? <button disabled={busy === training.id} onClick={() => void sessionAction(training.id, "complete")} className="rounded-xl border border-lime-300/20 px-3 text-lime-300" title="Marcar como completada"><CheckCircle2 size={17} /></button> : null}
                      {training.canManage ? <button disabled={busy === training.id} onClick={() => void sessionAction(training.id, "cancel")} className="rounded-xl border border-red-400/20 px-3 text-red-300" title="Cancelar sesión"><X size={17} /></button> : null}
                    </div> : null}
                  </article>
                );
              })}
            </div>
            {!initialSessions.length ? <div className="rounded-[28px] border border-dashed border-slate-700 p-10 text-center"><UsersRound className="mx-auto text-slate-600" /><h3 className="mt-3 font-black">El primer plan comienza contigo</h3><p className="mt-1 text-sm muted">Crea una sesión y el club recibirá la invitación al instante.</p></div> : null}
          </div>
        )}
        {message ? <p role="status" className="mt-4 rounded-xl bg-lime-300/10 px-4 py-3 text-center text-xs font-bold text-lime-200">{message}</p> : null}
      </div>
    </section>
  );
}
