"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Search,
  Send,
  Swords,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

type Person = {
  id: string;
  username: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarKey: string | null;
  } | null;
};
type Connection = { friendshipId: string; person: Person };
type SectionId = "incoming" | "friends" | "outgoing" | "discover";
type Accent = "lime" | "cyan" | "orange" | "violet";

const accentClasses: Record<
  Accent,
  { icon: string; count: string; open: string; glow: string }
> = {
  lime: {
    icon: "border-lime-300/20 bg-lime-300/10 text-lime-300",
    count: "border-lime-300/15 bg-lime-300/[.07] text-lime-200",
    open: "group-open:text-lime-300",
    glow: "from-lime-300/[.09]",
  },
  cyan: {
    icon: "border-cyan-300/20 bg-cyan-300/10 text-cyan-300",
    count: "border-cyan-300/15 bg-cyan-300/[.07] text-cyan-200",
    open: "group-open:text-cyan-300",
    glow: "from-cyan-300/[.09]",
  },
  orange: {
    icon: "border-orange-300/20 bg-orange-300/10 text-orange-300",
    count: "border-orange-300/15 bg-orange-300/[.07] text-orange-200",
    open: "group-open:text-orange-300",
    glow: "from-orange-300/[.09]",
  },
  violet: {
    icon: "border-violet-300/20 bg-violet-300/10 text-violet-300",
    count: "border-violet-300/15 bg-violet-300/[.07] text-violet-200",
    open: "group-open:text-violet-300",
    glow: "from-violet-300/[.09]",
  },
};

function displayName(person: Person) {
  return (
    `${person.profile?.firstName ?? ""} ${person.profile?.lastName ?? ""}`.trim() ||
    person.username
  );
}

function Avatar({ person, large = false }: { person: Person; large?: boolean }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-300 to-cyan-300 font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.1)] ${large ? "h-14 w-14 text-xl" : "h-11 w-11"}`}
    >
      {displayName(person).charAt(0).toUpperCase()}
      {person.profile?.avatarKey ? (
        <Image
          src={`/api/v1/profile/avatar/${person.id}`}
          alt={displayName(person)}
          fill
          unoptimized
          className="object-cover"
        />
      ) : null}
    </span>
  );
}

function CommunitySection({
  id,
  active,
  onToggle,
  icon: Icon,
  eyebrow,
  title,
  description,
  count,
  accent,
  children,
}: {
  id: SectionId;
  active: SectionId | null;
  onToggle: (id: SectionId) => void;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  count: number;
  accent: Accent;
  children: ReactNode;
}) {
  const styles = accentClasses[accent];
  const open = active === id;
  return (
    <section
      className={`group relative overflow-hidden rounded-[28px] border bg-gradient-to-br ${styles.glow} to-transparent shadow-[0_22px_65px_rgba(0,0,0,.18)] backdrop-blur-xl transition ${open ? "border-white/[.13] bg-slate-900/90" : "border-white/[.07] bg-slate-900/65"}`}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left sm:p-6"
      >
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${styles.icon}`}
        >
          <Icon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black tracking-[.16em] text-slate-500">
            {eyebrow}
          </span>
          <strong className="mt-1 block text-xl sm:text-2xl">{title}</strong>
          <span className="mt-1 hidden text-xs text-slate-400 sm:block">
            {description}
          </span>
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${styles.count}`}
        >
          {count}
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-500 transition duration-300 ${open ? `rotate-180 ${styles.open.replace("group-open:", "")}` : ""}`}
        />
      </button>
      {open ? (
        <div className="border-t border-white/[.06] p-4 sm:p-5">{children}</div>
      ) : null}
    </section>
  );
}

export function CommunityManager({
  people,
  friends,
  incoming,
  outgoing,
}: {
  people: Person[];
  friends: Connection[];
  incoming: Connection[];
  outgoing: Connection[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string>();
  const [active, setActive] = useState<SectionId | null>(
    incoming.length ? "incoming" : "friends",
  );
  const relatedIds = useMemo(
    () =>
      new Set(
        [...friends, ...incoming, ...outgoing].map((item) => item.person.id),
      ),
    [friends, incoming, outgoing],
  );
  const discover = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return people.filter(
      (person) =>
        !relatedIds.has(person.id) &&
        `${person.username} ${person.profile?.firstName ?? ""} ${person.profile?.lastName ?? ""}`
          .toLowerCase()
          .includes(normalized),
    );
  }, [people, query, relatedIds]);
  const visibleDiscover = discover.slice(0, query.trim() ? 24 : 8);

  function toggle(id: SectionId) {
    setActive((current) => (current === id ? null : id));
  }

  async function action(
    body: { action: string; targetId?: string; friendshipId?: string },
    key: string,
  ) {
    setBusy(key);
    setMessage("");
    const response = await fetch("/api/v1/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          [UserCheck, friends.length, "Amigos", "text-lime-300", "bg-lime-300/[.07]"],
          [Send, incoming.length, "Por responder", "text-cyan-300", "bg-cyan-300/[.07]"],
          [Clock3, outgoing.length, "Enviadas", "text-orange-300", "bg-orange-300/[.07]"],
        ].map(([Icon, value, label, color, background]) => {
          const StatIcon = Icon as LucideIcon;
          return (
            <article
              key={String(label)}
              className={`rounded-[22px] border border-white/[.07] ${background} p-3.5 shadow-[0_14px_35px_rgba(0,0,0,.12)] backdrop-blur sm:p-5`}
            >
              <StatIcon className={String(color)} size={20} />
              <p className="mt-3 text-2xl font-black">{String(value)}</p>
              <p className="truncate text-[10px] text-slate-400 sm:text-sm">
                {String(label)}
              </p>
            </article>
          );
        })}
      </div>

      {incoming.length ? (
        <CommunitySection
          id="incoming"
          active={active}
          onToggle={toggle}
          icon={UserPlus}
          eyebrow="NUEVAS CONEXIONES"
          title="Quieren entrenar contigo"
          description="Acepta o rechaza cada solicitud desde este panel."
          count={incoming.length}
          accent="lime"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {incoming.map(({ friendshipId, person }) => (
              <article
                key={friendshipId}
                className="rounded-2xl border border-white/[.07] bg-slate-950/65 p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar person={person} />
                  <div className="min-w-0">
                    <strong className="block truncate">
                      {displayName(person)}
                    </strong>
                    <p className="truncate text-sm text-slate-500">
                      @{person.username}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    disabled={busy === friendshipId}
                    onClick={() =>
                      void action({ action: "accept", friendshipId }, friendshipId)
                    }
                    className="btn gap-2"
                  >
                    <Check size={17} /> Aceptar
                  </button>
                  <button
                    disabled={busy === friendshipId}
                    onClick={() =>
                      void action({ action: "reject", friendshipId }, friendshipId)
                    }
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 p-3 text-sm font-bold hover:border-red-400 hover:text-red-300"
                  >
                    <X size={17} /> Ahora no
                  </button>
                </div>
              </article>
            ))}
          </div>
        </CommunitySection>
      ) : null}

      <CommunitySection
        id="friends"
        active={active}
        onToggle={toggle}
        icon={UsersRound}
        eyebrow="TU EQUIPO"
        title="Mis amigos"
        description="Tu círculo disponible para compartir progreso y crear retos."
        count={friends.length}
        accent="cyan"
      >
        {friends.length === 0 ? (
          <div className="py-8 text-center">
            <UsersRound className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-4 font-bold">Tu equipo está por comenzar</p>
            <button
              type="button"
              onClick={() => setActive("discover")}
              className="mt-2 text-sm font-black text-cyan-300"
            >
              Descubrir personas
            </button>
          </div>
        ) : (
          <>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
              {friends.map(({ friendshipId, person }) => (
                <article
                  key={friendshipId}
                  className="group min-w-[75vw] snap-start rounded-[24px] border border-white/[.07] bg-slate-950/55 p-4 transition hover:border-cyan-300/30 sm:min-w-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar person={person} large />
                    <div className="min-w-0">
                      <strong className="block truncate text-lg">
                        {displayName(person)}
                      </strong>
                      <p className="truncate text-sm text-slate-500">
                        @{person.username}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/retos"
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] p-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
                  >
                    <Swords size={17} /> Retar
                  </Link>
                </article>
              ))}
            </div>
            <Link
              href="/retos"
              className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-300"
            >
              <Swords size={16} /> Crear un reto con amigos
            </Link>
          </>
        )}
      </CommunitySection>

      {outgoing.length ? (
        <CommunitySection
          id="outgoing"
          active={active}
          onToggle={toggle}
          icon={Clock3}
          eyebrow="EN ESPERA"
          title="Solicitudes enviadas"
          description="Revisa quién todavía no ha respondido tu invitación."
          count={outgoing.length}
          accent="orange"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outgoing.map(({ friendshipId, person }) => (
              <article
                key={friendshipId}
                className="flex items-center gap-3 rounded-2xl border border-white/[.07] bg-slate-950/55 p-4"
              >
                <Avatar person={person} />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {displayName(person)}
                  </strong>
                  <p className="truncate text-xs text-slate-500">
                    @{person.username} · Pendiente
                  </p>
                </div>
                <button
                  aria-label={`Cancelar solicitud a ${person.username}`}
                  disabled={busy === friendshipId}
                  onClick={() =>
                    void action({ action: "cancel", friendshipId }, friendshipId)
                  }
                  className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:border-red-400 hover:text-red-300"
                >
                  <X size={18} />
                </button>
              </article>
            ))}
          </div>
        </CommunitySection>
      ) : null}

      <CommunitySection
        id="discover"
        active={active}
        onToggle={toggle}
        icon={Compass}
        eyebrow="DESCUBRIR"
        title="Encuentra personas"
        description="Busca por nombre o usuario sin llenar toda la pantalla."
        count={discover.length}
        accent="violet"
      >
        <label className="flex items-center gap-3 rounded-2xl border border-violet-300/20 bg-slate-950/75 px-4 shadow-inner focus-within:border-violet-300/50">
          <Search className="shrink-0 text-violet-300" size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o @usuario"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-4 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="text-slate-500"
            >
              <X size={18} />
            </button>
          ) : null}
        </label>
        <div className="mt-4 max-h-[58vh] overflow-y-auto overscroll-contain pr-1 [scrollbar-color:#334155_transparent]">
          {visibleDiscover.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <Search className="mx-auto mb-3 text-slate-600" />
              {query
                ? "No encontramos personas con esa búsqueda."
                : "No hay nuevas personas disponibles por ahora."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDiscover.map((person) => (
                <article
                  key={person.id}
                  className="rounded-2xl border border-white/[.07] bg-slate-950/55 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar person={person} />
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {displayName(person)}
                      </strong>
                      <p className="truncate text-sm text-slate-500">
                        @{person.username}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={busy === person.id}
                    onClick={() =>
                      void action({ action: "send", targetId: person.id }, person.id)
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300/30 bg-violet-300/[.06] p-3 text-sm font-bold text-violet-100 transition hover:bg-violet-300 hover:text-slate-950"
                  >
                    <UserPlus size={17} />
                    {busy === person.id ? "Enviando…" : "Agregar amigo"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
        {!query && discover.length > visibleDiscover.length ? (
          <p className="mt-3 text-center text-[10px] text-slate-500">
            Escribe un nombre para buscar entre {discover.length} personas.
          </p>
        ) : null}
      </CommunitySection>

      {message ? (
        <p
          role="status"
          className="fixed bottom-24 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-lime-300/20 bg-slate-900/95 px-5 py-4 text-center text-sm font-bold text-lime-300 shadow-2xl backdrop-blur-xl"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
