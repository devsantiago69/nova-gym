"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Copy,
  Download,
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

async function storyBlob(stats: SocialStats, qrSvg: string) {
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
  context.font = "900 78px system-ui";
  context.fillText(stats.name.slice(0, 23), 80, 330);
  context.fillStyle = "#a3e635";
  context.font = "700 34px system-ui";
  context.fillText(`@${stats.username}`, 80, 385);
  context.fillStyle = "#ffffff";
  context.font = "900 190px system-ui";
  context.fillText(String(stats.streak), 75, 680);
  context.fillStyle = "#fb923c";
  context.font = "900 42px system-ui";
  context.fillText(
    stats.streak === 1 ? "DÍA DE RACHA" : "DÍAS DE RACHA",
    85,
    750,
  );
  const cards: ReadonlyArray<readonly [string, string]> = [
    [String(stats.attendances), "ASISTENCIAS"],
    [String(stats.totalHours), "HORAS ENTRENANDO"],
    [String(stats.globalPoints), "PUNTOS GLOBALES"],
    [String(stats.challengePoints), "PUNTOS EN RETOS"],
  ];
  cards.forEach(([value, label], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 70 + column * 480;
    const y = 845 + row * 230;
    context.fillStyle = "rgba(15,23,42,.88)";
    roundedRect(context, x, y, 440, 190, 36);
    context.fillStyle =
      index === 0
        ? "#a3e635"
        : index === 1
          ? "#22d3ee"
          : index === 2
            ? "#facc15"
            : "#c084fc";
    context.font = "900 64px system-ui";
    context.fillText(value, x + 35, y + 82);
    context.fillStyle = "#cbd5e1";
    context.font = "800 22px system-ui";
    context.fillText(label, x + 35, y + 130);
  });
  context.fillStyle = "#ffffff";
  context.font = "900 36px system-ui";
  context.fillText(
    `${stats.monthAttendances} entrenamientos este mes`,
    75,
    1390,
  );
  context.fillStyle = "#94a3b8";
  context.font = "600 26px system-ui";
  context.fillText(
    `${stats.friends} amigos · ${stats.activeChallenges} retos activos`,
    75,
    1440,
  );
  const qrImage = new Image();
  qrImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`;
  await qrImage.decode();
  context.fillStyle = "#ffffff";
  roundedRect(context, 70, 1530, 270, 270, 30);
  context.drawImage(qrImage, 85, 1545, 240, 240);
  context.fillStyle = "#ffffff";
  context.font = "900 34px system-ui";
  context.fillText("ESCANEA Y ENTRENA CONMIGO", 390, 1625);
  context.fillStyle = "#a3e635";
  context.font = "700 26px system-ui";
  context.fillText("Conecta conmigo en Nova Gym", 390, 1680);
  context.fillStyle = "#64748b";
  context.font = "600 22px system-ui";
  context.fillText("Fotos y ubicación siempre privadas", 390, 1730);
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

export function ProfileSocialHub({
  qrSvg,
  shareUrl,
  stats,
}: {
  qrSvg: string;
  shareUrl: string;
  stats: SocialStats;
}) {
  const [scanner, setScanner] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
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
      const blob = await storyBlob(stats, qrSvg);
      const file = new File([blob], `nova-gym-${stats.username}.png`, {
        type: "image/png",
      });
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
      <article className="overflow-hidden rounded-[32px] border border-slate-700 bg-slate-900">
        <div className="relative bg-gradient-to-br from-orange-400/15 via-slate-900 to-lime-400/10 p-6 sm:p-8">
          <Sparkles className="text-orange-300" />
          <p className="mt-5 text-xs font-black tracking-[.18em] text-orange-300">
            STORY DE PROGRESO
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Tu disciplina merece verse.
          </h2>
          <p className="mt-2 max-w-lg muted">
            Genera una historia vertical con tu racha, asistencias, horas y
            puntos. Incluye tu QR para que tus amigos conecten contigo.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <span className="rounded-2xl bg-slate-950/70 p-3">
              <strong className="block text-2xl text-lime-300">
                {stats.attendances}
              </strong>
              <small className="muted">asistencias</small>
            </span>
            <span className="rounded-2xl bg-slate-950/70 p-3">
              <strong className="block text-2xl text-orange-300">
                {stats.streak}
              </strong>
              <small className="muted">racha</small>
            </span>
            <span className="rounded-2xl bg-slate-950/70 p-3">
              <strong className="block text-2xl text-cyan-300">
                {stats.totalHours}h
              </strong>
              <small className="muted">entrenando</small>
            </span>
          </div>
          <button
            disabled={busy}
            onClick={shareStory}
            className="btn mt-6 w-full gap-2 py-4 text-base"
          >
            <Share2 size={19} />
            {busy ? "Creando historia…" : "Compartir mi progreso"}
          </button>
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
