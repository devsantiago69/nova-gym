"use client";

import Image from "next/image";
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
  ImageIcon,
  ImagePlus,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import {
  type BrowserLocation,
  locationErrorMessage,
  recentBrowserLocation,
  requestBrowserLocation,
} from "@/lib/browser-location";

type Attendance = {
  id: string;
  localDate: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMinutes: number | null;
  photos: Array<{ id: string; type: string }>;
  pointMovements: Array<{ amount: number }>;
};

const weekDays = ["L", "M", "M", "J", "V", "S", "D"];
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

export function AttendanceManager({ initial }: { initial: Attendance[] }) {
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
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const active = rows.find((row) => row.status === "IN_PROGRESS");
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
    setBusy(true);
    setMessage("Preparando tu registro…");
    let position = currentLocation;
    if (!position || Date.now() - position.capturedAt > 10 * 60_000) {
      try {
        position = await requestBrowserLocation(true);
        setCurrentLocation(position);
      } catch (error) {
        setBusy(false);
        setMessage(locationErrorMessage(error));
        return;
      }
    }
    const data = new FormData(event.currentTarget);
    data.set("latitude", String(position.latitude));
    data.set("longitude", String(position.longitude));
    data.set("accuracy", String(position.accuracy));
    setMessage("Guardando tu entrenamiento de forma segura…");
    try {
      const response = await fetch(url, { method: "POST", body: data });
      const result = await response.json() as { message: string; errors?: Array<{ message: string }> };
      setBusy(false);
      setMessage(response.ok ? result.message : (result.errors?.[0]?.message ?? result.message));
      if (response.ok) location.reload();
    } catch {
      setBusy(false);
      setMessage("No pudimos guardar la asistencia. Revisa tu conexión e intenta nuevamente.");
    }
  }

  return <div className="space-y-7">
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <article className="card p-4 sm:p-5"><Trophy className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6"/><p className="mt-3 text-2xl font-black sm:text-3xl">{points}</p><p className="text-xs muted sm:text-sm">Puntos ganados</p></article>
      <article className="card p-4 sm:p-5"><CheckCircle2 className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6"/><p className="mt-3 text-2xl font-black sm:text-3xl">{completed.length}</p><p className="text-xs muted sm:text-sm">Entrenamientos</p></article>
      <article className="card p-4 sm:p-5"><Clock3 className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6"/><p className="mt-3 text-xl font-black sm:text-3xl">{active ? "Activo" : "Listo"}</p><p className="text-xs muted sm:text-sm">Estado de hoy</p></article>
    </div>

    <form onSubmit={(event) => send(event, active ? `/api/v1/attendances/${active.id}/finish` : "/api/v1/attendances")} className="card overflow-hidden">
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
    </form>

    <div className="grid items-start gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold text-lime-400">MI CALENDARIO</p><h2 className="mt-1 text-2xl font-black capitalize">{calendarMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}</h2></div>
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
            <div className="flex items-center gap-3 sm:block sm:text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-400/10 sm:mx-auto"><span className="text-2xl font-black text-lime-400">{date.getUTCDate()}</span></div><span className="text-sm font-bold uppercase text-slate-400 sm:mt-1 sm:block">{date.toLocaleDateString("es-CO", { timeZone: "UTC", month: "short" }).replace(".", "")}</span></div>
            <div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg capitalize">{date.toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long" })}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "COMPLETED" ? "bg-lime-400/10 text-lime-300" : "bg-orange-400/10 text-orange-300"}`}>{statusLabel(row.status)}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm muted"><span className="inline-flex items-center gap-1.5"><Clock3 size={15}/>{new Date(row.startedAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}{row.finishedAt ? ` – ${new Date(row.finishedAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })}` : ""}</span>{row.durationMinutes !== null && <span className="inline-flex items-center gap-1.5"><Timer size={15}/>{row.durationMinutes} minutos</span>}</div></div>
            <div className="flex flex-wrap gap-2 sm:justify-end">{row.photos.map((photo) => <a className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold transition hover:border-lime-500 hover:text-lime-300" key={photo.id} href={`/api/v1/attendance-photos/${photo.id}`} target="_blank" rel="noreferrer"><ImageIcon size={16}/>{photo.type === "START" ? "Inicio" : "Final"}</a>)}</div>
          </article>;
        })}</div>
      </section>
    </div>
  </div>;
}
