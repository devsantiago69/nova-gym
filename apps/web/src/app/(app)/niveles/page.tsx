import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowLeft, Crown, Flame, Gem, Lock, Rocket, Shield, ShieldCheck, Sparkle, Star, Sword, Trophy, Zap, Cog, Mountain } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { cachedLevels, totalXp, levelForXp } from "@/modules/gamification/xp";
import { rankOf } from "@/modules/gamification/leaderboard";

const ICONS: Record<string, typeof Trophy> = {
  Sparkle, Flame, Sword, Zap, Shield, Cog, Mountain, Trophy, ShieldCheck, Rocket, Crown, Star, Gem,
};

export default async function NivelesPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const [levels, xpTotal, rankData] = await Promise.all([
    cachedLevels(),
    totalXp(userId),
    rankOf(userId),
  ]);

  const sorted = [...levels].sort((a, b) => a.xpThreshold - b.xpThreshold);
  const { current, next, progress } = levelForXp(xpTotal, sorted);
  const maxLevel = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const isMaxLevel = !next;

  return (
    <section className="pb-12">
      <Link
        href="/perfil"
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-lime-300 hover:text-white"
      >
        <ArrowLeft size={16} />
        Volver a mi perfil
      </Link>

      <div className="mt-2 overflow-hidden rounded-[28px] border border-white/[.08] bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,.09),transparent_34%),rgba(10,18,32,.78)] p-5 backdrop-blur-xl sm:p-7">
        <p className="text-[10px] font-black tracking-[.14em] text-lime-300">PROGRESIÓN</p>
        <h1 className="mt-1 text-3xl font-black sm:text-4xl">Tu camino de niveles</h1>
        <p className="mt-2 muted">Cada entrenamiento te acerca al siguiente nivel. Sigue así.</p>

        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-lime-300/20 bg-lime-300/[.06] p-4">
          <div className="flex items-center gap-3">
            {current ? (
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-slate-950 shadow-[0_0_20px_rgba(163,230,53,.2)]"
                style={{ background: `linear-gradient(135deg, ${current.colorFrom ?? "#a3e635"}, ${current.colorTo ?? "#22d3ee"})` }}
              >
                {(() => { const I = ICONS[current.icon ?? ""] ?? Trophy; return <I size={22} />; })()}
              </span>
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-500">
                <Trophy size={22} />
              </span>
            )}
            <div>
              <p className="text-[10px] font-black tracking-widest text-lime-300">
                NIVEL {current?.level ?? "—"} ACTUAL
              </p>
              <p className="text-lg font-black">{current?.title ?? "Sin nivel"}</p>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-black text-cyan-300">{xpTotal.toLocaleString("es-CO")}</p>
            <p className="text-[10px] font-bold text-slate-400">XP TOTAL{rankData.rank ? ` · #${rankData.rank}` : ""}</p>
          </div>
        </div>

        {!isMaxLevel && next && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>Nivel {current?.level ?? 0}</span>
              <span>Nivel {next.level}</span>
            </div>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: `linear-gradient(90deg, ${current?.colorFrom ?? "#a3e635"}, ${current?.colorTo ?? "#22d3ee"})`,
                }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs font-bold text-slate-400">
              {xpTotal.toLocaleString("es-CO")} / {next.xpThreshold.toLocaleString("es-CO")} XP para <span className="text-lime-300">{next.title}</span>
            </p>
          </div>
        )}
        {isMaxLevel && (
          <div className="mt-4 rounded-xl border border-yellow-300/20 bg-yellow-300/[.06] p-3 text-center">
            <p className="text-sm font-black text-yellow-300">¡Nivel máximo alcanzado! Eres una leyenda de Nova Gym.</p>
          </div>
        )}
      </div>

      <div className="relative mt-8">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-lime-400/40 via-cyan-400/20 to-slate-800/60 sm:left-7" />

        <div className="space-y-1">
          {sorted.map((lvl, index) => {
            const reached = lvl.xpThreshold <= xpTotal;
            const isCurrent = current?.id === lvl.id;
            const isNext = next?.id === lvl.id;
            const Icon = ICONS[lvl.icon ?? ""] ?? Trophy;
            const gradient = `linear-gradient(135deg, ${lvl.colorFrom ?? "#a3e635"}, ${lvl.colorTo ?? "#22d3ee"})`;

            return (
              <div key={lvl.id} className="relative flex items-center gap-4 pl-2 sm:pl-3">
                <div
                  className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full sm:h-12 sm:w-12 ${
                    isCurrent
                      ? "ring-2 ring-lime-400/60 ring-offset-2 ring-offset-[#0a1220]"
                      : ""
                  }`}
                  style={{
                    background: reached ? gradient : "rgb(30 41 59 / 0.8)",
                    boxShadow: isCurrent ? `0 0 24px ${lvl.colorFrom ?? "#a3e635"}40` : undefined,
                  }}
                >
                  {reached ? (
                    <Icon size={18} className="text-slate-950 sm:text-slate-950" />
                  ) : (
                    <Lock size={16} className="text-slate-500" />
                  )}
                </div>

                <div
                  className={`flex flex-1 items-center justify-between rounded-2xl border p-3.5 transition sm:p-4 ${
                    isCurrent
                      ? "border-lime-300/40 bg-lime-300/[.08] shadow-[0_0_30px_rgba(163,230,53,.06)]"
                      : reached
                        ? "border-white/[.06] bg-white/[.02]"
                        : "border-white/[.04] bg-white/[.01] opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-black"
                        style={reached ? { background: gradient, color: "#052e16" } : { background: "rgb(30 41 59)", color: "#64748b" }}
                      >
                        NIVEL {lvl.level}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[9px] font-black text-slate-950">
                          TÚ
                        </span>
                      )}
                      {isNext && (
                        <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] font-black text-cyan-300">
                          SIGUIENTE
                        </span>
                      )}
                    </div>
                    <p className={`mt-1.5 text-sm font-black ${reached ? "text-white" : "text-slate-400"}`}>{lvl.title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-lg font-black ${reached ? "text-cyan-300" : "text-slate-500"}`}>
                      {lvl.xpThreshold.toLocaleString("es-CO")}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500">XP</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 text-center">
            <Trophy size={40} className="mx-auto text-slate-600" />
            <p className="mt-4 text-sm font-bold text-slate-400">Aún no hay niveles configurados.</p>
          </div>
        )}
      </div>
    </section>
  );
}
