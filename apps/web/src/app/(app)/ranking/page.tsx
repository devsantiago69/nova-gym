import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { topLeaderboard, rankOf } from "@/modules/gamification/leaderboard";

export default async function RankingPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const [rows, me] = await Promise.all([topLeaderboard(100, 0), rankOf(userId)]);
  const avatarKeys = await prisma.userProfile.findMany({
    where: { userId: { in: rows.map((row) => row.userId) }, avatarKey: { not: null } },
    select: { userId: true },
  });
  const hasAvatar = new Set(avatarKeys.map((row) => row.userId));

  return (
    <section>
      <Link href="/perfil" className="inline-flex items-center gap-1 text-xs font-black text-lime-300">
        <ChevronLeft size={14} /> Volver a mi perfil
      </Link>
      <p className="mt-4 text-sm font-bold text-lime-400">RANKING GLOBAL</p>
      <h1 className="mt-1 text-3xl font-black sm:text-4xl">Top Nova Gym</h1>
      <p className="mb-6 mt-2 muted">
        Tu posición: <strong className="text-lime-300">#{me.rank}</strong> con {me.totalXp.toLocaleString("es-CO")} XP.
      </p>
      <div className="overflow-hidden rounded-[28px] border border-white/[.08] bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,.09),transparent_34%),rgba(10,18,32,.78)] backdrop-blur-xl">
        {rows.map((row) => {
          const isMe = row.userId === userId;
          return (
            <div
              key={row.userId}
              className={`flex items-center gap-4 border-b border-white/[.05] p-4 last:border-b-0 ${isMe ? "bg-lime-400/[.06]" : ""}`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${
                  row.rank === 1
                    ? "bg-yellow-300 text-slate-950"
                    : row.rank === 2
                      ? "bg-slate-300 text-slate-950"
                      : row.rank === 3
                        ? "bg-orange-400 text-slate-950"
                        : "bg-slate-800 text-slate-300"
                }`}
              >
                {row.rank}
              </span>
              {hasAvatar.has(row.userId) ? (
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10">
                  <Image
                    src={`/api/v1/profile/avatar/${row.userId}`}
                    alt={row.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-lime-300 to-cyan-300 text-sm font-black text-slate-950">
                  {row.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <strong className="block truncate">{row.name}</strong>
                <span className="text-xs muted">@{row.username}</span>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold sm:inline-flex">
                <Trophy size={12} className="text-orange-300" />
                {row.level ? `${row.level.title}` : "—"}
              </span>
              <strong className="shrink-0 text-cyan-300">{row.totalXp.toLocaleString("es-CO")}</strong>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm muted">Aún no hay usuarios con XP registrado.</p>
        )}
      </div>
    </section>
  );
}
