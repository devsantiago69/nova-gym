"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  Flame,
  ImageIcon,
  ImagePlus,
  MapPin,
  Navigation,
  PartyPopper,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { AttendanceDetailStory, type AttendanceStoryData } from "@/components/attendance/attendance-detail-story";
import { ProtectedImage } from "@/components/media/protected-image";
import {
  type BrowserLocation,
  locationErrorMessage,
  recentBrowserLocation,
  requestBrowserLocation,
} from "@/lib/browser-location";

type Attendance = AttendanceStoryData;

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function locationQuality(accuracy: number) {
  if (accuracy <= 30) return "Precisión excelente";
  if (accuracy <= 100) return "Buena precisión";
  return "Ubicación aproximada";
}

function statusLabel(status: string) {
  if (status === "COMPLETED") return "Completado";
  if (status === "IN_PROGRESS") return "En curso";
  if (status === "CANCELLED") return "Cancelado";
  return status;
}

export function AttendanceManager({ initial, todayKey, locale, storyDurationSeconds }: { initial: Attendance[]; todayKey: string; locale: "es" | "en"; storyDurationSeconds: number }) {
  const dateLocale = locale === "en" ? "en-US" : "es-CO";
  const weekDays = locale === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["L", "M", "M", "J", "V", "S", "D"];
  const [rows] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [fileName, setFileName] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<BrowserLocation>();
  const [locationPermission, setLocationPermission] = useState<PermissionState | "unsupported">("prompt");
  const [locationTesting, setLocationTesting] = useState(false);
  const [locationDiagnostic, setLocationDiagnostic] = useState("");
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance>();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const todayAttendance = rows.find((row) => row.localDate.slice(0, 10) === todayKey);
  const active = todayAttendance?.status === "IN_PROGRESS" ? todayAttendance : undefined;
  const todayCompleted = todayAttendance?.status === "COMPLETED" ? todayAttendance : undefined;
  const completed = rows.filter((row) => row.status === "COMPLETED");
  const points = rows.flatMap((row) => row.pointMovements).reduce((total, point) => total + point.amount, 0);

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const row of rows) map.set(row.localDate.slice(0, 10), row);
    return map;
  }, [rows]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  }, [calendarMonth]);

  const monthAttendanceCount = calendarCells.reduce<number>((total, day) => {
    if (!day) return total;
    const row = attendanceByDate.get(dateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
    return total + (row?.status === "COMPLETED" ? 1 : 0);
  }, 0);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    queueMicrotask(() => setCurrentLocation(recentBrowserLocation(10 * 60_000)));
    const receive = (event: Event) => setCurrentLocation((event as CustomEvent<BrowserLocation>).detail);
    window.addEventListener("nova-gym:location", receive);
    if ("permissions" in navigator) {
      void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
        setLocationPermission(permission.state);
        permission.addEventListener("change", () => setLocationPermission(permission.state));
      }).catch(() => setLocationPermission("prompt"));
    } else queueMicrotask(() => setLocationPermission("unsupported"));
    return () => window.removeEventListener("nova-gym:location", receive);
  }, []);

  async function testLocation() {
    setLocationTesting(true);
    setLocationDiagnostic("");
    try {
      const value = await requestBrowserLocation(true);
      setCurrentLocation(value);
      setLocationDiagnostic("Tu ubicación está lista para registrar la asistencia.");
    } catch (error) {
      setCurrentLocation(undefined);
      setLocationDiagnostic(locationErrorMessage(error));
    } finally {
      setLocationTesting(false);
    }
  }

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : undefined);
    setFileName(file?.name ?? "");
    setMessage("");
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(undefined);
    setFileName("");
    setInputKey((key) => key + 1);
  }

  async function send(event: React.FormEvent<HTMLFormElement>, url: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("Preparando tu registro…");
    let stage: "location" | "upload" = "location";
    const uploadController = new AbortController();
    const uploadTimeout = window.setTimeout(() => uploadController.abort(), 120_000);
    try {
      let position = currentLocation;
      if (!position || Date.now() - position.capturedAt > 10 * 60_000) {
        setMessage("Actualizando tu ubicación…");
        position = await requestBrowserLocation(true);
        setCurrentLocation(position);
      }
      const data = new FormData(form);
      data.set("latitude", String(position.latitude));
      data.set("longitude", String(position.longitude));
      data.set("accuracy", String(position.accuracy));
      stage = "upload";
      setMessage("Subiendo tu evidencia de forma segura…");
      const response = await fetch(url, { method: "POST", body: data, signal: uploadController.signal });
      const result = await response.json() as { message: string; errors?: Array<{ message: string }> };
      setMessage(response.ok ? result.message : (result.errors?.[0]?.message ?? result.message));
      if (response.ok) { location.reload(); return; }
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "La subida tardó demasiado. Tu registro sigue seguro; inténtalo nuevamente con una conexión estable." : stage === "location" ? locationErrorMessage(error) : "No pudimos guardar la asistencia. Revisa tu conexión e intenta nuevamente.");
    } finally {
      window.clearTimeout(uploadTimeout);
      setBusy(false);
    }
  }

  return <div className="space-y-7">
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <article className="card p-4 sm:p-5"><Trophy className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6"/><p className="mt-3 text-2xl font-black sm:text-3xl">{points}</p><p className="text-xs muted sm:text-sm">Puntos ganados</p></article>
      <article className="card p-4 sm:p-5"><CheckCircle2 className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6"/><p className="mt-3 text-2xl font-black sm:text-3xl">{completed.length}</p><p className="text-xs muted sm:text-sm">Entrenamientos</p></article>
      <article className={`card p-4 sm:p-5 ${todayCompleted ? "border-lime-400/30 bg-lime-400/[.04]" : ""}`}><Clock3 className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6"/><p className="mt-3 text-xl font-black sm:text-3xl">{todayCompleted ? "Cumplido" : active ? "Activo" : "Listo"}</p><p className="text-xs muted sm:text-sm">Estado de hoy</p></article>
    </div>

    {todayCompleted ? <section className="relative isolate overflow-hidden rounded-[32px] border border-lime-400/25 bg-gradient-to-br from-slate-900 via-emerald-950/70 to-slate-950 shadow-[0_28px_90px_rgba(34,197,94,.12)]">
      <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-lime-400/15 blur-3xl"/>
      <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl"/>
      <div className="grid lg:grid-cols-[1.08fr_.92fr]">
        <div className="p-6 sm:p-9 lg:p-11">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[11px] font-black tracking-[.12em] text-lime-300"><CheckCircle2 size={15}/>MISIÓN DE HOY COMPLETADA</span>
          <div className="mt-6 flex items-start gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-300 to-emerald-400 text-slate-950 shadow-[0_0_32px_rgba(163,230,53,.22)]"><PartyPopper size={28}/></div><div><p className="text-sm font-bold text-lime-300">¡Felicidades!</p><h2 className="mt-1 text-3xl font-black leading-tight sm:text-5xl">Hoy ya ganaste.</h2></div></div>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">Tu entrenamiento quedó registrado y tu racha sigue encendida. La constancia se construye un día a la vez; hoy ya hiciste lo importante.</p>
          <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/20 p-3 sm:p-4"><strong className="block text-xl text-lime-300 sm:text-2xl">{todayCompleted.durationMinutes ?? 0}</strong><span className="text-[10px] text-slate-400 sm:text-xs">minutos</span></div>
            <div className="rounded-2xl border border-white/5 bg-black/20 p-3 sm:p-4"><strong className="block text-xl text-lime-300 sm:text-2xl">+{todayCompleted.pointMovements.reduce((sum, point) => sum + point.amount, 0)}</strong><span className="text-[10px] text-slate-400 sm:text-xs">punto de hoy</span></div>
            <div className="rounded-2xl border border-white/5 bg-black/20 p-3 sm:p-4"><strong className="block truncate text-base text-lime-300 sm:text-xl">{todayCompleted.finishedAt ? new Date(todayCompleted.finishedAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" }) : "Listo"}</strong><span className="text-[10px] text-slate-400 sm:text-xs">finalizado</span></div>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => setSelectedAttendance(todayCompleted)} className="btn inline-flex items-center justify-center gap-2 px-5 py-3.5"><Eye size={18}/>Revive tu entrenamiento</button><Link href="/retos" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-5 py-3.5 font-black text-white transition hover:border-orange-400"><Flame size={18} className="text-orange-400"/>Ver progreso en retos</Link></div>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-slate-400"><ShieldCheck size={15} className="text-lime-300"/>Tu día está protegido: Nova Gym acepta máximo un entrenamiento diario.</p>
        </div>
        <div className="relative min-h-[280px] border-t border-slate-800 bg-slate-950/70 lg:min-h-full lg:border-l lg:border-t-0">
          {todayCompleted.photos[0] ? <><ProtectedImage src={`/api/v1/attendance-photos/${todayCompleted.photos[0].id}`} alt="Tu logro de hoy" className="object-cover opacity-75"/><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-6"><span className="inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-black text-lime-200 backdrop-blur"><Flame size={15} className="fill-orange-400/20 text-orange-400"/>RACHA ENCENDIDA</span><p className="mt-3 text-xl font-black">Vuelve mañana por el siguiente día.</p></div></> : <div className="grid h-full min-h-[280px] place-content-center px-8 text-center"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-lime-300/20 bg-lime-300/10"><Trophy className="h-12 w-12 text-lime-300"/></div><p className="mt-5 text-2xl font-black">Día conquistado</p></div>}
        </div>
      </div>
    </section> : todayAttendance && !active ? <section className="card border-orange-400/20 bg-gradient-to-br from-slate-900 to-orange-950/20 p-7 text-center sm:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-400/10"><Clock3 className="h-8 w-8 text-orange-300"/></div><h2 className="mt-5 text-3xl font-black">El registro de hoy está cerrado</h2><p className="mx-auto mt-2 max-w-xl muted">Nova Gym protege la regla de un solo entrenamiento diario. Mañana podrás comenzar un nuevo día de tu recorrido.</p><Link href="/retos" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-orange-400/30 px-5 py-3 font-black text-orange-200"><Flame size={18}/>Ver mis retos</Link></section> : <form onSubmit={(event) => send(event, active ? `/api/v1/attendances/${active.id}/finish` : "/api/v1/attendances")} className="card overflow-hidden">
      <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)]">
        <div className="space-y-5 p-5 sm:p-7 lg:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-lime-400/15 px-3 py-1 text-xs font-bold text-lime-300"><Sparkles size={14}/>{active ? "ENTRENAMIENTO ACTIVO" : "NUEVA ASISTENCIA"}</span>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">{active ? "Completa tu entrenamiento" : "Registra tu entrenamiento"}</h2>
            <p className="mt-2 muted">{active ? "Añade la fotografía final después de mínimo 15 minutos." : "Una foto, tu ubicación y listo. Tu evidencia siempre será privada."}</p>
          </div>

          <div className={`rounded-2xl border p-5 ${currentLocation ? "border-lime-500/40 bg-gradient-to-br from-lime-400/10 to-emerald-500/5" : "border-amber-500/30 bg-amber-400/5"}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${currentLocation ? "bg-lime-400 text-slate-950" : "bg-amber-400/15 text-amber-300"}`}>
                  {currentLocation ? <Navigation size={23}/> : <MapPin size={23}/>}
                </div>
                <div>
                  <strong className="text-lg">{currentLocation ? "Ubicación protegida y lista" : "Activa tu ubicación"}</strong>
                  <p className="mt-1 text-sm muted">{currentLocation ? `${locationQuality(currentLocation.accuracy)} · actualizada hace unos momentos` : locationPermission === "denied" ? "Permite la ubicación desde la barra del navegador." : "La necesitamos solo al iniciar y finalizar."}</p>
                </div>
              </div>
              <button type="button" onClick={testLocation} disabled={locationTesting} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-bold transition hover:border-lime-500 sm:w-auto">
                <RefreshCw size={16} className={locationTesting ? "animate-spin" : ""}/>{locationTesting ? "Actualizando…" : currentLocation ? "Actualizar" : "Activar"}
              </button>
            </div>
            {currentLocation && <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-lime-500/20 pt-4 text-sm">
              <span className="inline-flex items-center gap-2 text-lime-300"><Check size={17}/><strong>Punto confirmado</strong></span>
              <span className="muted">Precisión aproximada de {Math.round(currentLocation.accuracy)} m</span>
              <a className="inline-flex items-center gap-1 font-bold text-lime-400 hover:underline" href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`} target="_blank" rel="noreferrer">Ver en el mapa <ExternalLink size={14}/></a>
            </div>}
            {locationDiagnostic && <p className={`mt-4 rounded-xl p-3 text-sm ${currentLocation ? "bg-lime-400/10 text-lime-300" : "bg-red-500/10 text-red-300"}`}>{locationDiagnostic}</p>}
          </div>

          <div className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><ShieldCheck className="shrink-0 text-lime-400"/><div><strong>Evidencia privada</strong><p className="mt-1 text-sm muted">La foto y el punto de ubicación solo se usan para validar tu registro.</p></div></div>

          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-lime-500/60 p-5 font-bold transition hover:bg-lime-400/5"><Camera className="text-lime-400"/><span>{preview ? "Cambiar fotografía" : "Abrir cámara o galería"}</span><input key={inputKey} name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" required className="sr-only" onChange={choosePhoto}/></label>
          <button className="btn w-full py-4 text-base" disabled={busy || !preview}>{busy ? "Procesando…" : active ? "Finalizar y ganar 1 punto" : "Confirmar e iniciar entrenamiento"}</button>
          {message && <p role="status" className="rounded-xl bg-slate-950 p-4 text-sm text-lime-300">{message}</p>}
        </div>

        <div className="relative min-h-[300px] border-t border-slate-800 bg-[#020617] xl:min-h-full xl:border-l xl:border-t-0">
          {preview ? <><Image src={preview} alt="Vista previa de la evidencia" fill unoptimized className="object-contain"/><button type="button" onClick={clearPhoto} aria-label="Quitar fotografía" className="absolute right-4 top-4 z-10 rounded-full bg-slate-950/85 p-3"><X/></button><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-5 pt-12 text-sm"><strong>Fotografía lista</strong><p className="truncate muted">{fileName}</p></div></> : <div className="grid h-full min-h-[300px] place-content-center px-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-slate-900"><ImagePlus className="h-10 w-10 text-slate-600"/></div><p className="mt-5 text-lg font-bold">Tu fotografía aparecerá aquí</p><p className="mt-1 max-w-xs text-sm muted">Podrás revisarla antes de confirmar el entrenamiento.</p></div>}
        </div>
      </div>
    </form>}

    <div className="grid items-start gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold text-lime-400">MI CALENDARIO</p><h2 className="mt-1 text-2xl font-black capitalize">{calendarMonth.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}</h2></div>
          <div className="flex gap-2"><button type="button" aria-label="Mes anterior" onClick={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} className="rounded-xl border border-slate-700 p-2 hover:border-lime-500"><ChevronLeft/></button><button type="button" aria-label="Mes siguiente" onClick={() => setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} className="rounded-xl border border-slate-700 p-2 hover:border-lime-500"><ChevronRight/></button></div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1 text-center">{weekDays.map((day, index) => <span key={`${day}-${index}`} className="pb-2 text-xs font-bold text-slate-500">{day}</span>)}{calendarCells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} className="aspect-square"/>;
          const key = dateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
          const attendance = attendanceByDate.get(key);
          const isToday = key === dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
          return <div key={key} title={attendance ? statusLabel(attendance.status) : "Sin entrenamiento"} className={`relative grid aspect-square place-items-center rounded-xl text-sm font-bold ${attendance?.status === "COMPLETED" ? "bg-lime-400 text-slate-950 shadow-[0_0_20px_rgba(163,230,53,.18)]" : attendance?.status === "IN_PROGRESS" ? "bg-orange-400 text-slate-950" : isToday ? "border border-lime-500/60 text-lime-300" : "text-slate-400 hover:bg-slate-800/60"}`}>{day}{attendance && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-60"/>}</div>;
        })}</div>
        <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 p-4"><span className="inline-flex items-center gap-2 text-sm muted"><CalendarDays size={18} className="text-lime-400"/>Entrenamientos este mes</span><strong className="text-xl text-lime-400">{monthAttendanceCount}</strong></div>
      </section>

      <section>
        <div className="mb-4"><p className="text-xs font-bold text-lime-400">TU RECORRIDO</p><h2 className="mt-1 text-2xl font-black">Historial de entrenamientos</h2></div>
        <div className="space-y-3">{rows.length === 0 ? <div className="card p-8 text-center"><CalendarDays className="mx-auto h-10 w-10 text-slate-600"/><p className="mt-4 font-bold">Tu recorrido comienza hoy</p><p className="mt-1 text-sm muted">Cuando completes un entrenamiento aparecerá aquí y en tu calendario.</p></div> : rows.map((row) => {
          const date = new Date(row.localDate);
          return <article key={row.id} className="card grid gap-4 p-4 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:p-5">
            <div className="flex items-center gap-3 sm:block sm:text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-400/10 sm:mx-auto"><span className="text-2xl font-black text-lime-400">{date.getUTCDate()}</span></div><span className="text-sm font-bold uppercase text-slate-400 sm:mt-1 sm:block">{date.toLocaleDateString(dateLocale, { timeZone: "UTC", month: "short" }).replace(".", "")}</span></div>
            <div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg capitalize">{date.toLocaleDateString(dateLocale, { timeZone: "UTC", weekday: "long" })}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "COMPLETED" ? "bg-lime-400/10 text-lime-300" : "bg-orange-400/10 text-orange-300"}`}>{statusLabel(row.status)}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm muted"><span className="inline-flex items-center gap-1.5"><Clock3 size={15}/>{new Date(row.startedAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}{row.finishedAt ? ` – ${new Date(row.finishedAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}` : ""}</span>{row.durationMinutes !== null && <span className="inline-flex items-center gap-1.5"><Timer size={15}/>{row.durationMinutes} minutos</span>}</div></div>
            <div className="flex flex-wrap gap-2 sm:justify-end"><span className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs text-slate-400"><ImageIcon size={15}/>{row.photos.length} {row.photos.length === 1 ? "foto" : "fotos"}</span><button type="button" onClick={() => setSelectedAttendance(row)} className="inline-flex items-center gap-2 rounded-xl border border-lime-400/40 bg-lime-400/[.06] px-3 py-2 text-sm font-black text-lime-300 transition hover:bg-lime-400 hover:text-slate-950"><Eye size={16}/>Ver detalles</button></div>
          </article>;
        })}</div>
      </section>
    </div>
    {selectedAttendance && (
      <AttendanceDetailStory attendance={selectedAttendance} locale={locale} storyDurationSeconds={storyDurationSeconds} onClose={() => setSelectedAttendance(undefined)}/>
    )}
  </div>;
}
