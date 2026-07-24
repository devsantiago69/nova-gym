"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  ExternalLink,
  Eye,
  Flame,
  FolderOpen,
  ImageIcon,
  ImagePlus,
  MapPin,
  Moon,
  Navigation,
  PartyPopper,
  RefreshCw,
  ShieldCheck,
  Timer,
  Trophy,
  Undo2,
  X,
} from "lucide-react";
import {
  AttendanceDetailStory,
  type AttendanceStoryData,
} from "@/components/attendance/attendance-detail-story";
import { ProtectedImage } from "@/components/media/protected-image";
import {
  type BrowserLocation,
  locationErrorMessage,
  recentBrowserLocation,
  requestBrowserLocation,
} from "@/lib/browser-location";

type Attendance = AttendanceStoryData;

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;
const APP_TRACKING_START_DATE = "2026-07-13";

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

export function AttendanceManager({
  initial,
  todayKey,
  locale,
  storyDurationSeconds,
  locationEnabled,
  canChooseFromDevice,
  planName,
  initialRestDays,
  restDaysRemaining,
  hasActiveChallenges,
}: {
  initial: Attendance[];
  todayKey: string;
  locale: "es" | "en";
  storyDurationSeconds: number;
  locationEnabled: boolean;
  canChooseFromDevice: boolean;
  planName: string;
  initialRestDays: string[];
  restDaysRemaining: number;
  hasActiveChallenges: boolean;
}) {
  const dateLocale = locale === "en" ? "en-US" : "es-CO";
  const weekDays =
    locale === "en"
      ? ["M", "T", "W", "T", "F", "S", "S"]
      : ["L", "M", "M", "J", "V", "S", "D"];
  const [rows] = useState(initial);
  const [message, setMessage] = useState("");
  const [restBusy, setRestBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [selectedFile, setSelectedFile] = useState<File>();
  const [photoSource, setPhotoSource] = useState<"camera" | "gallery">();
  const [fileName, setFileName] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<BrowserLocation>();
  const [locationPermission, setLocationPermission] = useState<
    PermissionState | "unsupported"
  >("prompt");
  const [locationTesting, setLocationTesting] = useState(false);
  const [locationDiagnostic, setLocationDiagnostic] = useState("");
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance>();
  const historyCarouselRef = useRef<HTMLDivElement>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const todayAttendance = rows.find(
    (row) => row.localDate.slice(0, 10) === todayKey,
  );
  const active =
    todayAttendance?.status === "IN_PROGRESS" ? todayAttendance : undefined;
  const todayCompleted =
    todayAttendance?.status === "COMPLETED" ? todayAttendance : undefined;
  const completed = rows.filter((row) => row.status === "COMPLETED");
  const restDaySet = useMemo(() => new Set(initialRestDays), [initialRestDays]);
  const todayRest = restDaySet.has(todayKey);
  const points = rows
    .flatMap((row) => row.pointMovements)
    .reduce((total, point) => total + point.amount, 0);

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
    return [
      ...Array<null>(offset).fill(null),
      ...Array.from({ length: days }, (_, index) => index + 1),
    ];
  }, [calendarMonth]);

  const monthAttendanceCount = calendarCells.reduce<number>((total, day) => {
    if (!day) return total;
    const row = attendanceByDate.get(
      dateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day),
    );
    return total + (row?.status === "COMPLETED" ? 1 : 0);
  }, 0);
  const monthRestCount = calendarCells.reduce<number>((total, day) => {
    if (!day) return total;
    const key = dateKey(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    return total + (restDaySet.has(key) ? 1 : 0);
  }, 0);
  const monthMissedCount = calendarCells.reduce<number>((total, day) => {
    if (!day) return total;
    const key = dateKey(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    return total +
      (key >= APP_TRACKING_START_DATE &&
      key < todayKey &&
      !attendanceByDate.has(key) &&
      !restDaySet.has(key)
        ? 1
        : 0);
  }, 0);
  const historyMonthKey = `${calendarMonth.getFullYear()}-${pad(calendarMonth.getMonth() + 1)}`;
  const historyRows = useMemo(
    () => rows.filter((row) => row.localDate.slice(0, 7) === historyMonthKey),
    [historyMonthKey, rows],
  );
  const historyMonths = useMemo(() => {
    const keys = new Set(rows.map((row) => row.localDate.slice(0, 7)));
    keys.add(historyMonthKey);
    return [...keys]
      .sort((left, right) => right.localeCompare(left))
      .map((key) => ({
        key,
        label: new Date(`${key}-01T00:00:00.000Z`).toLocaleDateString(
          dateLocale,
          { timeZone: "UTC", month: "long", year: "numeric" },
        ),
      }));
  }, [dateLocale, historyMonthKey, rows]);

  function selectHistoryMonth(value: string) {
    const [yearValue = "", monthValue = ""] = value.split("-");
    const year = Number(yearValue);
    const month = Number(monthValue);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return;
    setCalendarMonth(new Date(year, month - 1, 1));
    historyCarouselRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  function scrollHistory(direction: -1 | 1) {
    historyCarouselRef.current?.scrollBy({
      left: direction * Math.min(window.innerWidth * 0.82, 360),
      behavior: "smooth",
    });
  }

  async function toggleRest(enable: boolean) {
    setRestBusy(true);
    setMessage(enable ? "Activando tu recuperación…" : "Cancelando descanso…");
    try {
      const response = await fetch("/api/v1/rest-days", {
        method: enable ? "POST" : "DELETE",
      });
      const result = (await response.json()) as {
        message: string;
        errors?: Array<{ message: string }>;
      };
      setMessage(
        response.ok
          ? result.message
          : (result.errors?.[0]?.message ?? result.message),
      );
      if (response.ok) location.reload();
    } catch {
      setMessage("No pudimos actualizar tu descanso. Intenta nuevamente.");
    } finally {
      setRestBusy(false);
    }
  }

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  useEffect(() => {
    if (!locationEnabled) {
      queueMicrotask(() => {
        setCurrentLocation(undefined);
        setLocationDiagnostic("");
      });
      return;
    }
    queueMicrotask(() =>
      setCurrentLocation(recentBrowserLocation(10 * 60_000)),
    );
    const receive = (event: Event) =>
      setCurrentLocation((event as CustomEvent<BrowserLocation>).detail);
    window.addEventListener("nova-gym:location", receive);
    if ("permissions" in navigator) {
      void navigator.permissions
        .query({ name: "geolocation" })
        .then((permission) => {
          setLocationPermission(permission.state);
          permission.addEventListener("change", () =>
            setLocationPermission(permission.state),
          );
        })
        .catch(() => setLocationPermission("prompt"));
    } else queueMicrotask(() => setLocationPermission("unsupported"));
    return () => window.removeEventListener("nova-gym:location", receive);
  }, [locationEnabled]);

  async function testLocation() {
    setLocationTesting(true);
    setLocationDiagnostic("");
    try {
      const value = await requestBrowserLocation(true);
      setCurrentLocation(value);
      setLocationDiagnostic(
        "Tu ubicación está lista para registrar la asistencia.",
      );
    } catch (error) {
      setCurrentLocation(undefined);
      setLocationDiagnostic(locationErrorMessage(error));
    } finally {
      setLocationTesting(false);
    }
  }

  function choosePhoto(
    event: React.ChangeEvent<HTMLInputElement>,
    source: "camera" | "gallery",
  ) {
    if (source === "gallery" && !canChooseFromDevice) {
      setMessage("Elegir archivos está disponible al mejorar tu plan.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : undefined);
    setSelectedFile(file);
    setPhotoSource(file ? source : undefined);
    setFileName(file?.name ?? "");
    setMessage("");
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(undefined);
    setSelectedFile(undefined);
    setPhotoSource(undefined);
    setFileName("");
    setInputKey((key) => key + 1);
  }

  async function send(event: React.FormEvent<HTMLFormElement>, url: string) {
    event.preventDefault();
    if (!selectedFile || !photoSource) {
      setMessage("Toma una fotografía antes de continuar.");
      return;
    }
    const form = event.currentTarget;
    setBusy(true);
    setMessage("Preparando tu registro…");
    let stage: "location" | "upload" = "location";
    const uploadController = new AbortController();
    const uploadTimeout = window.setTimeout(
      () => uploadController.abort(),
      120_000,
    );
    try {
      const data = new FormData(form);
      data.set("photo", selectedFile, selectedFile.name);
      data.set("photoSource", photoSource);
      if (locationEnabled) {
        let position = currentLocation;
        if (!position || Date.now() - position.capturedAt > 10 * 60_000) {
          setMessage("Actualizando tu ubicación…");
          position = await requestBrowserLocation(true);
          setCurrentLocation(position);
        }
        data.set("latitude", String(position.latitude));
        data.set("longitude", String(position.longitude));
        data.set("accuracy", String(position.accuracy));
      }
      stage = "upload";
      setMessage("Subiendo tu evidencia de forma segura…");
      const response = await fetch(url, {
        method: "POST",
        body: data,
        signal: uploadController.signal,
      });
      const result = (await response.json()) as {
        message: string;
        errors?: Array<{ message: string }>;
      };
      setMessage(
        response.ok
          ? result.message
          : (result.errors?.[0]?.message ?? result.message),
      );
      if (response.ok) {
        location.reload();
        return;
      }
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "La subida tardó demasiado. Tu registro sigue seguro; inténtalo nuevamente con una conexión estable."
          : stage === "location" && locationEnabled
            ? locationErrorMessage(error)
            : "No pudimos guardar la asistencia. Revisa tu conexión e intenta nuevamente.",
      );
    } finally {
      window.clearTimeout(uploadTimeout);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <article className="card p-4 sm:p-5">
          <Trophy className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6" />
          <p className="mt-3 text-2xl font-black sm:text-3xl">{points}</p>
          <p className="text-xs muted sm:text-sm">Puntos ganados</p>
        </article>
        <article className="card p-4 sm:p-5">
          <CheckCircle2 className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6" />
          <p className="mt-3 text-2xl font-black sm:text-3xl">
            {completed.length}
          </p>
          <p className="text-xs muted sm:text-sm">Entrenamientos</p>
        </article>
        <article
          className={`card p-4 sm:p-5 ${todayCompleted ? "border-lime-400/30 bg-lime-400/[.04]" : todayRest ? "border-cyan-300/30 bg-cyan-300/[.04]" : ""}`}
        >
          {todayRest ? (
            <Moon className="h-5 w-5 text-cyan-300 sm:h-6 sm:w-6" />
          ) : (
            <Clock3 className="h-5 w-5 text-lime-400 sm:h-6 sm:w-6" />
          )}
          <p className="mt-3 text-xl font-black sm:text-3xl">
            {todayCompleted
              ? "Cumplido"
              : todayRest
                ? "Descanso"
                : active
                  ? "Activo"
                  : "Listo"}
          </p>
          <p className="text-xs muted sm:text-sm">Estado de hoy</p>
        </article>
      </div>

      {todayCompleted ? (
        <section className="relative isolate overflow-hidden rounded-[32px] border border-lime-400/25 bg-gradient-to-br from-slate-900 via-emerald-950/70 to-slate-950 shadow-[0_28px_90px_rgba(34,197,94,.12)]">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-lime-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="grid lg:grid-cols-[1.08fr_.92fr]">
            <div className="p-6 sm:p-9 lg:p-11">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[11px] font-black tracking-[.12em] text-lime-300">
                <CheckCircle2 size={15} />
                MISIÓN DE HOY COMPLETADA
              </span>
              <div className="mt-6 flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-300 to-emerald-400 text-slate-950 shadow-[0_0_32px_rgba(163,230,53,.22)]">
                  <PartyPopper size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold text-lime-300">
                    ¡Felicidades!
                  </p>
                  <h2 className="mt-1 text-3xl font-black leading-tight sm:text-5xl">
                    Hoy ya ganaste.
                  </h2>
                </div>
              </div>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Tu entrenamiento quedó registrado y tu racha sigue encendida. La
                constancia se construye un día a la vez; hoy ya hiciste lo
                importante.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3 sm:p-4">
                  <strong className="block text-xl text-lime-300 sm:text-2xl">
                    {todayCompleted.durationMinutes ?? 0}
                  </strong>
                  <span className="text-[10px] text-slate-400 sm:text-xs">
                    minutos
                  </span>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3 sm:p-4">
                  <strong className="block text-xl text-lime-300 sm:text-2xl">
                    +
                    {todayCompleted.pointMovements.reduce(
                      (sum, point) => sum + point.amount,
                      0,
                    )}
                  </strong>
                  <span className="text-[10px] text-slate-400 sm:text-xs">
                    punto de hoy
                  </span>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 p-3 sm:p-4">
                  <strong className="block truncate text-base text-lime-300 sm:text-xl">
                    {todayCompleted.finishedAt
                      ? new Date(todayCompleted.finishedAt).toLocaleTimeString(
                          dateLocale,
                          { hour: "numeric", minute: "2-digit" },
                        )
                      : "Listo"}
                  </strong>
                  <span className="text-[10px] text-slate-400 sm:text-xs">
                    finalizado
                  </span>
                </div>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setSelectedAttendance(todayCompleted)}
                  className="btn inline-flex items-center justify-center gap-2 px-5 py-3.5"
                >
                  <Eye size={18} />
                  Revive tu entrenamiento
                </button>
                <Link
                  href="/retos"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-5 py-3.5 font-black text-white transition hover:border-orange-400"
                >
                  <Flame size={18} className="text-orange-400" />
                  Ver progreso en retos
                </Link>
              </div>
              <p className="mt-6 inline-flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={15} className="text-lime-300" />
                Tu día está protegido: Nova Gym acepta máximo un entrenamiento
                diario.
              </p>
            </div>
            <div className="relative min-h-[280px] border-t border-slate-800 bg-slate-950/70 lg:min-h-full lg:border-l lg:border-t-0">
              {todayCompleted.photos[0] ? (
                <>
                  <ProtectedImage
                    src={`/api/v1/attendance-photos/${todayCompleted.photos[0].id}`}
                    alt="Tu logro de hoy"
                    className="object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-black text-lime-200 backdrop-blur">
                      <Flame
                        size={15}
                        className="fill-orange-400/20 text-orange-400"
                      />
                      RACHA ENCENDIDA
                    </span>
                    <p className="mt-3 text-xl font-black">
                      Vuelve mañana por el siguiente día.
                    </p>
                  </div>
                </>
              ) : (
                <div className="grid h-full min-h-[280px] place-content-center px-8 text-center">
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-lime-300/20 bg-lime-300/10">
                    <Trophy className="h-12 w-12 text-lime-300" />
                  </div>
                  <p className="mt-5 text-2xl font-black">Día conquistado</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : todayRest ? (
        <section className="relative isolate overflow-hidden rounded-[32px] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,.98),rgba(8,47,73,.72),rgba(2,6,23,.98))] p-7 shadow-[0_28px_90px_rgba(6,182,212,.12)] sm:p-10">
          <div className="pointer-events-none absolute -left-20 -top-24 -z-10 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex max-w-2xl items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border border-cyan-200/20 bg-cyan-300/15 text-cyan-200 shadow-[0_0_32px_rgba(34,211,238,.16)]">
                <Moon size={30} />
              </div>
              <div>
                <span className="text-[11px] font-black tracking-[.16em] text-cyan-300">
                  RECUPERACIÓN ACTIVA
                </span>
                <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                  Hoy también estás avanzando.
                </h2>
                <p className="mt-3 leading-relaxed text-slate-300">
                  Marcaste este día para recuperar energía. El descanso quedó
                  aplicado a todos tus retos activos y tu calendario lo guardará
                  en azul.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={restBusy}
              onClick={() => toggleRest(false)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-slate-950/45 px-5 py-3.5 font-black text-cyan-100 transition hover:border-cyan-200/60 disabled:opacity-60"
            >
              <Undo2 size={18} />
              {restBusy ? "Actualizando…" : "Cancelar descanso"}
            </button>
          </div>
          <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
            <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-2">
              {restDaysRemaining} descansos disponibles después de hoy
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
              No se permiten días consecutivos
            </span>
          </div>
          {message && (
            <p
              role="status"
              className="mt-5 rounded-2xl border border-cyan-300/15 bg-slate-950/50 p-4 text-sm text-cyan-100"
            >
              {message}
            </p>
          )}
        </section>
      ) : todayAttendance && !active ? (
        <section className="card border-orange-400/20 bg-gradient-to-br from-slate-900 to-orange-950/20 p-7 text-center sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-orange-400/10">
            <Clock3 className="h-8 w-8 text-orange-300" />
          </div>
          <h2 className="mt-5 text-3xl font-black">
            El registro de hoy está cerrado
          </h2>
          <p className="mx-auto mt-2 max-w-xl muted">
            Nova Gym protege la regla de un solo entrenamiento diario. Mañana
            podrás comenzar un nuevo día de tu recorrido.
          </p>
          <Link
            href="/retos"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-orange-400/30 px-5 py-3 font-black text-orange-200"
          >
            <Flame size={18} />
            Ver mis retos
          </Link>
        </section>
      ) : (
        <form
          onSubmit={(event) =>
            send(
              event,
              active
                ? `/api/v1/attendances/${active.id}/finish`
                : "/api/v1/attendances",
            )
          }
          className="card overflow-hidden"
        >
          <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)]">
            <div className="space-y-5 p-5 sm:p-7 lg:p-8">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-400/10 px-3 py-1.5 text-[11px] font-black tracking-[.12em] text-lime-300">
                  <span
                    className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,.8)]" : "bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,.7)]"}`}
                  />
                  {active ? "SESIÓN EN CURSO" : "REGISTRO DE HOY"}
                </span>
                <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                  {active
                    ? "Completa tu entrenamiento"
                    : "Registra tu entrenamiento"}
                </h2>
                <p className="mt-2 muted">
                  {active
                    ? "Añade la fotografía final después de mínimo 15 minutos."
                    : locationEnabled
                      ? "Una foto, un punto protegido y listo. Tu evidencia siempre será privada."
                      : "Una foto y listo. Elegiste registrar tu evidencia sin ubicación."}
                </p>
              </div>

              {!active && hasActiveChallenges && (
                <div className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.16),transparent_42%),rgba(8,47,73,.18)] p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/15 text-cyan-200">
                        <Moon size={23} />
                      </div>
                      <div>
                        <strong className="text-lg">¿Tu cuerpo pide pausa?</strong>
                        <p className="mt-1 max-w-lg text-sm leading-relaxed text-slate-300">
                          Usa un día de recuperación para todos tus retos. Tienes
                          <b className="text-cyan-200"> {restDaysRemaining} disponibles</b>
                          ; no pueden ser consecutivos.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={restBusy || restDaysRemaining <= 0}
                      onClick={() => toggleRest(true)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 font-black text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Moon size={17} />
                      {restBusy
                        ? "Guardando…"
                        : restDaysRemaining > 0
                          ? "Marcar descanso"
                          : "Descansos agotados"}
                    </button>
                  </div>
                </div>
              )}

              {locationEnabled ? <div
                className={`rounded-2xl border p-5 ${currentLocation ? "border-lime-500/40 bg-gradient-to-br from-lime-400/10 to-emerald-500/5" : "border-amber-500/30 bg-amber-400/5"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${currentLocation ? "bg-lime-400 text-slate-950" : "bg-amber-400/15 text-amber-300"}`}
                    >
                      {currentLocation ? (
                        <Navigation size={23} />
                      ) : (
                        <MapPin size={23} />
                      )}
                    </div>
                    <div>
                      <strong className="text-lg">
                        {currentLocation
                          ? "Ubicación protegida y lista"
                          : "Activa tu ubicación"}
                      </strong>
                      <p className="mt-1 text-sm muted">
                        {currentLocation
                          ? `${locationQuality(currentLocation.accuracy)} · actualizada hace unos momentos`
                          : locationPermission === "denied"
                            ? "Permite la ubicación desde la barra del navegador."
                            : "La necesitamos solo al iniciar y finalizar."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={testLocation}
                    disabled={locationTesting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-bold transition hover:border-lime-500 sm:w-auto"
                  >
                    <RefreshCw
                      size={16}
                      className={locationTesting ? "animate-spin" : ""}
                    />
                    {locationTesting
                      ? "Actualizando…"
                      : currentLocation
                        ? "Actualizar"
                        : "Activar"}
                  </button>
                </div>
                {currentLocation && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-lime-500/20 pt-4 text-sm">
                    <span className="inline-flex items-center gap-2 text-lime-300">
                      <Check size={17} />
                      <strong>Punto confirmado</strong>
                    </span>
                    <span className="muted">
                      Precisión aproximada de{" "}
                      {Math.round(currentLocation.accuracy)} m
                    </span>
                    <a
                      className="inline-flex items-center gap-1 font-bold text-lime-400 hover:underline"
                      href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver en el mapa <ExternalLink size={14} />
                    </a>
                  </div>
                )}
                {locationDiagnostic && (
                  <p
                    className={`mt-4 rounded-xl p-3 text-sm ${currentLocation ? "bg-lime-400/10 text-lime-300" : "bg-red-500/10 text-red-300"}`}
                  >
                    {locationDiagnostic}
                  </p>
                )}
              </div> : (
                <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.16),transparent_42%),rgba(34,211,238,.05)] p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
                      <ShieldCheck size={23} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="text-lg">Entrenamiento sin ubicación</strong>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        Respetamos tu elección: no pediremos GPS ni guardaremos
                        coordenadas en esta asistencia.
                      </p>
                      <Link
                        href="/perfil?ajuste=privacidad#ajustes"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-black text-cyan-300"
                      >
                        Cambiar privacidad <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <ShieldCheck className="shrink-0 text-lime-400" />
                <div>
                  <strong>Evidencia privada</strong>
                  <p className="mt-1 text-sm muted">
                    {locationEnabled
                      ? "La foto y el punto de ubicación solo se usan para validar tu registro."
                      : "Solo guardaremos tu fotografía para validar este registro."}
                  </p>
                </div>
              </div>

              <section className="space-y-3 xl:space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black tracking-[.14em] text-lime-400">
                      TU EVIDENCIA
                    </p>
                    <h3 className="mt-1 text-lg font-black">
                      {preview
                        ? "Revisa tu fotografía"
                        : "Añade una fotografía"}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${preview ? "bg-lime-400/10 text-lime-300" : "bg-slate-800 text-slate-400"}`}
                  >
                    {preview
                      ? photoSource === "gallery"
                        ? "ARCHIVO LISTO"
                        : "CÁMARA LISTA"
                      : "PENDIENTE"}
                  </span>
                </div>

                {preview && (
                  <div className="relative aspect-[4/5] max-h-[420px] overflow-hidden rounded-[24px] border border-lime-400/25 bg-black shadow-[0_20px_55px_rgba(0,0,0,.32)] xl:hidden">
                    <Image
                      src={preview}
                      alt="Vista previa de la evidencia"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/65 to-transparent" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-black tracking-wide text-white backdrop-blur-md">
                      <CheckCircle2 size={14} className="text-lime-300" />
                      VISTA PREVIA
                    </span>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      aria-label="Quitar fotografía"
                      className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white backdrop-blur-md transition hover:bg-red-500"
                    >
                      <X size={19} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/65 to-transparent p-4 pt-16">
                      <strong className="inline-flex items-center gap-2 text-sm">
                        <ShieldCheck size={16} className="text-lime-300" />
                        Lista para enviar de forma privada
                      </strong>
                      <p className="mt-1 truncate text-xs text-slate-300">
                        {fileName}
                      </p>
                    </div>
                  </div>
                )}

                {canChooseFromDevice ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`group cursor-pointer rounded-2xl border p-4 transition sm:p-5 ${photoSource === "camera" ? "border-lime-400 bg-lime-400/10" : "border-slate-700 bg-slate-950/50 hover:border-lime-400/50"}`}>
                      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${photoSource === "camera" ? "bg-lime-400 text-slate-950" : "bg-lime-400/10 text-lime-300"}`}>
                        <Camera size={22} />
                      </span>
                      <strong className="mt-3 block text-sm sm:text-base">
                        {preview && photoSource === "camera" ? "Volver a tomar" : "Tomar foto"}
                      </strong>
                      <small className="mt-1 block text-[11px] leading-4 text-slate-400">
                        Abre la cámara del dispositivo
                      </small>
                      <input
                        key={`camera-${inputKey}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        capture="environment"
                        className="sr-only"
                        onChange={(event) => choosePhoto(event, "camera")}
                      />
                    </label>
                    <label className={`group cursor-pointer rounded-2xl border p-4 transition sm:p-5 ${photoSource === "gallery" ? "border-cyan-300 bg-cyan-300/10" : "border-slate-700 bg-slate-950/50 hover:border-cyan-300/50"}`}>
                      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${photoSource === "gallery" ? "bg-cyan-300 text-slate-950" : "bg-cyan-300/10 text-cyan-300"}`}>
                        <FolderOpen size={22} />
                      </span>
                      <strong className="mt-3 block text-sm sm:text-base">
                        {preview && photoSource === "gallery" ? "Cambiar archivo" : "Elegir del equipo"}
                      </strong>
                      <small className="mt-1 block text-[11px] leading-4 text-slate-400">
                        Galería, fotos o archivos
                      </small>
                      <input
                        key={`gallery-${inputKey}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        className="sr-only"
                        onChange={(event) => choosePhoto(event, "gallery")}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className={`flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed p-4 transition sm:p-5 ${preview ? "border-slate-700 bg-slate-950/40 hover:border-lime-500" : "border-lime-500/60 bg-lime-400/[.03] hover:bg-lime-400/[.07]"}`}>
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-400 text-slate-950">
                        <Camera size={23} />
                      </span>
                      <span className="min-w-0">
                        <strong className="block">
                          {preview ? "Volver a tomar la foto" : "Abrir cámara"}
                        </strong>
                        <small className="mt-1 block text-slate-400">
                          Captura tu evidencia en este momento
                        </small>
                      </span>
                      <input
                        key={`camera-${inputKey}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        capture="environment"
                        className="sr-only"
                        onChange={(event) => choosePhoto(event, "camera")}
                      />
                    </label>
                    <Link href="/planes" className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-400/10 to-cyan-400/5 p-3.5 transition hover:border-violet-300/40">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><Crown size={19} /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-xs text-violet-100">Galería disponible en planes superiores</strong>
                        <small className="mt-0.5 block text-[10px] text-slate-400">Plan actual: {planName} · conoce las opciones</small>
                      </span>
                      <ChevronRight size={17} className="text-violet-200" />
                    </Link>
                  </div>
                )}
              </section>

              <button
                className="btn w-full py-4 text-base shadow-[0_12px_35px_rgba(163,230,53,.12)]"
                disabled={busy || !selectedFile}
              >
                {busy
                  ? "Procesando…"
                  : active
                    ? "Finalizar y ganar 1 punto"
                    : "Confirmar e iniciar entrenamiento"}
              </button>
              {message && (
                <p
                  role="status"
                  className="rounded-xl bg-slate-950 p-4 text-sm text-lime-300"
                >
                  {message}
                </p>
              )}
            </div>

            <div className="relative hidden min-h-[300px] border-t border-slate-800 bg-[#020617] xl:block xl:min-h-full xl:border-l xl:border-t-0">
              {preview ? (
                <>
                  <Image
                    src={preview}
                    alt="Vista previa de la evidencia"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    aria-label="Quitar fotografía"
                    className="absolute right-4 top-4 z-10 rounded-full bg-slate-950/85 p-3"
                  >
                    <X />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-5 pt-12 text-sm">
                    <strong>Fotografía lista</strong>
                    <p className="truncate muted">{fileName}</p>
                  </div>
                </>
              ) : (
                <div className="grid h-full min-h-[300px] place-content-center px-6 text-center">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-slate-900">
                    <ImagePlus className="h-10 w-10 text-slate-600" />
                  </div>
                  <p className="mt-5 text-lg font-bold">
                    Tu fotografía aparecerá aquí
                  </p>
                  <p className="mt-1 max-w-xs text-sm muted">
                    Podrás revisarla antes de confirmar el entrenamiento.
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <section className="relative overflow-hidden rounded-[28px] border border-white/[.08] bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,.1),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,.09),transparent_38%),rgba(10,18,32,.78)] p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-lime-400">MI CALENDARIO</p>
              <h2 className="mt-1 text-2xl font-black capitalize">
                {calendarMonth.toLocaleDateString(dateLocale, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() =>
                  setCalendarMonth(
                    (value) =>
                      new Date(value.getFullYear(), value.getMonth() - 1, 1),
                  )
                }
                className="rounded-xl border border-slate-700 p-2 hover:border-lime-500"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() =>
                  setCalendarMonth(
                    (value) =>
                      new Date(value.getFullYear(), value.getMonth() + 1, 1),
                  )
                }
                className="rounded-xl border border-slate-700 p-2 hover:border-lime-500"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day, index) => (
              <span
                key={`${day}-${index}`}
                className="pb-2 text-xs font-bold text-slate-500"
              >
                {day}
              </span>
            ))}
            {calendarCells.map((day, index) => {
              if (!day)
                return (
                  <span key={`empty-${index}`} className="aspect-square" />
                );
              const key = dateKey(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth(),
                day,
              );
              const attendance = attendanceByDate.get(key);
              const isToday = key === todayKey;
              const isRestDay = restDaySet.has(key);
              const isMissed =
                key >= APP_TRACKING_START_DATE &&
                key < todayKey &&
                !attendance &&
                !isRestDay;
              return (
                <div
                  key={key}
                  title={
                    attendance
                      ? statusLabel(attendance.status)
                      : isRestDay
                        ? "Día de descanso"
                        : isMissed
                          ? "No entrenaste"
                          : key < APP_TRACKING_START_DATE
                            ? "Antes del inicio de Nova Gym"
                            : "Día disponible"
                  }
                  className={`relative grid aspect-square place-items-center rounded-xl border text-sm font-black transition ${attendance?.status === "COMPLETED" ? "border-lime-300/60 bg-gradient-to-br from-lime-300 to-lime-500 text-slate-950 shadow-[0_0_22px_rgba(163,230,53,.2)]" : attendance?.status === "IN_PROGRESS" ? "border-orange-300/50 bg-orange-400 text-slate-950" : isRestDay ? "border-cyan-300/45 bg-gradient-to-br from-cyan-300/25 to-blue-500/20 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,.1)]" : isMissed ? "border-rose-400/30 bg-gradient-to-br from-rose-500/18 to-red-950/25 text-rose-200" : isToday ? "border-lime-500/60 bg-lime-300/[.05] text-lime-300" : "border-transparent text-slate-500 hover:bg-slate-800/60"}`}
                >
                  {day}
                  {(attendance || isRestDay || isMissed) && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-60" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-lime-300/10 bg-lime-300/[.06] p-3 text-center">
              <strong className="block text-xl text-lime-300">{monthAttendanceCount}</strong>
              <span className="text-[10px] font-bold text-slate-400 sm:text-xs">Entrenaste</span>
            </div>
            <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.06] p-3 text-center">
              <strong className="block text-xl text-cyan-200">{monthRestCount}</strong>
              <span className="text-[10px] font-bold text-slate-400 sm:text-xs">Descansos</span>
            </div>
            <div className="rounded-2xl border border-rose-300/10 bg-rose-300/[.05] p-3 text-center">
              <strong className="block text-xl text-rose-200">{monthMissedCount}</strong>
              <span className="text-[10px] font-bold text-slate-400 sm:text-xs">Sin entrenar</span>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/[.06] bg-slate-950/55 p-4">
            <p className="flex items-center gap-2 text-xs font-black text-slate-200">
              <CalendarDays size={16} className="text-lime-300" />
              Así se lee tu recorrido
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-lime-400" /> Entrenaste</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-cyan-300" /> Recuperación</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" /> No entrenaste</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-slate-700" /> Antes del 13 jul.</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              El seguimiento comenzó el 13 de julio de 2026; los días anteriores no afectan tu progreso.
            </p>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[28px] border border-white/[.07] bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.09),transparent_38%),rgba(10,18,32,.72)] p-5 shadow-[0_24px_70px_rgba(0,0,0,.2)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[.12em] text-lime-400">
                TU RECORRIDO
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Historial de entrenamientos
              </h2>
              <p className="mt-1 text-sm muted">
                Desliza para revivir cada sesión del mes.
              </p>
            </div>
            <label className="relative min-w-[190px]">
              <span className="sr-only">Filtrar historial por mes</span>
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300" size={17} />
              <select
                value={historyMonthKey}
                onChange={(event) => selectHistoryMonth(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-cyan-300/20 bg-slate-950/80 py-3 pl-10 pr-10 text-sm font-black capitalize text-white outline-none transition focus:border-cyan-300"
              >
                {historyMonths.map((month) => (
                  <option key={month.key} value={month.key}>
                    {month.label}
                  </option>
                ))}
              </select>
              <ChevronRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500" size={16} />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="rounded-full border border-white/[.07] bg-white/[.035] px-3 py-1.5 text-[10px] font-black text-slate-300">
              {historyRows.length} {historyRows.length === 1 ? "SESIÓN" : "SESIONES"}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => scrollHistory(-1)} aria-label="Entrenamiento anterior" className="grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-lime-300 hover:text-lime-300">
                <ChevronLeft size={19} />
              </button>
              <button type="button" onClick={() => scrollHistory(1)} aria-label="Entrenamiento siguiente" className="grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-950/70 text-slate-300 transition hover:border-lime-300 hover:text-lime-300">
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          {historyRows.length === 0 ? (
            <div className="mt-4 rounded-[24px] border border-dashed border-slate-700 bg-slate-950/35 p-8 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-4 font-bold">No hay sesiones en este mes</p>
              <p className="mt-1 text-sm muted">
                Elige otro mes o completa tu próximo entrenamiento.
              </p>
            </div>
          ) : (
            <div
              ref={historyCarouselRef}
              className="-mx-5 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 pr-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6"
            >
              {historyRows.map((row) => {
                const date = new Date(row.localDate);
                const cover = row.photos[0];
                const earnedPoints = row.pointMovements.reduce(
                  (total, movement) => total + movement.amount,
                  0,
                );
                return (
                  <article key={row.id} className="group w-[79vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-[26px] border border-slate-700/80 bg-slate-950/80 shadow-[0_18px_45px_rgba(0,0,0,.24)]">
                    <button type="button" onClick={() => setSelectedAttendance(row)} className="block w-full text-left">
                      <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,rgba(163,230,53,.18),transparent_35%),#08101e]">
                        {cover ? (
                          <ProtectedImage src={`/api/v1/attendance-photos/${cover.id}`} alt={`Entrenamiento del ${date.getUTCDate()}`} className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="absolute inset-0 grid place-items-center"><ImageIcon className="h-12 w-12 text-slate-700" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/25" />
                        <span className={`absolute left-3 top-3 rounded-full border px-3 py-1.5 text-[9px] font-black backdrop-blur-xl ${row.status === "COMPLETED" ? "border-lime-300/20 bg-lime-300/15 text-lime-200" : "border-orange-300/20 bg-orange-300/15 text-orange-200"}`}>
                          {statusLabel(row.status).toUpperCase()}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="text-xs font-bold capitalize text-cyan-200">
                            {date.toLocaleDateString(dateLocale, { timeZone: "UTC", weekday: "long" })}
                          </p>
                          <h3 className="mt-0.5 text-xl font-black capitalize">
                            {date.toLocaleDateString(dateLocale, { timeZone: "UTC", day: "numeric", month: "long" })}
                          </h3>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black tracking-[.14em] text-cyan-300">
                              RESUMEN DE SESIÓN
                            </p>
                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-slate-300">
                              <Clock3 size={14} className="text-cyan-300" />
                              {new Date(row.startedAt).toLocaleTimeString(
                                dateLocale,
                                { hour: "numeric", minute: "2-digit" },
                              )}
                              <span className="text-slate-600">—</span>
                              {row.finishedAt
                                ? new Date(row.finishedAt).toLocaleTimeString(
                                    dateLocale,
                                    { hour: "numeric", minute: "2-digit" },
                                  )
                                : "En curso"}
                            </p>
                          </div>
                          {(row.startLatitude !== null ||
                            row.endLatitude !== null) && (
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-lime-300/15 bg-lime-300/10 text-lime-300" title="Ubicación verificada">
                              <MapPin size={16} />
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <span className="rounded-xl border border-white/[.05] bg-white/[.035] p-2.5">
                            <Timer size={14} className="text-lime-300" />
                            <strong className="mt-1 block text-sm">
                              {row.durationMinutes ?? 0} min
                            </strong>
                            <small className="text-[9px] text-slate-500">
                              duración
                            </small>
                          </span>
                          <span className="rounded-xl border border-white/[.05] bg-white/[.035] p-2.5">
                            <ImageIcon size={14} className="text-cyan-300" />
                            <strong className="mt-1 block text-sm">
                              {row.photos.length}
                            </strong>
                            <small className="text-[9px] text-slate-500">
                              evidencias
                            </small>
                          </span>
                          <span className="rounded-xl border border-white/[.05] bg-white/[.035] p-2.5">
                            <Trophy size={14} className="text-orange-300" />
                            <strong className="mt-1 block text-sm">
                              +{earnedPoints}
                            </strong>
                            <small className="text-[9px] text-slate-500">
                              puntos
                            </small>
                          </span>
                        </div>

                        <span className="mt-4 flex items-center justify-between rounded-2xl border border-lime-300/20 bg-lime-300/[.07] px-3 py-2.5 font-black text-lime-300 transition group-hover:bg-lime-300 group-hover:text-slate-950">
                          <span className="inline-flex items-center gap-2">
                            <Eye size={17} />
                            Ver detalles
                          </span>
                          <ChevronRight size={18} />
                        </span>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {selectedAttendance && (
        <AttendanceDetailStory
          attendance={selectedAttendance}
          locale={locale}
          storyDurationSeconds={storyDurationSeconds}
          onClose={() => setSelectedAttendance(undefined)}
        />
      )}
    </div>
  );
}
