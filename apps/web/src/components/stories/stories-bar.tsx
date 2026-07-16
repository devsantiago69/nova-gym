"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  LockKeyhole,
  MapPin,
  Pause,
  Play,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react";
import { ProtectedImage } from "@/components/media/protected-image";

export type StoryItem = {
  id: string;
  attendanceId: string;
  challengeId?: string;
  challengeName?: string;
  ownerName: string;
  username: string;
  avatarUrl?: string | undefined;
  isOwn: boolean;
  photos: Array<{ id: string; type: string }>;
  durationMinutes: number | null;
  createdAt: string;
  storyDurationSeconds: number;
};

type ActiveStory = {
  index: number;
  token?: string;
  expiresAt?: number;
  totalMs: number;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
};

export function StoriesBar({
  items,
  locale,
}: {
  items: StoryItem[];
  locale: "es" | "en";
}) {
  const [active, setActive] = useState<ActiveStory>();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState<number>();
  const [message, setMessage] = useState("");
  const touchStart = useRef<number | null>(null);
  const expiredStoryRef = useRef<number | null>(null);
  const dateLocale = locale === "en" ? "en-US" : "es-CO";
  const item = active ? items[active.index] : undefined;
  const photos = useMemo(
    () =>
      item
        ? [...item.photos].sort((a, b) =>
            a.type === "START" ? -1 : b.type === "START" ? 1 : 0,
          )
        : [],
    [item],
  );
  const photo = photos[photoIndex];
  const photoUrl =
    photo && item
      ? item.isOwn
        ? `/api/v1/attendance-photos/${photo.id}`
        : active?.token && item.challengeId
          ? `/api/v1/attendance-photos/${photo.id}?challengeId=${encodeURIComponent(item.challengeId)}&viewToken=${encodeURIComponent(active.token)}`
          : undefined
      : undefined;

  async function open(index: number) {
    const target = items[index];
    if (!target) return;
    setMessage("");
    setPhotoIndex(0);
    setPaused(false);
    const totalMs = target.storyDurationSeconds * 1000;
    if (target.isOwn) {
      setRemainingMs(totalMs);
      setActive({ index, totalMs });
      return;
    }
    if (!target.challengeId) return;
    setBusy(index);
    const response = await fetch(
      `/api/v1/challenges/${target.challengeId}/evidence/${target.attendanceId}/view-session`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "replay" }),
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
      setMessage(json.errors?.[0]?.message ?? json.message);
      return;
    }
    const expiresAt = new Date(json.data.expiresAt).getTime();
    setRemainingMs(Math.max(0, expiresAt - Date.now()));
    setActive({
      index,
      token: json.data.token,
      expiresAt,
      totalMs: json.data.seconds * 1000,
      ...json.data.location,
    });
  }

  function close() {
    expiredStoryRef.current = null;
    setActive(undefined);
    setPaused(false);
    setPhotoIndex(0);
  }

  async function togglePause() {
    if (!active || !item) return;
    if (item.isOwn) {
      setPaused((value) => !value);
      return;
    }
    if (!active.token || !item.challengeId) return;
    const action = paused ? "resume" : "pause";
    const response = await fetch(
      `/api/v1/challenges/${item.challengeId}/evidence/${item.attendanceId}/view-session`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, viewToken: active.token, remainingMs }),
      },
    );
    const json = (await response.json()) as {
      data?: { expiresAt: string; remainingMs: number };
      message: string;
      errors?: Array<{ message: string }>;
    };
    if (!response.ok || !json.data) {
      setMessage(json.errors?.[0]?.message ?? json.message);
      close();
      return;
    }
    setRemainingMs(json.data.remainingMs);
    setActive((current) =>
      current
        ? { ...current, expiresAt: new Date(json.data!.expiresAt).getTime() }
        : current,
    );
    setPaused(action === "pause");
  }

  function move(direction: 1 | -1) {
    const next = (active?.index ?? 0) + direction;
    if (next < 0 || next >= items.length) {
      close();
      return;
    }
    void open(next);
  }

  useEffect(() => {
    if (!active || paused) return;
    const timer = window.setInterval(() => {
      setRemainingMs((value) => {
        const next = active.expiresAt
          ? Math.max(0, active.expiresAt - Date.now())
          : Math.max(0, value - 100);
        if (next <= 0 && expiredStoryRef.current !== active.index) {
          expiredStoryRef.current = active.index;
          window.setTimeout(() => move(1), 0);
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [active?.index, active?.expiresAt, paused, item?.isOwn]);

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === " ") {
        event.preventDefault();
        void togglePause();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keyboard);
    };
  }, [active?.index, active?.token, item?.isOwn, paused, remainingMs]);

  if (!items.length) return null;

  return (
    <section className="mb-7 overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/20 p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[.14em] text-violet-300">
            HISTORIAS DE ENTRENAMIENTO
          </p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            Tu equipo en movimiento
          </h2>
          <p className="mt-1 text-xs muted">
            Desliza, abre y vuelve a vivir entrenamientos ya validados.
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-cyan-400/10 px-3 py-2 text-[10px] font-black text-cyan-200 sm:inline-flex">
          <ShieldCheck size={14} />
          Solo retos compartidos
        </span>
      </div>
      <div className="-mx-2 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((story, index) => (
          <button
            type="button"
            key={story.id}
            disabled={busy === index}
            onClick={() => void open(index)}
            className="group w-[82px] shrink-0 snap-start text-center disabled:opacity-60"
          >
            <span
              className={`relative mx-auto block h-[72px] w-[72px] rounded-full p-[3px] transition group-hover:scale-105 ${story.isOwn ? "bg-gradient-to-br from-lime-300 to-cyan-400" : "bg-gradient-to-br from-orange-400 via-pink-500 to-violet-500"}`}
            >
              <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-slate-950 bg-slate-900">
                <span className="text-xl font-black">
                  {story.ownerName.charAt(0).toUpperCase()}
                </span>
                {story.avatarUrl ? (
                  <Image
                    src={story.avatarUrl}
                    alt={`Foto de ${story.ownerName}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
                {!story.isOwn && !story.avatarUrl && (
                  <LockKeyhole size={17} className="absolute text-white/55" />
                )}
                <span className="absolute bottom-0 right-0 rounded-full bg-slate-950 px-1.5 py-1 text-[8px] font-black text-lime-300">
                  {story.storyDurationSeconds}s
                </span>
              </span>
            </span>
            <strong className="mt-2 block truncate text-xs">
              {busy === index
                ? "Abriendo…"
                : story.isOwn
                  ? "Tú"
                  : story.ownerName}
            </strong>
            <small className="block truncate text-[9px] text-slate-500">
              {new Date(story.createdAt).toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}
            </small>
          </button>
        ))}
      </div>
      {message && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-slate-950 p-3 text-xs text-orange-300"
        >
          {message}
        </p>
      )}

      {active && item ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Historia del entrenamiento"
          className="fixed inset-0 z-[90] grid bg-black/95 backdrop-blur-xl sm:place-items-center sm:p-5"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="relative flex h-full w-full select-none flex-col overflow-hidden bg-[#020617] sm:h-[min(880px,94vh)] sm:max-w-[470px] sm:rounded-[34px] sm:border sm:border-slate-700 sm:shadow-2xl">
            <div className="absolute inset-x-0 top-0 z-40 p-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-400 via-cyan-300 to-violet-400 transition-[width] duration-100"
                  style={{
                    width: `${Math.max(0, Math.min(100, (remainingMs / active.totalMs) * 100))}%`,
                  }}
                />
              </div>
            </div>
            <div className="absolute inset-x-0 top-2 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/90 to-transparent px-4 pb-10 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-orange-400 to-lime-400 font-black text-slate-950">
                  {item.ownerName.charAt(0).toUpperCase()}
                  {item.avatarUrl ? (
                    <Image
                      src={item.avatarUrl}
                      alt={`Foto de ${item.ownerName}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <strong className="block truncate">
                    {item.isOwn ? "Tu entrenamiento" : item.ownerName}
                  </strong>
                  <p className="truncate text-xs text-slate-300">
                    @{item.username} ·{" "}
                    {Math.max(0, Math.ceil(remainingMs / 1000))} s
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void togglePause()}
                  aria-label={paused ? "Reanudar historia" : "Pausar historia"}
                  className="rounded-full bg-black/45 p-2"
                >
                  {paused ? <Play size={20} /> : <Pause size={20} />}
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Cerrar historia"
                  className="rounded-full bg-black/45 p-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div
              className="relative min-h-0 flex-1 overflow-hidden bg-black"
              onTouchStart={(event) => {
                touchStart.current = event.changedTouches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                if (touchStart.current === null) return;
                const value =
                  event.changedTouches[0]?.clientX ?? touchStart.current;
                if (Math.abs(value - touchStart.current) > 55)
                  move(value < touchStart.current ? 1 : -1);
                touchStart.current = null;
              }}
            >
              {photoUrl ? (
                <ProtectedImage
                  src={photoUrl}
                  alt={`Entrenamiento de ${item.ownerName}`}
                  priority
                  className="object-contain"
                />
              ) : (
                <div className="grid h-full place-items-center bg-gradient-to-br from-slate-950 to-violet-950">
                  <Flame className="h-20 w-20 text-orange-400" />
                </div>
              )}
              {photos.length > 1 ? (
                <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
                  {photos.map((entry, index) => (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => setPhotoIndex(index)}
                      className={`rounded-full px-4 py-2 text-[10px] font-black backdrop-blur ${photoIndex === index ? "bg-white text-slate-950" : "bg-black/65 text-white"}`}
                    >
                      {entry.type === "START" ? "INICIO" : "FINAL"}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                aria-label="Historia anterior"
                onClick={() => move(-1)}
                className="absolute bottom-16 left-0 top-24 w-1/3"
              >
                <ChevronLeft
                  className="ml-3 rounded-full bg-black/35 p-2"
                  size={38}
                />
              </button>
              <button
                type="button"
                aria-label="Historia siguiente"
                onClick={() => move(1)}
                className="absolute bottom-16 right-0 top-24 w-1/3"
              >
                <ChevronRight
                  className="ml-auto mr-3 rounded-full bg-black/35 p-2"
                  size={38}
                />
              </button>
            </div>
            <div className="shrink-0 border-t border-slate-800 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black tracking-[.15em] text-lime-300">
                    ENTRENAMIENTO COMPLETADO
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    {new Date(item.createdAt).toLocaleDateString(dateLocale, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })}
                  </h3>
                </div>
                <CheckCircle2 className="text-lime-300" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2">
                  <Timer size={14} />
                  {item.durationMinutes ?? 0} minutos
                </span>
                {item.challengeName ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 px-3 py-2 text-orange-200">
                    <Flame size={14} />
                    {item.challengeName}
                  </span>
                ) : null}
                {active.latitude != null && active.longitude != null ? (
                  <a
                    href={`https://www.google.com/maps?q=${active.latitude},${active.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/10 px-3 py-2 text-lime-300"
                  >
                    <MapPin size={14} />
                    Ver ubicación · ±{Math.round(active.accuracy ?? 0)} m{" "}
                    <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
              <p className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
                <LockKeyhole size={13} />
                {item.isOwn
                  ? "Tu historia puede pausarse y volver a abrirse."
                  : "Acceso temporal para participantes del reto. Puedes volver al historial cuando termine."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
