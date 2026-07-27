"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gift, PartyPopper } from "lucide-react";
import { ConfettiBurst } from "@/components/attendance/confetti-burst";

export function StreakClaimWidget({
  claimableTiers,
  streakLength,
  xpPerTier,
}: {
  claimableTiers: number;
  streakLength: number;
  xpPerTier: number;
}) {
  const router = useRouter();
  const [claimable, setClaimable] = useState(claimableTiers);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  if (claimable <= 0) return null;

  async function claim() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/gamification/streak/claim", { method: "POST" });
      const result = (await response.json()) as {
        message: string;
        data?: { tiersClaimed: number[]; xpAwarded: number };
        errors?: Array<{ message: string }>;
      };
      if (!response.ok || !result.data) {
        setMessage(result.errors?.[0]?.message ?? result.message);
        return;
      }
      setClaimable((current) => Math.max(0, current - result.data!.tiersClaimed.length));
      setMessage(`+${result.data.xpAwarded} XP por tu racha de ${streakLength} días.`);
      setCelebrate(true);
      router.refresh();
    } catch {
      setMessage("No pudimos reclamar tu recompensa. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-orange-400/25 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,.18),transparent_42%),rgba(15,23,42,.6)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-400/15 text-orange-300">
            <Gift size={23} />
          </span>
          <div>
            <strong className="text-lg">¡Racha de {streakLength} días lista para reclamar!</strong>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-slate-300">
              Cada 2 días consecutivos de entrenamiento ganas <b className="text-orange-300">+{xpPerTier} XP</b>. Tienes {claimable} recompensa{claimable === 1 ? "" : "s"} pendiente{claimable === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void claim()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-orange-300/30 bg-orange-400/15 px-5 py-3.5 font-black text-orange-100 transition hover:bg-orange-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PartyPopper size={18} />
          {busy ? "Reclamando…" : "Reclamar recompensa"}
        </button>
      </div>
      {message && (
        <p role="status" className="mt-4 rounded-xl bg-slate-950/60 p-3 text-sm text-orange-200">
          {message}
        </p>
      )}
      {celebrate && <ConfettiBurst onDone={() => setCelebrate(false)} />}
    </div>
  );
}
