"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    const outside = (event: MouseEvent) => {
      if (open && panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
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

  return <div ref={panelRef} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`} className="group relative grid h-10 w-10 place-items-center rounded-xl border border-slate-700 bg-slate-950/60 text-slate-300 transition hover:border-lime-400/60 hover:bg-lime-400/10 hover:text-lime-300">
      {unread ? <BellRing size={19} className="transition group-hover:rotate-12"/> : <Bell size={19}/>} 
      {unread > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-slate-950 bg-lime-400 px-1 text-[10px] font-black leading-none text-slate-950 shadow-[0_0_18px_rgba(163,230,53,.55)]">{unread > 99 ? "99+" : unread}</span>}
    </button>

    {open && <div className="fixed inset-x-3 bottom-20 z-50 max-h-[72vh] overflow-hidden rounded-[1.75rem] border border-slate-700/80 bg-[#080f1d]/95 shadow-2xl shadow-black/60 backdrop-blur-xl sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:h-[34rem] sm:max-h-[75vh] sm:w-[25rem]">
      <div className="border-b border-slate-800 bg-gradient-to-br from-lime-400/10 via-transparent to-cyan-400/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[11px] font-black uppercase tracking-[.18em] text-lime-400">En tiempo real</p><h2 className="mt-1 text-xl font-black text-white">Tu actividad</h2><p className="mt-1 flex items-center gap-2 text-xs text-slate-400"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-amber-400"}`}/>{connected ? "Conectado en vivo" : "Sincronización automática"}</p></div>
          <div className="flex items-center gap-1"><button type="button" onClick={() => void markAll()} disabled={!unread} className="rounded-lg px-2.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-lime-300 disabled:opacity-40">Leer todo</button><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"><X size={18}/></button></div>
        </div>
      </div>
      <div className="h-[calc(100%-7.3rem)] overflow-y-auto p-2">
        {loading ? <div className="space-y-2 p-2">{[1,2,3].map((key)=><div key={key} className="h-20 animate-pulse rounded-2xl bg-slate-800/70"/>)}</div> : items.length === 0 ? <div className="grid h-72 place-items-center px-8 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-lime-400"><Bell size={28}/></div><h3 className="mt-4 font-black text-white">Todo tranquilo por aquí</h3><p className="mt-2 text-sm text-slate-400">Las invitaciones, avances de tus amigos y logros aparecerán aquí.</p></div></div> : items.map((notification) => {
          const Icon = iconByType[notification.type] ?? Bell;
          return <button key={notification.id} type="button" onClick={() => void markRead(notification)} className={`group mb-1 flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${notification.readAt ? "border-transparent hover:border-slate-700 hover:bg-slate-900/70" : "border-lime-400/20 bg-lime-400/[.06] hover:bg-lime-400/[.1]"}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${notification.readAt ? "bg-slate-800 text-slate-400" : "bg-lime-400 text-slate-950 shadow-[0_0_20px_rgba(163,230,53,.18)]"}`}><Icon size={20}/></span>
            <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className="line-clamp-1 text-sm font-black text-white">{notification.title}</strong><span className="shrink-0 text-[11px] text-slate-500">{relativeTime(notification.createdAt)}</span></span><span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-400">{notification.body}</span></span>
            {!notification.readAt && <span className="mt-5 h-2 w-2 shrink-0 rounded-full bg-lime-400 shadow-[0_0_9px_#a3e635]"/>}
          </button>;
        })}
      </div>
    </div>}

    {toast && <div className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-lime-400/30 bg-[#0a1322]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:top-5 sm:w-96">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime-400 text-slate-950"><BellRing size={20}/></span><button type="button" onClick={() => void markRead(toast)} className="min-w-0 flex-1 text-left"><span className="block text-[10px] font-black uppercase tracking-[.17em] text-lime-400">Nueva actividad</span><strong className="mt-0.5 block truncate text-sm text-white">{toast.title}</strong><span className="mt-1 line-clamp-2 block text-xs text-slate-400">{toast.body}</span></button><button type="button" aria-label="Cerrar" onClick={() => setToast(null)} className="text-slate-500 hover:text-white"><X size={16}/></button>
    </div>}
  </div>;
}
