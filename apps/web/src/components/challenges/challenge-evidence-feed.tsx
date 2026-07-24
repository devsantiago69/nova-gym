"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Layers3,
  LockKeyhole,
  MapPin,
  Pause,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { ProtectedImage } from "@/components/media/protected-image";

export type ChallengeEvidence = {
  evidenceKey: string;
  challengeId: string;
  challengeName: string;
  challenges: Array<{ id: string; name: string }>;
  attendanceId: string;
  ownerId: string;
  ownerName: string;
  username: string;
  avatarUrl?: string | undefined;
  localDate: string;
  durationMinutes: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photos: Array<{ id: string; type: string }>;
  myVerdict: "CONFIRMED" | "REJECTED" | null;
  confirmed: number;
  rejected: number;
  viewConsumed: boolean;
  storyDurationSeconds: number;
  reviewStateByChallenge: Record<
    string,
    {
      myVerdict: "CONFIRMED" | "REJECTED" | null;
      confirmed: number;
      rejected: number;
    }
  >;
};

type ViewerMode = "story" | "detail";

function evidenceStatus(item: ChallengeEvidence, own: boolean) {
  if (own) {
    if (item.rejected > 0)
      return {
        label: "El equipo pidió revisión",
        className: "bg-orange-500/20 text-orange-200",
      };
    if (item.confirmed > 0)
      return {
        label: "Esfuerzo validado",
        className: "bg-lime-400/15 text-lime-300",
      };
    return {
      label: "Esperando al equipo",
      className: "bg-slate-700/60 text-slate-300",
    };
  }
  if (item.myVerdict === "CONFIRMED")
    return {
      label: "Validaste el esfuerzo",
      className: "bg-lime-400/15 text-lime-300",
    };
  if (item.myVerdict === "REJECTED")
    return {
      label: "Pediste revisión",
      className: "bg-orange-500/20 text-orange-200",
    };
  return {
    label: "Tu voto pendiente",
    className: "bg-cyan-400/15 text-cyan-200",
  };
}

export function ChallengeEvidenceFeed({
  currentUserId,
  initial,
  embedded = false,
}: {
  currentUserId: string;
  initial: ChallengeEvidence[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const [viewer, setViewer] = useState<{
    evidenceKey: string;
    mode: ViewerMode;
    accessMode?: "verify" | "replay";
    viewToken?: string;
    expiresAt?: number;
  }>();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(10_000);
  const [viewDurationMs, setViewDurationMs] = useState(10_000);
  const [zoomed, setZoomed] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const activityScroll = useRef<HTMLDivElement>(null);

  const pendingStories = useMemo(
    () =>
      items.filter(
        (item) => item.ownerId !== currentUserId && item.myVerdict === null,
      ),
    [items, currentUserId],
  );
  const activeItem = viewer
    ? items.find((item) => item.evidenceKey === viewer.evidenceKey)
    : undefined;
  const storyIndex = activeItem
    ? pendingStories.findIndex(
        (item) => item.evidenceKey === activeItem.evidenceKey,
      )
    : -1;
  const privateView = Boolean(
    activeItem && activeItem.ownerId !== currentUserId,
  );
  const activePhoto = activeItem?.photos[photoIndex];
  const activePhotoUrl = activePhoto
    ? `/api/v1/attendance-photos/${activePhoto.id}${privateView && viewer?.viewToken ? `?challengeId=${encodeURIComponent(activeItem!.challengeId)}&viewToken=${encodeURIComponent(viewer.viewToken)}` : ""}`
    : undefined;

  function scrollActivity(direction: 1 | -1) {
    activityScroll.current?.scrollBy({
      left: direction * 300,
      behavior: "smooth",
    });
  }

  async function openViewer(evidenceKey: string, mode: ViewerMode) {
    const item = items.find(
      (candidate) => candidate.evidenceKey === evidenceKey,
    );
    if (!item) return;
    setPhotoIndex(0);
    setZoomed(false);
    setPaused(false);
    setMessage("");
    if (item.ownerId === currentUserId) {
      setViewer({ evidenceKey, mode });
      return;
    }
    const accessMode = item.myVerdict ? "replay" : "verify";
    setBusy(evidenceKey);
    const response = await fetch(
      `/api/v1/challenges/${item.challengeId}/evidence/${item.attendanceId}/view-session`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: accessMode }),
      },
    );
    const json = (await response.json()) as {
      data?: {
        token: string;
        expiresAt: string;
        seconds: number;
        location: {
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
        };
      };
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(undefined);
    if (!response.ok || !json.data) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.evidenceKey === evidenceKey
            ? { ...candidate, viewConsumed: response.status === 410 }
            : candidate,
        ),
      );
      setMessage(json.errors?.[0]?.message ?? json.message);
      return;
    }
    const expiresAt = new Date(json.data.expiresAt).getTime();
    setViewDurationMs(json.data.seconds * 1000);
    setItems((current) =>
      current.map((candidate) =>
        candidate.evidenceKey === evidenceKey
          ? {
              ...candidate,
              latitude: json.data!.location.latitude,
              longitude: json.data!.location.longitude,
              accuracy: json.data!.location.accuracy,
            }
          : candidate,
      ),
    );
    setRemainingMs(Math.max(0, expiresAt - Date.now()));
    setViewer({
      evidenceKey,
      mode,
      accessMode,
      viewToken: json.data.token,
      expiresAt,
    });
  }

  function closeViewer(reason?: "expired") {
    if (
      activeItem &&
      activeItem.ownerId !== currentUserId &&
      viewer?.accessMode === "verify"
    )
      setItems((current) =>
        current.map((item) =>
          item.evidenceKey === activeItem.evidenceKey
            ? { ...item, viewConsumed: true }
            : item,
        ),
      );
    setViewer(undefined);
    setZoomed(false);
    setPaused(false);
    if (reason === "expired")
      setMessage(
        viewer?.accessMode === "replay"
          ? "La reproducción temporal terminó. Puedes volver a abrirla desde el historial."
          : "La vista privada terminó. Tu voto sigue pendiente y puedes abrir una nueva ventana.",
      );
  }

  async function togglePause() {
    if (!viewer || !activeItem || !privateView || !viewer.viewToken) return;
    const action = paused ? "resume" : "pause";
    const response = await fetch(
      `/api/v1/challenges/${activeItem.challengeId}/evidence/${activeItem.attendanceId}/view-session`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          viewToken: viewer.viewToken,
          remainingMs,
        }),
      },
    );
    const json = (await response.json()) as {
      data?: { expiresAt: string; remainingMs: number };
      message: string;
      errors?: Array<{ message: string }>;
    };
    if (!response.ok || !json.data) {
      setMessage(json.errors?.[0]?.message ?? json.message);
      closeViewer("expired");
      return;
    }
    const expiresAt = new Date(json.data.expiresAt).getTime();
    setRemainingMs(json.data.remainingMs);
    setViewer((current) => (current ? { ...current, expiresAt } : current));
    setPaused(action === "pause");
  }

  function moveStory(direction: 1 | -1) {
    if (pendingStories.length === 0) {
      closeViewer();
      return;
    }
    const currentIndex = storyIndex < 0 ? 0 : storyIndex;
    const target = pendingStories[currentIndex + direction];
    closeViewer();
    if (target) void openViewer(target.evidenceKey, "story");
  }

  useEffect(() => {
    if (!viewer) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
      if (viewer.mode === "story" && event.key === "ArrowRight") moveStory(1);
      if (viewer.mode === "story" && event.key === "ArrowLeft") moveStory(-1);
      if (event.key === " " && privateView) {
        event.preventDefault();
        void togglePause();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });

  useEffect(() => {
    if (!viewer?.expiresAt || paused) return;
    const tick = () => {
      const next = viewer.expiresAt! - Date.now();
      setRemainingMs(Math.max(0, next));
      if (next <= 0) closeViewer("expired");
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [viewer?.evidenceKey, viewer?.expiresAt, paused]);

  async function review(
    evidenceKey: string,
    verdict: "CONFIRMED" | "REJECTED",
  ) {
    setBusy(evidenceKey);
    setMessage("");
    const before = items.find((item) => item.evidenceKey === evidenceKey);
    if (!before) return;
    const pendingBefore = items.filter(
      (item) => item.ownerId !== currentUserId && item.myVerdict === null,
    );
    const currentPendingIndex = pendingBefore.findIndex(
      (item) => item.evidenceKey === evidenceKey,
    );
    const response = await fetch(
      `/api/v1/challenges/${before.challengeId}/evidence/${before.attendanceId}/review`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verdict, viewToken: viewer?.viewToken }),
      },
    );
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(undefined);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (!response.ok) return;

    setItems((current) =>
      current.map((item) =>
        item.evidenceKey !== evidenceKey
          ? item
          : {
              ...item,
              myVerdict: verdict,
              confirmed:
                item.confirmed +
                (verdict === "CONFIRMED" ? 1 : 0) -
                (item.myVerdict === "CONFIRMED" ? 1 : 0),
              rejected:
                item.rejected +
                (verdict === "REJECTED" ? 1 : 0) -
                (item.myVerdict === "REJECTED" ? 1 : 0),
              viewConsumed: true,
              reviewStateByChallenge: {
                ...item.reviewStateByChallenge,
                [item.challengeId]: {
                  myVerdict: verdict,
                  confirmed:
                    item.confirmed +
                    (verdict === "CONFIRMED" ? 1 : 0) -
                    (item.myVerdict === "CONFIRMED" ? 1 : 0),
                  rejected:
                    item.rejected +
                    (verdict === "REJECTED" ? 1 : 0) -
                    (item.myVerdict === "REJECTED" ? 1 : 0),
                },
              },
            },
      ),
    );

    if (viewer?.mode === "story") {
      const next =
        pendingBefore[currentPendingIndex + 1] ??
        pendingBefore[currentPendingIndex - 1];
      if (next && next.evidenceKey !== evidenceKey)
        void openViewer(next.evidenceKey, "story");
      else closeViewer();
    } else closeViewer();
    router.refresh();
  }

  return (
    <section
      className={`${embedded ? "mb-0 border-0 bg-transparent p-0 shadow-none" : "mb-8 overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/30 p-5 shadow-[0_22px_80px_rgba(0,0,0,.18)] sm:p-7"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-lime-400">
            {embedded ? "HISTORIAS DE ESTA COMPETENCIA" : "EVIDENCIAS DEL RETO"}
          </p>
          <h4 className="mt-1 text-xl font-black">
            {embedded ? "Recorrido del equipo" : "Historias del equipo"}
          </h4>
          <p className="mt-1 text-sm muted">
            Revisa las nuevas evidencias. Cuando decidas, pasarán al historial
            del reto.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-2 text-xs font-bold text-lime-300">
          <ShieldCheck size={15} />
          Solo participantes
        </span>
      </div>

      {pendingStories.length > 0 ? (
        <div className="relative mt-5">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pendingStories.map((item) => (
              <button
                key={item.evidenceKey}
                type="button"
                disabled={busy === item.evidenceKey}
                onClick={() => void openViewer(item.evidenceKey, "story")}
                className="group w-[82px] shrink-0 snap-start text-center disabled:opacity-60"
              >
                <span className="relative mx-auto block h-[72px] w-[72px] rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-lime-400 p-[3px] shadow-[0_0_24px_rgba(163,230,53,.16)] transition group-hover:scale-105">
                  <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-slate-950 bg-gradient-to-br from-slate-800 to-slate-950">
                    <span className="text-xl font-black text-white">
                      {item.ownerName.charAt(0)}
                    </span>
                    {item.avatarUrl ? (
                      <Image
                        src={item.avatarUrl}
                        alt={`Foto de ${item.ownerName}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : null}
                    <span className="absolute inset-0 grid place-items-center bg-slate-950/35">
                      <LockKeyhole size={19} className="text-lime-300" />
                    </span>
                    <span className="absolute bottom-0 right-0 rounded-full bg-lime-400 px-1.5 py-1 text-[8px] font-black text-slate-950">
                      {item.storyDurationSeconds}s
                    </span>
                  </span>
                </span>
                <span className="mt-2 block truncate text-xs font-bold">
                  {busy === item.evidenceKey ? "Abriendo…" : item.ownerName}
                </span>
                <span className="block truncate text-[10px] text-orange-300">
                  Vista única
                </span>
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-900 to-transparent" />
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-lime-500/20 bg-lime-400/5 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime-400 text-slate-950">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <strong>Estás al día</strong>
            <p className="text-sm muted">
              No tienes historias pendientes por validar.
            </p>
          </div>
        </div>
      )}

      <div className="mt-7 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">
            ACTIVIDAD DEL EQUIPO
          </p>
          <h4 className="mt-1 text-lg font-black">Entrenamientos únicos</h4>
          <p className="mt-1 text-xs muted">
            Cada asistencia aparece una sola vez, aunque sume en varios retos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs muted sm:inline">
            {items.length} historias
          </span>
          <button
            type="button"
            onClick={() => scrollActivity(-1)}
            aria-label="Ver entrenamientos anteriores"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-lime-400 hover:text-lime-300"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollActivity(1)}
            aria-label="Ver más entrenamientos"
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-lime-400 hover:text-lime-300"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      {items.length > 0 ? (
        <div
          ref={activityScroll}
          className="-mx-2 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const own = item.ownerId === currentUserId;
            const status = evidenceStatus(item, own);
            const date = new Date(item.localDate);
            const canOpen = true;
            return (
              <button
                key={item.evidenceKey}
                type="button"
                disabled={!canOpen || busy === item.evidenceKey}
                onClick={() => void openViewer(item.evidenceKey, "detail")}
                className="w-[270px] shrink-0 snap-center overflow-hidden rounded-[22px] border border-slate-800 bg-slate-950/60 text-left shadow-[0_14px_35px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:border-slate-600 disabled:cursor-default"
              >
                <span className="relative block h-36 w-full bg-slate-800">
                  {own && item.photos[0] ? (
                    <ProtectedImage
                      src={`/api/v1/attendance-photos/${item.photos[0].id}`}
                      alt="Miniatura del entrenamiento"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center bg-gradient-to-br from-slate-800 to-slate-950">
                      <LockKeyhole
                        className={canOpen ? "text-lime-300" : "text-slate-600"}
                        size={34}
                      />
                      <small className="mt-[-35px] text-slate-500">
                        {item.myVerdict
                          ? `Historial · ${item.storyDurationSeconds} segundos`
                          : canOpen
                            ? `Privada · ${item.storyDurationSeconds} segundos`
                            : "Vista finalizada"}
                      </small>
                    </span>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-bold backdrop-blur ${status.className}`}
                  >
                    {status.label}
                  </span>
                  {item.challenges.length > 1 && (
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-cyan-200 backdrop-blur">
                      <Layers3 size={12} />
                      {item.challenges.length} retos
                    </span>
                  )}
                </span>
                <span className="block p-3">
                  <span className="flex items-center justify-between gap-2">
                    <strong className="truncate">
                      {own ? "Tu entrenamiento" : item.ownerName}
                    </strong>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-300">
                      {canOpen
                        ? item.myVerdict
                          ? "Volver a ver"
                          : "Ver"
                        : "Privado"}{" "}
                      {canOpen && <ChevronRight size={15} />}
                    </span>
                  </span>
                  <span className="mt-2 flex gap-1.5 overflow-hidden">
                    {item.challenges.slice(0, 2).map((challenge) => (
                      <span
                        key={challenge.id}
                        className="max-w-[110px] truncate rounded-full bg-orange-400/10 px-2 py-1 text-[9px] font-bold text-orange-200"
                      >
                        {challenge.name}
                      </span>
                    ))}
                    {item.challenges.length > 2 && (
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-[9px] font-bold text-slate-300">
                        +{item.challenges.length - 2}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block text-xs muted">
                    {date.toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })}{" "}
                    · {item.durationMinutes ?? 0} min
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-700 p-5 text-center text-sm muted">
          Las evidencias de tu equipo aparecerán aquí cuando registren una
          asistencia.
        </p>
      )}

      {message && !viewer && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-slate-950 p-3 text-sm text-lime-300"
        >
          {message}
        </p>
      )}

      {viewer && activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            viewer.mode === "story"
              ? "Historia de evidencia"
              : "Detalle del entrenamiento"
          }
          className="fixed inset-0 z-[70] grid bg-black/95 backdrop-blur-xl sm:place-items-center sm:p-5"
          onContextMenu={(event) => event.preventDefault()}
          onTouchStart={(event) => {
            touchStart.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (
              viewer.mode !== "story" ||
              touchStart.current === null ||
              zoomed
            )
              return;
            const distance =
              (event.changedTouches[0]?.clientX ?? touchStart.current) -
              touchStart.current;
            if (Math.abs(distance) > 55) moveStory(distance < 0 ? 1 : -1);
            touchStart.current = null;
          }}
        >
          <article className="relative flex h-full w-full select-none flex-col overflow-hidden bg-[#020617] sm:h-[min(880px,94vh)] sm:max-w-[460px] sm:rounded-[32px] sm:border sm:border-slate-700 sm:shadow-2xl">
            {privateView && (
              <div className="absolute inset-x-0 top-0 z-40 p-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime-400 to-cyan-300 transition-[width] duration-100"
                    style={{
                      width: `${Math.max(0, Math.min(100, (remainingMs / viewDurationMs) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 top-2 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-lime-400 font-black text-slate-950">
                  {activeItem.ownerName.charAt(0).toUpperCase()}
                  {activeItem.avatarUrl ? (
                    <Image
                      src={activeItem.avatarUrl}
                      alt={`Foto de ${activeItem.ownerName}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <strong className="block truncate">
                    {activeItem.ownerId === currentUserId
                      ? "Tu entrenamiento"
                      : activeItem.ownerName}
                  </strong>
                  <p className="truncate text-xs text-slate-300">
                    @{activeItem.username} ·{" "}
                    {privateView
                      ? `${Math.max(0, Math.ceil(remainingMs / 1000))} s · ${viewer.accessMode === "replay" ? "historial temporal" : "vista única"}`
                      : new Date(activeItem.localDate).toLocaleDateString(
                          "es-CO",
                          { day: "numeric", month: "short", timeZone: "UTC" },
                        )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {privateView && (
                  <button
                    type="button"
                    onClick={() => void togglePause()}
                    aria-label={
                      paused ? "Reanudar historia" : "Pausar historia"
                    }
                    className="rounded-full bg-black/55 p-2"
                  >
                    {paused ? <Play size={20} /> : <Pause size={20} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => closeViewer()}
                  aria-label="Cerrar historia"
                  className="rounded-full bg-black/55 p-2"
                >
                  <X />
                </button>
              </div>
            </div>

            <div
              className="relative min-h-0 flex-1 overflow-hidden bg-black"
              onDoubleClick={() => setZoomed((value) => !value)}
            >
              {activePhotoUrl ? (
                <ProtectedImage
                  src={activePhotoUrl}
                  alt={`Evidencia de ${activeItem.ownerName}`}
                  priority
                  className={`object-contain transition-transform duration-300 ${zoomed ? "scale-[1.65]" : "scale-100"}`}
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Flame className="h-16 w-16 text-orange-400" />
                </div>
              )}
              {privateView && (
                <button
                  type="button"
                  onClick={() => setZoomed((value) => !value)}
                  className="absolute right-4 top-24 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white backdrop-blur"
                  aria-label={
                    zoomed ? "Alejar fotografía" : "Ampliar fotografía"
                  }
                >
                  {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                </button>
              )}
              {activeItem.photos.length > 1 && (
                <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2">
                  {activeItem.photos.map((photo, index) => (
                    <button
                      type="button"
                      key={photo.id}
                      onClick={() => setPhotoIndex(index)}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black backdrop-blur ${photoIndex === index ? "bg-white text-slate-950" : "bg-black/60 text-white"}`}
                    >
                      {photo.type === "START" ? "INICIO" : "FINAL"}
                    </button>
                  ))}
                </div>
              )}
              {viewer.mode === "story" && (
                <>
                  <button
                    type="button"
                    aria-label="Historia anterior"
                    onClick={() => moveStory(-1)}
                    disabled={storyIndex <= 0}
                    className="absolute bottom-16 left-2 top-24 z-10 w-16 disabled:opacity-0"
                  >
                    <ChevronLeft
                      className="rounded-full bg-black/35 p-2"
                      size={38}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="Historia siguiente"
                    onClick={() => moveStory(1)}
                    disabled={storyIndex >= pendingStories.length - 1}
                    className="absolute bottom-16 right-2 top-24 z-10 w-16 disabled:opacity-0"
                  >
                    <ChevronRight
                      className="ml-auto rounded-full bg-black/35 p-2"
                      size={38}
                    />
                  </button>
                </>
              )}
            </div>

            <div className="max-h-[52dvh] shrink-0 overflow-y-auto border-t border-slate-800 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [scrollbar-width:thin]">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2">
                  <Clock3 size={14} />
                  {activeItem.durationMinutes ?? 0} minutos
                </span>
                {activeItem.latitude !== null &&
                  activeItem.longitude !== null && (
                    <a
                      href={`https://www.google.com/maps?q=${activeItem.latitude},${activeItem.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-lime-300"
                    >
                      <MapPin size={14} />
                      Ver ubicación
                      {activeItem.accuracy
                        ? ` · ±${Math.round(activeItem.accuracy)} m`
                        : ""}
                    </a>
                  )}
              </div>
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeItem.challenges.map((challenge) => (
                  <span
                    key={challenge.id}
                    className="shrink-0 rounded-full border border-orange-400/15 bg-orange-400/[.07] px-2.5 py-1 text-[9px] font-bold text-orange-200"
                  >
                    Aporta a {challenge.name}
                  </span>
                ))}
              </div>
              {activeItem.ownerId === currentUserId ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-lime-400/20 bg-gradient-to-r from-lime-400/10 to-cyan-400/5 p-4 text-sm">
                  <div className="flex items-center gap-2 font-black">
                    <Sparkles size={17} className="text-lime-300" />
                    El equipo está viendo tu esfuerzo
                  </div>
                  <p className="mt-1 muted">
                    <span className="font-bold text-lime-300">
                      {activeItem.confirmed} validaciones
                    </span>
                    {activeItem.rejected > 0 && (
                      <span className="text-orange-300">
                        {" "}
                        · {activeItem.rejected} solicitudes de revisión
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-3">
                    <p className="text-[10px] font-black tracking-[.18em] text-lime-300">
                      {viewer.accessMode === "replay"
                        ? "DECISIÓN DEL RETO"
                        : "VERIFICACIÓN PRIVADA"}{" "}
                      ·{" "}
                      {Math.max(0, Math.ceil(remainingMs / 1000))} S
                    </p>
                    <h3 className="mt-1 text-lg font-black">
                      {viewer.accessMode === "replay"
                        ? "Puedes actualizar tu decisión"
                        : "¿Esta evidencia enciende la racha?"}
                    </h3>
                    <p className="mt-1 text-xs muted">
                      {viewer.accessMode === "replay"
                        ? "El cambio se aplicará únicamente a este reto y reemplazará tu voto anterior."
                        : "Decide antes de que termine el tiempo. Si se cierra, podrás abrir otra ventana mientras tu voto siga pendiente."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={
                        busy === activeItem.evidenceKey || remainingMs <= 0
                      }
                      onClick={() =>
                        review(activeItem.evidenceKey, "CONFIRMED")
                      }
                      className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition duration-300 ${activeItem.myVerdict === "CONFIRMED" ? "border-lime-300 bg-gradient-to-br from-lime-300 to-emerald-400 text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.24)]" : "border-lime-400/25 bg-lime-400/[.06] hover:-translate-y-0.5 hover:border-lime-300"}`}
                    >
                      {activeItem.myVerdict === "CONFIRMED" && (
                        <span className="absolute right-2 top-2 rounded-full bg-slate-950/15 px-2 py-1 text-[8px] font-black tracking-wider">
                          TU VOTO
                        </span>
                      )}
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${activeItem.myVerdict === "CONFIRMED" ? "bg-slate-950 text-lime-300" : "bg-lime-400/15 text-lime-300"}`}
                      >
                        <Flame size={19} />
                      </span>
                      <strong className="mt-3 block text-sm">
                        Sí, suma al reto
                      </strong>
                      <span
                        className={`mt-0.5 block text-[10px] ${activeItem.myVerdict === "CONFIRMED" ? "text-slate-800" : "text-slate-400"}`}
                      >
                        Esfuerzo validado
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy === activeItem.evidenceKey || remainingMs <= 0
                      }
                      onClick={() => review(activeItem.evidenceKey, "REJECTED")}
                      className={`group relative overflow-hidden rounded-2xl border p-3 text-left transition duration-300 ${activeItem.myVerdict === "REJECTED" ? "border-orange-300 bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-[0_0_28px_rgba(251,146,60,.22)]" : "border-orange-400/20 bg-orange-400/[.05] hover:-translate-y-0.5 hover:border-orange-300"}`}
                    >
                      {activeItem.myVerdict === "REJECTED" && (
                        <span className="absolute right-2 top-2 rounded-full bg-black/20 px-2 py-1 text-[8px] font-black tracking-wider">
                          TU VOTO
                        </span>
                      )}
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${activeItem.myVerdict === "REJECTED" ? "bg-white/20 text-white" : "bg-orange-400/10 text-orange-300"}`}
                      >
                        <ShieldAlert size={19} />
                      </span>
                      <strong className="mt-3 block text-sm">
                        Pedir revisión
                      </strong>
                      <span
                        className={`mt-0.5 block text-[10px] ${activeItem.myVerdict === "REJECTED" ? "text-orange-50" : "text-slate-400"}`}
                      >
                        Algo no convence
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                    <span className="text-[10px] muted">
                      Descarga, caché y clic derecho bloqueados.
                    </span>
                    <span className="shrink-0 text-[10px] font-black text-cyan-300">
                      {viewer.accessMode === "replay"
                        ? "DECISIÓN EDITABLE"
                        : "VISTA ÚNICA"}
                    </span>
                  </div>
                </div>
              )}
              {message && (
                <p
                  role="status"
                  className="mt-3 text-center text-xs text-lime-300"
                >
                  {message}
                </p>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
