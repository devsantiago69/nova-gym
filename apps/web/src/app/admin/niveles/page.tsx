import { prisma } from "@gymchallenge/database";
import { LevelManager } from "@/components/admin/level-manager";
import { topLeaderboard } from "@/modules/gamification/leaderboard";

export default async function LevelsPage() {
  const [levels, leaderboard] = await Promise.all([
    prisma.levelDefinition.findMany({ orderBy: { level: "asc" } }),
    topLeaderboard(25, 0),
  ]);
  return (
    <section>
      <p className="text-xs font-black text-violet-300">GAMIFICACIÓN</p>
      <h1 className="mt-1 text-3xl font-black sm:text-4xl">Niveles y ranking</h1>
      <p className="mb-7 mt-2 muted">
        Define la curva de experiencia de Nova Gym y observa quién lidera el ranking global.
      </p>
      <LevelManager
        initialLevels={levels.map((level) => ({
          ...level,
          createdAt: level.createdAt.toISOString(),
          updatedAt: level.updatedAt.toISOString(),
        }))}
        initialLeaderboard={leaderboard}
      />
    </section>
  );
}
