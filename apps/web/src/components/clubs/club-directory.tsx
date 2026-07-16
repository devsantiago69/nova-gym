"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

export type ClubSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  visibility: string;
  city: string | null;
  discipline: string | null;
  accentColor: string;
  memberCount: number;
  membershipStatus: string | null;
  ownerName: string;
};
const accents: Record<string, string> = {
  lime: "from-lime-400/20 to-emerald-400/5 border-lime-400/20",
  cyan: "from-cyan-400/20 to-blue-400/5 border-cyan-400/20",
  orange: "from-orange-400/20 to-red-400/5 border-orange-400/20",
  violet: "from-violet-400/20 to-pink-400/5 border-violet-400/20",
};
const swatches: Record<string, string> = {
  lime: "bg-lime-400",
  cyan: "bg-cyan-400",
  orange: "bg-orange-400",
  violet: "bg-violet-400",
};
const typeNames: Record<string, string> = {
  GYM: "Gimnasio",
  CITY: "Ciudad",
  DISCIPLINE: "Disciplina",
  COMMUNITY: "Comunidad",
};

export function ClubDirectory({ initial }: { initial: ClubSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const visible = useMemo(
    () =>
      initial.filter((club) =>
        `${club.name} ${club.city ?? ""} ${club.discipline ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
      ),
    [initial, query],
  );
  async function join(club: ClubSummary) {
    setBusy(club.id);
    setMessage("");
    const response = await fetch(`/api/v1/clubs/${club.id}/membership`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "join" }),
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(undefined);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok) router.refresh();
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/clubs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const json = (await response.json()) as {
      data?: { slug: string };
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(undefined);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok && json.data) router.push(`/clubes/${json.data.slug}`);
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 focus-within:border-cyan-300">
          <Search size={18} className="text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar gimnasio, ciudad o disciplina"
            className="w-full bg-transparent py-4 outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn gap-2 px-5 py-4"
        >
          <Plus size={18} />
          Crear club
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((club) => (
          <article
            key={club.id}
            className={`group overflow-hidden rounded-[28px] border bg-gradient-to-br ${accents[club.accentColor] ?? accents.lime} via-slate-900 to-slate-950 shadow-[0_20px_60px_rgba(0,0,0,.16)]`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white">
                  {club.type === "GYM" ? (
                    <Building2 />
                  ) : club.type === "CITY" ? (
                    <MapPin />
                  ) : club.type === "DISCIPLINE" ? (
                    <Dumbbell />
                  ) : (
                    <UsersRound />
                  )}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1.5 text-[9px] font-black text-slate-300">
                  {club.visibility === "PUBLIC" ? (
                    <Globe2 size={12} />
                  ) : club.visibility === "REQUEST" ? (
                    <ShieldCheck size={12} />
                  ) : (
                    <LockKeyhole size={12} />
                  )}{" "}
                  {club.visibility === "PUBLIC"
                    ? "ABIERTO"
                    : club.visibility === "REQUEST"
                      ? "POR SOLICITUD"
                      : "PRIVADO"}
                </span>
              </div>
              <p className="mt-5 text-[10px] font-black tracking-[.14em] text-cyan-300">
                {typeNames[club.type]}
              </p>
              <h2 className="mt-1 text-2xl font-black">{club.name}</h2>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-400">
                {club.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-300">
                {club.city ? (
                  <span className="rounded-full bg-black/25 px-3 py-1.5">
                    {club.city}
                  </span>
                ) : null}
                {club.discipline ? (
                  <span className="rounded-full bg-black/25 px-3 py-1.5">
                    {club.discipline}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-white/[.06] p-4">
              <span className="flex flex-1 items-center gap-2 text-xs text-slate-400">
                <UsersRound size={15} />
                <strong className="text-white">{club.memberCount}</strong>{" "}
                integrantes
              </span>
              {club.membershipStatus === "ACTIVE" ? (
                <Link
                  href={`/clubes/${club.slug}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950"
                >
                  Entrar
                  <ChevronRight size={15} />
                </Link>
              ) : club.membershipStatus === "PENDING" ? (
                <span className="rounded-xl bg-orange-400/10 px-3 py-2.5 text-xs font-black text-orange-200">
                  Solicitud enviada
                </span>
              ) : (
                <button
                  disabled={busy === club.id}
                  onClick={() => void join(club)}
                  className="rounded-xl border border-lime-300/35 px-4 py-2.5 text-sm font-black text-lime-300"
                >
                  {busy === club.id ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : club.visibility === "PUBLIC" ? (
                    "Unirme"
                  ) : (
                    "Solicitar"
                  )}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!visible.length ? (
        <div className="rounded-[28px] border border-dashed border-slate-700 p-10 text-center">
          <Search className="mx-auto text-slate-600" />
          <p className="mt-3 font-black">
            No encontramos clubes con esa búsqueda
          </p>
        </div>
      ) : null}
      {creating ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-3 backdrop-blur-xl sm:grid sm:place-items-center sm:p-6">
          <form
            onSubmit={create}
            className="mx-auto w-full max-w-2xl overflow-hidden rounded-[32px] border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-800 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-black tracking-[.16em] text-lime-300">
                  NUEVO CLUB
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Crea un lugar para pertenecer
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-full bg-slate-950 p-2"
              >
                <X />
              </button>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <label className="text-sm font-bold sm:col-span-2">
                Nombre
                <input
                  name="name"
                  required
                  minLength={3}
                  maxLength={120}
                  placeholder="Ej. Nova Runners Bogotá"
                  className="control mt-2"
                />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Propósito
                <textarea
                  name="description"
                  required
                  minLength={20}
                  maxLength={600}
                  rows={3}
                  placeholder="Cuenta qué une a este club…"
                  className="control mt-2 resize-none"
                />
              </label>
              <label className="text-sm font-bold">
                Tipo
                <select name="type" className="control mt-2">
                  <option value="GYM">Gimnasio</option>
                  <option value="CITY">Ciudad</option>
                  <option value="DISCIPLINE">Disciplina</option>
                  <option value="COMMUNITY">Comunidad</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                Acceso
                <select name="visibility" className="control mt-2">
                  <option value="PUBLIC">Abierto</option>
                  <option value="REQUEST">Aprobar solicitudes</option>
                  <option value="PRIVATE">Solo invitación</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                Ciudad
                <input
                  name="city"
                  placeholder="Bogotá"
                  className="control mt-2"
                />
              </label>
              <label className="text-sm font-bold">
                Disciplina
                <input
                  name="discipline"
                  placeholder="Fuerza, running…"
                  className="control mt-2"
                />
              </label>
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-bold">Energía visual</legend>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {["lime", "cyan", "orange", "violet"].map((color) => (
                    <label
                      key={color}
                      className={`cursor-pointer rounded-2xl border p-3 text-center ${accents[color]}`}
                    >
                      <input
                        type="radio"
                        name="accentColor"
                        value={color}
                        defaultChecked={color === "lime"}
                        className="sr-only"
                      />
                      <span
                        className={`mx-auto block h-7 w-7 rounded-full ${swatches[color]}`}
                      />
                      <span className="mt-2 block text-[9px] font-black uppercase">
                        {color}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="sm:col-span-2 flex gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.05] p-4 text-sm">
                <ShieldCheck className="shrink-0 text-cyan-300" />
                <p className="muted">
                  Serás responsable del club. Después podrás nombrar
                  administradores y gestionar solicitudes.
                </p>
              </div>
              <button
                disabled={busy === "create"}
                className="btn gap-2 py-4 sm:col-span-2"
              >
                {busy === "create" ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Sparkles />
                )}
                Crear mi club
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {message ? (
        <p
          role="status"
          className="fixed bottom-24 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-center text-sm font-bold text-lime-200 shadow-2xl"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
