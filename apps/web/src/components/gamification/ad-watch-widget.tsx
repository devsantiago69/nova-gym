"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, Sparkles } from "lucide-react";
import { AdSlot, adsenseConfigured } from "@/components/gamification/ad-slot";

const COUNTDOWN_SECONDS = Number(process.env.NEXT_PUBLIC_AD_COUNTDOWN_SECONDS ?? 15);

type Stage = "idle" | "watching" | "claimed" | "limited";

export function AdWatchWidget() {
  const [stage, setStage] = useState<Stage>("idle");
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(0);
  const ready = stage === "watching" && secondsLeft <= 0;

  useEffect(() => {
    if (stage !== "watching" || secondsLeft <= 0) return;
    const timeout = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1_000);
    return () => window.clearTimeout(timeout);
  }, [stage, secondsLeft]);

  if (!adsenseConfigured()) return null;

  function watch() {
    startedAt.current = Date.now();
    setSecondsLeft(COUNTDOWN_SECONDS);
    setMessage("");
    setStage("watching");
  }

  async function claim() {
    setBusy(true);
    setMessage("");
    try {
      const watchedSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      const response = await fetch("/api/v1/gamification/ads/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot: "profile-rewarded", watchedSeconds }),
      });
      const result = (await response.json()) as {
        message: string;
        data?: { xpAwarded: number; remainingToday: number };
        errors?: Array<{ message: string }>;
      };
      if (response.status === 429) {
        setStage("limited");
        setMessage("Ya alcanzaste el límite de anuncios de hoy. Vuelve mañana por más XP.");
        return;
      }
      if (!response.ok || !result.data) {
        setMessage(result.errors?.[0]?.message ?? result.message);
        setStage("idle");
        return;
      }
      setMessage(`+${result.data.xpAwarded} XP. Puedes ver otro anuncio cuando quieras.`);
      setStage(result.data.remainingToday > 0 ? "idle" : "limited");
    } catch {
      setMessage("No pudimos confirmar el anuncio. Intenta nuevamente.");
      setStage("idle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.14),transparent_42%),rgba(15,23,42,.6)] p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/15 text-cyan-200">
          <Clapperboard size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="text-lg">Gana XP viendo un anuncio</strong>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            Apoya a Nova Gym viendo un anuncio corto y suma experiencia extra.
          </p>
          {stage === "watching" && (
            <div className="mt-4">
              <AdSlot />
              {!ready && (
                <p className="mt-3 text-xs font-bold text-cyan-200">
                  Espera {secondsLeft}s para poder reclamar tu recompensa…
                </p>
              )}
            </div>
          )}
          <div className="mt-4">
            {stage === "idle" && (
              <button
                type="button"
                onClick={watch}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-5 py-3 font-black text-cyan-100 transition hover:bg-cyan-300/20"
              >
                <Clapperboard size={17} />
                Ver anuncio
              </button>
            )}
            {ready && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void claim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-lime-300/30 bg-lime-400/15 px-5 py-3 font-black text-lime-100 transition hover:bg-lime-400/25 disabled:opacity-60"
              >
                <Sparkles size={17} />
                {busy ? "Confirmando…" : "Reclamar XP"}
              </button>
            )}
          </div>
        </div>
      </div>
      {message && (
        <p role="status" className="mt-4 rounded-xl bg-slate-950/60 p-3 text-sm text-cyan-100">
          {message}
        </p>
      )}
    </div>
  );
}
