"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck, Dumbbell, Flame, Trophy, UserPlus, Users, X } from "lucide-react";
import type { NotificationDto } from "@/modules/notifications/service";

type ApiResponse = { success: boolean; data?: { notifications: NotificationDto[]; unreadCount: number } };

const iconByType = {
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACCEPTED: Users,
  CHALLENGE_INVITE: Trophy,
  CHALLENGE_STARTED: Flame,
  CHALLENGE_PROGRESS: Flame,
  CHALLENGE_COMPLETED: Trophy,
  ATTENDANCE_COMPLETED: Dumbbell,
  EVIDENCE_REVIEWED: CheckCheck,
  CLUB_SESSION: Users,
  SYSTEM: Bell,
} as const;

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Ahora";
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} d`;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(value));
}

export function NotificationCenter() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<NotificationDto | null>(null);

  const sync = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/notifications", { cache: "no-store" });
      const json = await response.json() as ApiResponse;
      if (json.success && json.data) {
        setItems(json.data.notifications);
        setUnread(json.data.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void sync();
    const events = new EventSource("/api/v1/notifications/stream");
    events.addEventListener("connected", () => setConnected(true));
    events.addEventListener("degraded", () => setConnected(false));
    events.addEventListener("notification", (event) => {
      try {
        const notification = JSON.parse((event as MessageEvent).data) as NotificationDto;
        setItems((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 40));
        setUnread((current) => current + (notification.readAt ? 0 : 1));
        setToast(notification);
        window.setTimeout(() => setToast((current) => current?.id === notification.id ? null : current), 6500);
      } catch {}
    });
    events.onerror = () => setConnected(false);
    const recovery = window.setInterval(() => void sync(), 60_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      events.close();
      window.clearInterval(recovery);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sync]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  async function markRead(notification: NotificationDto) {
    if (!notification.readAt) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt } : item));
      setUnread((current) => Math.max(0, current - 1));
      await fetch("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read", id: notification.id }) });
    }
    setOpen(false);
    if (notification.href) router.push(notification.href);
  }

  async function markAll() {
    if (unread === 0) return;
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    setUnread(0);
    await fetch("/api/v1/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read_all" }) });
  }

  const panel = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/72 backdrop-blur-md sm:items-start sm:justify-end sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Centro de notificaciones"
            className="flex h-[min(86dvh,720px)] w-full flex-col overflow-hidden rounded-t-[2rem] border border-slate-700/80 bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,.12),transparent_30%),#080f1d] shadow-2xl shadow-black/70 sm:w-[27rem] sm:rounded-[2rem]"
          >
            <header className="shrink-0 border-b border-white/[.07] bg-slate-950/35 p-5 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-lime-400">
                    En tiempo real
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Notificaciones
                  </h2>
                  <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <span
                      className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-amber-400"}`}
                    />
                    {connected
                      ? "Conectado en vivo"
                      : "Sincronización automática"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar notificaciones"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/60 text-slate-300 transition hover:border-lime-300/40 hover:text-white"
                >
                  <X size={19} />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[.06] bg-black/20 px-4 py-3">
                <span className="text-xs font-bold text-slate-400">
                  {unread
                    ? `${unread} ${unread === 1 ? "nueva" : "nuevas"}`
                    : "Estás al día"}
                </span>
                <button
                  type="button"
                  onClick={() => void markAll()}
                  disabled={!unread}
                  className="inline-flex items-center gap-2 text-xs font-black text-lime-300 transition disabled:text-slate-600"
                >
                  <CheckCheck size={15} />
                  Marcar todo leído
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-color:#334155_transparent]">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((key) => (
                    <div
                      key={key}
                      className="h-24 animate-pulse rounded-2xl bg-slate-800/70"
                    />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="grid min-h-full place-items-center px-8 py-14 text-center">
                  <div>
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-lime-300/15 bg-lime-300/[.07] text-lime-300">
                      <Bell size={28} />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">
                      Todo tranquilo por aquí
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      Las invitaciones, entrenamientos y logros de tu equipo
                      aparecerán aquí.
                    </p>
                  </div>
                </div>
              ) : (
                items.map((notification) => {
                  const Icon = iconByType[notification.type] ?? Bell;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markRead(notification)}
                      className={`group mb-2 flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${notification.readAt ? "border-white/[.04] bg-slate-950/35 hover:border-slate-600" : "border-lime-400/20 bg-lime-400/[.07] hover:bg-lime-400/[.11]"}`}
                    >
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${notification.readAt ? "bg-slate-800 text-slate-400" : "bg-lime-400 text-slate-950 shadow-[0_0_20px_rgba(163,230,53,.18)]"}`}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <strong className="line-clamp-1 text-sm font-black text-white">
                            {notification.title}
                          </strong>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {relativeTime(notification.createdAt)}
                          </span>
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-400">
                          {notification.body}
                        </span>
                      </span>
                      {!notification.readAt && (
                        <span className="mt-5 h-2 w-2 shrink-0 rounded-full bg-lime-400 shadow-[0_0_9px_#a3e635]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <footer className="shrink-0 border-t border-white/[.06] bg-slate-950/55 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-center text-[10px] text-slate-500">
              Desliza únicamente esta lista para revisar tu actividad.
            </footer>
          </section>
        </div>,
        document.body,
      )
    : null;

  const toastPortal = toast
    ? createPortal(
        <div className="fixed inset-x-3 top-[max(.75rem,env(safe-area-inset-top))] z-[140] mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-lime-400/30 bg-[#0a1322]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:w-96">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime-400 text-slate-950">
            <BellRing size={20} />
          </span>
          <button
            type="button"
            onClick={() => void markRead(toast)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-[10px] font-black uppercase tracking-[.17em] text-lime-400">
              Nueva actividad
            </span>
            <strong className="mt-0.5 block truncate text-sm text-white">
              {toast.title}
            </strong>
            <span className="mt-1 line-clamp-2 block text-xs text-slate-400">
              {toast.body}
            </span>
          </button>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>,
        document.body,
      )
    : null;

  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`} className="group relative grid h-10 w-10 place-items-center rounded-xl border border-slate-700 bg-slate-950/60 text-slate-300 transition hover:border-lime-400/60 hover:bg-lime-400/10 hover:text-lime-300">
      {unread ? <BellRing size={19} className="transition group-hover:rotate-12"/> : <Bell size={19}/>} 
      {unread > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-slate-950 bg-lime-400 px-1 text-[10px] font-black leading-none text-slate-950 shadow-[0_0_18px_rgba(163,230,53,.55)]">{unread > 99 ? "99+" : unread}</span>}
    </button>

    {panel}
    {toastPortal}
  </div>;
}
