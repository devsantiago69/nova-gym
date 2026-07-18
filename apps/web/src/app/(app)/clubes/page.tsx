import { getServerSession } from "next-auth";
import { Building2, Sparkles, Trophy, UsersRound } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import {
  ClubDirectory,
  type ClubSummary,
} from "@/components/clubs/club-directory";
import { authOptions } from "@/lib/auth";

export default async function ClubsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const clubs = await prisma.club.findMany({
    where: {
      OR: [
        { visibility: { not: "PRIVATE" } },
        {
          memberships: {
            some: { userId, status: { in: ["ACTIVE", "INVITED"] } },
          },
        },
      ],
    },
    include: {
      owner: {
        select: {
          username: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      memberships: { where: { userId }, select: { status: true }, take: 1 },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const summaries: ClubSummary[] = clubs.map((club) => ({
    id: club.id,
    slug: club.slug,
    name: club.name,
    description: club.description,
    type: club.type,
    visibility: club.visibility,
    city: club.city,
    department: club.department,
    discipline: club.discipline,
    disciplines: club.disciplines,
    latitude: club.latitude?.toString() ?? null,
    longitude: club.longitude?.toString() ?? null,
    accentColor: club.accentColor,
    memberCount: club._count.memberships,
    membershipStatus: club.memberships[0]?.status ?? null,
    ownerName:
      `${club.owner.profile?.firstName ?? ""} ${club.owner.profile?.lastName ?? ""}`.trim() ||
      club.owner.username,
    avatarUrl: club.avatarKey ? `/api/v1/clubs/${club.id}/avatar` : null,
  }));
  const mine = summaries.filter(
    (club) => club.membershipStatus === "ACTIVE",
  ).length;
  return (
    <main className="space-y-7 pb-10">
      <header className="relative overflow-hidden rounded-[32px] border border-cyan-400/15 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.18),transparent_32%),radial-gradient(circle_at_5%_90%,rgba(163,230,53,.12),transparent_30%),linear-gradient(145deg,#111827,#070b12)] p-6 sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black tracking-[.15em] text-cyan-200">
          <Sparkles size={14} />
          CLUBES NOVA
        </span>
        <h1 className="mt-4 max-w-3xl text-4xl font-black sm:text-5xl">
          Encuentra a los tuyos.
        </h1>
        <p className="mt-3 max-w-2xl muted">
          Conecta por gimnasio, ciudad o disciplina. Entrenen, compitan y
          construyan una identidad juntos.
        </p>
        <div className="mt-6 grid max-w-md grid-cols-3 gap-2">
          <span className="rounded-2xl bg-black/20 p-3">
            <Building2 size={17} className="text-cyan-300" />
            <strong className="mt-2 block text-xl">{summaries.length}</strong>
            <small className="text-slate-500">clubes</small>
          </span>
          <span className="rounded-2xl bg-black/20 p-3">
            <UsersRound size={17} className="text-lime-300" />
            <strong className="mt-2 block text-xl">{mine}</strong>
            <small className="text-slate-500">mis clubes</small>
          </span>
          <span className="rounded-2xl bg-black/20 p-3">
            <Trophy size={17} className="text-orange-300" />
            <strong className="mt-2 block text-xl">7 días</strong>
            <small className="text-slate-500">ranking</small>
          </span>
        </div>
      </header>
      <ClubDirectory initial={summaries} />
    </main>
  );
}
