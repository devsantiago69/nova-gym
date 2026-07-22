"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CalendarRange,
  Camera,
  Check,
  Copy,
  Download,
  LayoutTemplate,
  QrCode,
  ScanLine,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

export type SocialStats = {
  name: string;
  username: string;
  attendances: number;
  monthAttendances: number;
  streak: number;
  totalHours: number;
  globalPoints: number;
  challengePoints: number;
  friends: number;
  activeChallenges: number;
};

export type SocialProgress = {
  todayKey: string;
  trackingStartDate: string;
  attendanceDates: string[];
  restDates: string[];
  monthlyBars: Array<{ key: string; label: string; value: number }>;
};

type StoryTemplate = "analytics" | "calendar";

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function drawDonut(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  progress: number,
) {
  context.lineCap = "round";
  context.lineWidth = 42;
  context.strokeStyle = "rgba(148,163,184,.15)";
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  const gradient = context.createLinearGradient(
    centerX - radius,
    centerY,
    centerX + radius,
    centerY,
  );
  gradient.addColorStop(0, "#22d3ee");
  gradient.addColorStop(1, "#a3e635");
  context.strokeStyle = gradient;
  context.beginPath();
  context.arc(
    centerX,
    centerY,
    radius,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, progress),
  );
  context.stroke();
}

function drawQrFooter(
  context: CanvasRenderingContext2D,
  qrImage: HTMLImageElement,
  stats: SocialStats,
) {
  context.fillStyle = "rgba(2,6,23,.8)";
  roundedRect(context, 65, 1570, 950, 260, 44);
  context.fillStyle = "#ffffff";
  roundedRect(context, 95, 1600, 200, 200, 28);
  context.drawImage(qrImage, 108, 1613, 174, 174);
  context.fillStyle = "#ffffff";
  context.font = "900 31px system-ui";
  context.fillText("ENTRENA CONMIGO", 345, 1664);
  context.fillStyle = "#a3e635";
  context.font = "800 25px system-ui";
  context.fillText(`@${stats.username} · Nova Gym`, 345, 1710);
  context.fillStyle = "#94a3b8";
  context.font = "600 20px system-ui";
  context.fillText("Escanea el QR y conecta conmigo", 345, 1754);
}

function monthProgress(progress: SocialProgress) {
  const monthKey = progress.todayKey.slice(0, 7);
  const monthStart = `${monthKey}-01`;
  const effectiveStart =
    progress.trackingStartDate > monthStart
      ? progress.trackingStartDate
      : monthStart;
  const elapsed = Math.max(
    1,
    Math.floor(
      (Date.parse(`${progress.todayKey}T00:00:00Z`) -
        Date.parse(`${effectiveStart}T00:00:00Z`)) /
        86_400_000,
    ) + 1,
  );
  const trained = progress.attendanceDates.filter((date) =>
    date.startsWith(monthKey),
  ).length;
  const rested = progress.restDates.filter((date) =>
    date.startsWith(monthKey),
  ).length;
  return {
    monthKey,
    elapsed,
    trained,
    rested,
    missed: Math.max(0, elapsed - trained - rested),
    ratio: Math.min(1, trained / elapsed),
  };
}

async function storyBlob(
  stats: SocialStats,
  qrSvg: string,
  progress: SocialProgress,
  template: StoryTemplate,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  const background = context.createLinearGradient(0, 0, 1080, 1920);
  background.addColorStop(0, "#05080d");
  background.addColorStop(0.55, "#0f172a");
  background.addColorStop(1, "#172211");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1920);
  const glow = context.createRadialGradient(850, 250, 10, 850, 250, 600);
  glow.addColorStop(0, "rgba(163,230,53,.28)");
  glow.addColorStop(1, "rgba(163,230,53,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 1080, 900);
  context.fillStyle = "#a3e635";
  context.font = "900 38px system-ui";
  context.fillText("NOVA GYM", 80, 110);
  context.fillStyle = "#94a3b8";
  context.font = "700 25px system-ui";
  context.fillText("MI PROGRESO NO SE NEGOCIA", 80, 157);
  context.fillStyle = "#ffffff";
  context.font = "900 68px system-ui";
  context.fillText(stats.name.slice(0, 23), 80, 300);
  context.fillStyle = "#a3e635";
  context.font = "700 30px system-ui";
  context.fillText(`@${stats.username}`, 80, 350);
  const qrImage = new Image();
  qrImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;
  await qrImage.decode();
  const month = monthProgress(progress);

  if (template === "analytics") {
    context.fillStyle = "rgba(15,23,42,.78)";
    roundedRect(context, 65, 420, 950, 390, 46);
    drawDonut(context, 285, 615, 125, month.ratio);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.font = "900 64px system-ui";
    context.fillText(`${Math.round(month.ratio * 100)}%`, 285, 628);
    context.fillStyle = "#94a3b8";
    context.font = "800 18px system-ui";
    context.fillText("RITMO DEL MES", 285, 670);
    context.textAlign = "left";
    context.fillStyle = "#ffffff";
    context.font = "900 27px system-ui";
    context.fillText("ÚLTIMOS 6 MESES", 520, 500);
    const maxBar = Math.max(1, ...progress.monthlyBars.map((bar) => bar.value));
    progress.monthlyBars.forEach((bar, index) => {
      const x = 520 + index * 72;
      const height = Math.max(8, (bar.value / maxBar) * 190);
      const barGradient = context.createLinearGradient(0, 710 - height, 0, 710);
      barGradient.addColorStop(0, index === 5 ? "#a3e635" : "#22d3ee");
      barGradient.addColorStop(1, "rgba(34,211,238,.18)");
      context.fillStyle = barGradient;
      roundedRect(context, x, 710 - height, 45, height, 15);
      context.fillStyle = "#cbd5e1";
      context.font = "800 17px system-ui";
      context.textAlign = "center";
      context.fillText(String(bar.value), x + 22, 690 - height);
      context.fillStyle = "#64748b";
      context.font = "700 15px system-ui";
      context.fillText(bar.label.toUpperCase(), x + 22, 755);
    });
    context.textAlign = "left";
    const cards: ReadonlyArray<readonly [string, string, string]> = [
      [String(stats.streak), "DÍAS DE RACHA", "#fb923c"],
      [String(stats.attendances), "ASISTENCIAS", "#a3e635"],
      [`${stats.totalHours}h`, "ENTRENANDO", "#22d3ee"],
      [String(stats.challengePoints), "PUNTOS EN RETOS", "#c084fc"],
    ];
    cards.forEach(([value, label, color], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 65 + column * 485;
      const y = 850 + row * 230;
      context.fillStyle = "rgba(15,23,42,.82)";
      roundedRect(context, x, y, 465, 195, 35);
      context.fillStyle = color;
      context.font = "900 61px system-ui";
      context.fillText(value, x + 34, y + 82);
      context.fillStyle = "#cbd5e1";
      context.font = "800 20px system-ui";
      context.fillText(label, x + 34, y + 132);
    });
    context.fillStyle = "#ffffff";
    context.font = "900 32px system-ui";
    context.fillText(
      `${month.trained} entrenamientos · ${month.rested} descansos este mes`,
      70,
      1375,
    );
    context.fillStyle = "#94a3b8";
    context.font = "600 23px system-ui";
    context.fillText(
      `${stats.friends} amigos · ${stats.activeChallenges} retos activos`,
      70,
      1425,
    );
  } else {
    const monthDate = new Date(`${month.monthKey}-01T00:00:00Z`);
    const monthLabel = monthDate.toLocaleDateString("es-CO", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    context.fillStyle = "#ffffff";
    context.font = "900 45px system-ui";
    context.fillText("MI CALENDARIO NOVA", 70, 445);
    context.fillStyle = "#22d3ee";
    context.font = "800 28px system-ui";
    context.fillText(monthLabel.toUpperCase(), 70, 495);
    context.fillStyle = "rgba(15,23,42,.8)";
    roundedRect(context, 55, 540, 970, 780, 48);
    const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
    context.textAlign = "center";
    context.font = "800 21px system-ui";
    context.fillStyle = "#64748b";
    weekdays.forEach((day, index) => context.fillText(day, 130 + index * 137, 605));
    const year = monthDate.getUTCFullYear();
    const monthIndex = monthDate.getUTCMonth();
    const firstOffset = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
    const totalDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const attendanceSet = new Set(progress.attendanceDates);
    const restSet = new Set(progress.restDates);
    for (let day = 1; day <= totalDays; day += 1) {
      const position = firstOffset + day - 1;
      const column = position % 7;
      const row = Math.floor(position / 7);
      const x = 82 + column * 137;
      const y = 645 + row * 105;
      const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const trained = attendanceSet.has(key);
      const rested = restSet.has(key);
      const missed =
        key >= progress.trackingStartDate && key < progress.todayKey && !trained && !rested;
      context.fillStyle = trained
        ? "#a3e635"
        : rested
          ? "#22d3ee"
          : missed
            ? "rgba(251,113,133,.3)"
            : "rgba(30,41,59,.85)";
      roundedRect(context, x, y, 96, 76, 24);
      context.fillStyle = trained ? "#020617" : missed ? "#fecdd3" : "#e2e8f0";
      context.font = "900 25px system-ui";
      context.fillText(String(day), x + 48, y + 47);
    }
    context.textAlign = "left";
    const summary: ReadonlyArray<readonly [string, number, string]> = [
      ["ENTRENASTE", month.trained, "#a3e635"],
      ["DESCANSO", month.rested, "#22d3ee"],
      ["SIN ENTRENAR", month.missed, "#fb7185"],
    ];
    summary.forEach(([label, value, color], index) => {
      const x = 65 + index * 320;
      context.fillStyle = "rgba(15,23,42,.82)";
      roundedRect(context, x, 1360, 300, 150, 30);
      context.fillStyle = color;
      context.font = "900 45px system-ui";
      context.fillText(String(value), x + 28, 1425);
      context.fillStyle = "#cbd5e1";
      context.font = "800 17px system-ui";
      context.fillText(label, x + 28, 1467);
    });
  }
  drawQrFooter(context, qrImage, stats);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("IMAGE_FAILED"))),
      "image/png",
      0.95,
    ),
  );
}

function Scanner({ close }: { close: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Preparando cámara…");
  useEffect(() => {
    let stopped = false;
    let stop: (() => void) | undefined;
    void import("@zxing/browser").then(async ({ BrowserQRCodeReader }) => {
      if (stopped || !videoRef.current) return;
      const reader = new BrowserQRCodeReader();
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result) return;
            const raw = result.getText();
            try {
              const url = new URL(raw);
              if (
                url.origin !== window.location.origin ||
                !url.pathname.startsWith("/conectar/")
              ) {
                setMessage("Este QR no pertenece a Nova Gym.");
                return;
              }
              controls.stop();
              window.location.assign(url.toString());
            } catch {
              setMessage("No pudimos reconocer este QR.");
            }
          },
        );
        stop = () => controls.stop();
        setMessage("Apunta al QR de tu amigo");
      } catch {
        setMessage(
          "No pudimos abrir la cámara. Revisa el permiso del navegador.",
        );
      }
    });
    return () => {
      stopped = true;
      stop?.();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/90 backdrop-blur-xl sm:items-center sm:justify-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Escanear QR"
        className="w-full max-w-lg overflow-hidden rounded-t-[32px] border border-slate-700 bg-slate-900 sm:rounded-[32px]"
      >
        <header className="flex items-start justify-between p-5">
          <div>
            <p className="text-[10px] font-black tracking-[.18em] text-lime-300">
              NOVA SCAN
            </p>
            <h2 className="mt-1 text-2xl font-black">Escanea a tu amigo</h2>
          </div>
          <button
            onClick={close}
            aria-label="Cerrar escáner"
            className="rounded-full bg-slate-950 p-2"
          >
            <X />
          </button>
        </header>
        <div className="relative aspect-square overflow-hidden bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-[12%] rounded-[30px] border-2 border-lime-400 shadow-[0_0_0_999px_rgba(0,0,0,.38),0_0_40px_rgba(163,230,53,.2)]">
            <ScanLine className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-lime-300/70" />
          </div>
        </div>
        <p
          role="status"
          className="p-5 text-center text-sm font-bold text-lime-300"
        >
          {message}
        </p>
      </section>
    </div>
  );
}

function StoryPreview({
  stats,
  progress,
  template,
  qrSvg,
}: {
  stats: SocialStats;
  progress: SocialProgress;
  template: StoryTemplate;
  qrSvg: string;
}) {
  const month = monthProgress(progress);
  const monthDate = new Date(`${month.monthKey}-01T00:00:00Z`);
  const days = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const offset =
    (new Date(
      Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1),
    ).getUTCDay() +
      6) %
    7;
  const trained = new Set(progress.attendanceDates);
  const rested = new Set(progress.restDates);
  const maxBar = Math.max(1, ...progress.monthlyBars.map((bar) => bar.value));
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[270px] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(163,230,53,.24),transparent_32%),linear-gradient(160deg,#05080d,#0f172a_58%,#15220f)] p-4 shadow-[0_28px_80px_rgba(0,0,0,.35)]">
      <div className="flex items-center justify-between text-[7px] font-black tracking-[.16em] text-lime-300">
        <span>NOVA GYM</span>
        <span className="rounded-full border border-white/10 px-2 py-1 text-slate-300">
          STORY 9:16
        </span>
      </div>
      <p className="mt-5 truncate text-xl font-black">{stats.name}</p>
      <p className="text-[9px] font-bold text-lime-300">@{stats.username}</p>
      {template === "analytics" ? (
        <>
          <div className="mt-5 grid grid-cols-[.9fr_1.1fr] gap-3 rounded-2xl border border-white/[.06] bg-slate-950/45 p-3">
            <div className="grid place-items-center">
              <div
                className="grid aspect-square w-[82px] place-items-center rounded-full p-[9px]"
                style={{
                  background: `conic-gradient(#a3e635 ${Math.round(month.ratio * 360)}deg, rgba(148,163,184,.14) 0)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-slate-950 text-center">
                  <span className="text-lg font-black">
                    {Math.round(month.ratio * 100)}%
                  </span>
                </div>
              </div>
              <small className="mt-2 text-[7px] font-black text-slate-400">
                RITMO DEL MES
              </small>
            </div>
            <div className="flex items-end justify-between gap-1 pb-3 pt-5">
              {progress.monthlyBars.map((bar, index) => (
                <div key={bar.key} className="flex flex-1 flex-col items-center">
                  <span className="text-[6px] text-slate-500">{bar.value}</span>
                  <i
                    className={`mt-1 w-full rounded-t-md ${index === 5 ? "bg-lime-300" : "bg-cyan-300/60"}`}
                    style={{ height: `${Math.max(5, (bar.value / maxBar) * 55)}px` }}
                  />
                  <span className="mt-1 text-[5px] uppercase text-slate-500">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              [stats.streak, "días de racha", "text-orange-300"],
              [stats.attendances, "asistencias", "text-lime-300"],
              [`${stats.totalHours}h`, "entrenando", "text-cyan-300"],
              [stats.challengePoints, "pts en retos", "text-violet-300"],
            ].map(([value, label, color]) => (
              <div
                key={label}
                className="rounded-xl border border-white/[.05] bg-slate-950/55 p-2.5"
              >
                <strong className={`block text-lg ${color}`}>{value}</strong>
                <span className="text-[7px] font-bold text-slate-400">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-white/[.06] bg-slate-950/50 p-3">
            <p className="text-[7px] font-black tracking-widest text-cyan-300">
              MI CALENDARIO NOVA
            </p>
            <p className="mt-1 text-sm font-black capitalize">
              {monthDate.toLocaleDateString("es-CO", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[6px] font-bold text-slate-500">
              {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
              {Array.from({ length: offset }).map((_, index) => (
                <span key={`empty-${index}`} />
              ))}
              {Array.from({ length: days }, (_, index) => index + 1).map(
                (day) => {
                  const key = `${month.monthKey}-${String(day).padStart(2, "0")}`;
                  const isTrained = trained.has(key);
                  const isRest = rested.has(key);
                  const isMissed =
                    key >= progress.trackingStartDate &&
                    key < progress.todayKey &&
                    !isTrained &&
                    !isRest;
                  return (
                    <span
                      key={key}
                      className={`grid aspect-square place-items-center rounded-md font-black ${isTrained ? "bg-lime-300 text-slate-950" : isRest ? "bg-cyan-300/80 text-slate-950" : isMissed ? "bg-rose-400/25 text-rose-200" : "bg-slate-800/70 text-slate-500"}`}
                    >
                      {day}
                    </span>
                  );
                },
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {[
              [month.trained, "Entrené", "text-lime-300"],
              [month.rested, "Descanso", "text-cyan-300"],
              [month.missed, "Pausa", "text-rose-300"],
            ].map(([value, label, color]) => (
              <span
                key={label}
                className="rounded-xl border border-white/[.05] bg-slate-950/55 p-2"
              >
                <strong className={`block text-base ${color}`}>{value}</strong>
                <small className="text-[6px] text-slate-500">{label}</small>
              </span>
            ))}
          </div>
        </>
      )}
      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl border border-white/[.07] bg-slate-950/75 p-3">
        <div
          className="h-10 w-10 shrink-0 rounded-lg bg-white p-1 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div>
          <p className="text-[8px] font-black">ENTRENA CONMIGO</p>
          <p className="text-[6px] text-lime-300">Escanea y conecta en Nova</p>
        </div>
      </div>
    </div>
  );
}

export function ProfileSocialHub({
  qrSvg,
  shareUrl,
  stats,
  progress,
}: {
  qrSvg: string;
  shareUrl: string;
  stats: SocialStats;
  progress: SocialProgress;
}) {
  const [scanner, setScanner] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState<StoryTemplate>("analytics");
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setMessage("No pudimos copiar el enlace en este navegador.");
    }
  }
  async function shareStory() {
    setBusy(true);
    setMessage("Creando tu historia…");
    try {
      const blob = await storyBlob(stats, qrSvg, progress, template);
      const file = new File(
        [blob],
        `nova-gym-${template}-${stats.username}.png`,
        {
          type: "image/png",
        },
      );
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Mi progreso en Nova Gym",
          text: `Entrena conmigo en Nova Gym: ${shareUrl}`,
          files: [file],
        });
        setMessage("Historia lista para compartir.");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage("Historia descargada. Ya puedes subirla a tus redes.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        setMessage("");
      else setMessage("No pudimos generar la historia. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
      <article
        id="mi-qr"
        className="relative scroll-mt-24 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_50%_15%,rgba(163,230,53,.18),transparent_35%),linear-gradient(145deg,#111827,#070b12)] p-5 text-center shadow-[0_28px_90px_rgba(0,0,0,.24)] sm:p-7"
      >
        <div className="mx-auto flex max-w-sm flex-col items-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300">
            <QrCode size={24} />
          </span>
          <p className="mt-4 text-[10px] font-black tracking-[.18em] text-lime-300">
            TU CONEXIÓN NOVA
          </p>
          <h2 className="mt-1 text-2xl font-black">Entrena conmigo</h2>
          <p className="mt-2 text-sm muted">
            Escanea este código para conectar como amigos.
          </p>
          <div className="relative mx-auto mt-6 aspect-square w-full max-w-[252px] rounded-[34px] bg-gradient-to-br from-lime-300 via-white to-cyan-300 p-[3px] shadow-[0_0_65px_rgba(163,230,53,.16)]">
            <div
              className="h-full w-full rounded-[31px] bg-white p-5 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-4 border-white bg-slate-950 text-[10px] font-black text-lime-300 shadow-lg">
              NOVA
            </span>
          </div>
          <span className="mt-4 rounded-full border border-white/10 bg-white/[.05] px-4 py-2 text-xs font-black">
            @{stats.username}
          </span>
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/50 p-3 text-sm font-bold"
            >
              <Copy size={17} />
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
            <button
              onClick={() => setScanner(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white p-3 text-sm font-black text-slate-950"
            >
              <Camera size={17} />
              Escanear
            </button>
          </div>
        </div>
      </article>
      <article className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(251,146,60,.13),transparent_30%),radial-gradient(circle_at_100%_70%,rgba(34,211,238,.12),transparent_35%),#0f172a] shadow-[0_28px_90px_rgba(0,0,0,.24)]">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-300/20 bg-orange-300/10 text-orange-300">
              <Sparkles size={21} />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-[.18em] text-orange-300">
                NOVA STORY STUDIO
              </p>
              <h2 className="mt-1 text-3xl font-black">
                Haz visible tu constancia.
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed muted">
                Elige una composición, revisa la vista previa y compártela en
                formato vertical para Instagram, WhatsApp o tus estados.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/[.07] bg-slate-950/45 p-3">
            <p className="px-1 text-[9px] font-black tracking-[.16em] text-slate-500">
              ELIGE TU HISTORIA
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplate("analytics")}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${template === "analytics" ? "border-lime-300/45 bg-lime-300/10 text-white" : "border-white/[.06] bg-slate-950/50 text-slate-400"}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-300/10 text-lime-300">
                  <BarChart3 size={19} />
                </span>
                <span>
                  <strong className="block text-sm">Impacto 360°</strong>
                  <small className="text-[9px]">Dona + evolución</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTemplate("calendar")}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${template === "calendar" ? "border-cyan-300/45 bg-cyan-300/10 text-white" : "border-white/[.06] bg-slate-950/50 text-slate-400"}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
                  <CalendarRange size={19} />
                </span>
                <span>
                  <strong className="block text-sm">Mi calendario</strong>
                  <small className="text-[9px]">Mes en colores</small>
                </span>
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-[30px] border border-white/[.06] bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-400">
                <LayoutTemplate size={15} className="text-lime-300" />
                VISTA PREVIA
              </span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[8px] font-bold text-slate-500">
                1080 × 1920
              </span>
            </div>
            <StoryPreview
              stats={stats}
              progress={progress}
              template={template}
              qrSvg={qrSvg}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <span className="rounded-2xl border border-lime-300/10 bg-lime-300/[.05] p-3">
              <strong className="block text-xl text-lime-300">
                {stats.monthAttendances}
              </strong>
              <small className="text-[9px] text-slate-500">este mes</small>
            </span>
            <span className="rounded-2xl border border-orange-300/10 bg-orange-300/[.05] p-3">
              <strong className="block text-xl text-orange-300">
                {stats.streak}
              </strong>
              <small className="text-[9px] text-slate-500">racha</small>
            </span>
            <span className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.05] p-3">
              <strong className="block text-xl text-cyan-300">
                {stats.totalHours}h
              </strong>
              <small className="text-[9px] text-slate-500">entrenando</small>
            </span>
          </div>
          <button
            disabled={busy}
            onClick={shareStory}
            className="btn mt-5 w-full gap-2 py-4 text-base shadow-[0_14px_40px_rgba(163,230,53,.14)]"
          >
            <Share2 size={19} />
            {busy
              ? "Diseñando tu historia…"
              : template === "calendar"
                ? "Compartir mi calendario"
                : "Compartir mi progreso"}
          </button>
          <p className="mt-3 text-center text-[10px] text-slate-500">
            Solo incluye estadísticas públicas y tu QR. Nunca fotos ni
            ubicación.
          </p>
          {message && (
            <p
              role="status"
              className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-lime-300"
            >
              {message.includes("descargada") ? (
                <Download size={14} />
              ) : (
                <Check size={14} />
              )}{" "}
              {message}
            </p>
          )}
        </div>
      </article>
      {scanner && <Scanner close={() => setScanner(false)} />}
    </section>
  );
}
