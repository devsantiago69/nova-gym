import Link from "next/link";
import {
  ChevronRight,
  Cog,
  Crown,
  Flame,
  Gem,
  Mountain,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkle,
  Star,
  Sword,
  Trophy,
  Zap,
} from "lucide-react";

const ICONS: Record<string, typeof Trophy> = {
  Sparkle,
  Flame,
  Sword,
  Zap,
  Shield,
  Cog,
  Mountain,
  Trophy,
  ShieldCheck,
  Rocket,
  Crown,
  Star,
  Gem,
};

type LevelInfo = {
  level: number;
  title: string;
  icon: string | null;
  colorFrom: string | null;
  colorTo: string | null;
  xpThreshold: number;
};

export function ProfileLevelCard({
  level,
  nextLevel,
  progress,
  totalXp,
  rank,
}: {
  level: LevelInfo | null;
  nextLevel: LevelInfo | null;
  progress: number;
  totalXp: number;
  rank: number | null;
}) {
  if (!level) return null;
  const Icon = ICONS[level.icon ?? ""] ?? Trophy;
  const gradient = `linear-gradient(135deg, ${level.colorFrom ?? "#a3e635"}, ${level.colorTo ?? "#22d3ee"})`;

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white/[.08] bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,.1),transparent_34%),rgba(10,18,32,.78)] p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.18)]"
            style={{ background: gradient }}
          >
            <Icon size={26} />
          </span>
          <div>
            <p className="text-[10px] font-black tracking-[.14em] text-lime-300">
              NIVEL {level.level}
            </p>
            <h2 className="mt-1 text-2xl font-black">{level.title}</h2>
            <p className="mt-1 text-xs muted">
              {totalXp.toLocaleString("es-CO")} XP
              {rank ? ` · #${rank} en el ranking` : ""}
            </p>
          </div>
        </div>
        <Link
          href="/ranking"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-lime-300"
        >
          Ver ranking <ChevronRight size={14} />
        </Link>
      </div>
      <div className="mt-5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.round(progress * 100)}%`, background: gradient }}
          />
        </div>
        <p className="mt-2 text-[11px] font-bold text-slate-400">
          {nextLevel
            ? `${totalXp.toLocaleString("es-CO")} / ${nextLevel.xpThreshold.toLocaleString("es-CO")} XP para nivel ${nextLevel.level} — ${nextLevel.title}`
            : "Nivel máximo alcanzado. ¡Eres una leyenda de Nova Gym!"}
        </p>
      </div>
    </section>
  );
}
