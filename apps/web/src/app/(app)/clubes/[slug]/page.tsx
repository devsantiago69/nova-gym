import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  Crown,
  Dumbbell,
  ExternalLink,
  Flame,
  MapPin,
  Medal,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { prisma } from "@gymchallenge/database";
import {
  ClubDetailActions,
  type ClubFriendInviteDto,
  type ClubMemberAdminDto,
  type ClubSettingsDto,
} from "@/components/clubs/club-detail-actions";
import {
  ClubSocialHub,
  type ClubTrainingDto,
} from "@/components/clubs/club-social-hub";
import { authOptions } from "@/lib/auth";
import { socialFeed } from "@/modules/social/feed";

function mondayStart() {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}
export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const { slug } = await params;
  const query = await searchParams;
  const weekStart = mondayStart();
  const club = await prisma.club.findUnique({
    where: { slug },
    include: {
      memberships: {
        where: { status: { in: ["ACTIVE", "PENDING", "INVITED"] } },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: { firstName: true, lastName: true, avatarKey: true },
              },
              attendances: {
                where: {
                  status: "COMPLETED",
                  invalidatedAt: null,
                  localDate: { gte: weekStart },
                },
                select: { id: true, durationMinutes: true },
              },
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      sessions: {
        where: { startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        include: {
          creator: {
            select: {
              username: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          participants: {
            where: { status: { in: ["GOING", "WAITLIST"] } },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: { firstName: true, lastName: true, avatarKey: true },
                  },
                },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
        orderBy: [{ status: "asc" }, { startsAt: "asc" }],
        take: 30,
      },
    },
  });
  if (!club) notFound();
  const mine =
    club.memberships.find((member) => member.userId === userId) ?? null;
  if (
    club.visibility === "PRIVATE" &&
    !mine?.status.match(/^(ACTIVE|INVITED)$/)
  )
    notFound();
  const active = club.memberships.filter(
    (member) => member.status === "ACTIVE",
  );
  const ranking = active
    .map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      username: member.user.username,
      name:
        `${member.user.profile?.firstName ?? ""} ${member.user.profile?.lastName ?? ""}`.trim() ||
        member.user.username,
      avatarUrl: member.user.profile?.avatarKey
        ? `/api/v1/profile/avatar/${member.userId}`
        : null,
      workouts: member.user.attendances.length,
      minutes: member.user.attendances.reduce(
        (sum, row) => sum + (row.durationMinutes ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.workouts - a.workouts || b.minutes - a.minutes);
  const canManage =
    mine?.status === "ACTIVE" && ["OWNER", "ADMIN"].includes(mine.role);
  const memberFeed = mine?.status === "ACTIVE" ? await socialFeed(userId, 20, club.id) : [];
  const clubSessions: ClubTrainingDto[] = club.sessions.map((training) => {
    const creatorName =
      `${training.creator.profile?.firstName ?? ""} ${training.creator.profile?.lastName ?? ""}`.trim() ||
      training.creator.username;
    const going = training.participants.filter((row) => row.status === "GOING");
    const mineInSession = training.participants.find((row) => row.userId === userId);
    return {
      id: training.id,
      title: training.title,
      description: training.description,
      startsAt: training.startsAt.toISOString(),
      durationMinutes: training.durationMinutes,
      placeName: training.placeName,
      address: training.address,
      latitude: training.latitude?.toString() ?? null,
      longitude: training.longitude?.toString() ?? null,
      capacity: training.capacity,
      status: training.status,
      isCreator: training.creatorId === userId,
      canManage: training.creatorId === userId || Boolean(canManage),
      myStatus: mineInSession?.status ?? null,
      going: going.length,
      waiting: training.participants.filter((row) => row.status === "WAITLIST").length,
      creatorName,
      participants: going.map((row) => {
        const name =
          `${row.user.profile?.firstName ?? ""} ${row.user.profile?.lastName ?? ""}`.trim() ||
          row.user.username;
        return {
          id: row.user.id,
          name,
          username: row.user.username,
          avatarUrl: row.user.profile?.avatarKey
            ? `/api/v1/profile/avatar/${row.user.id}`
            : null,
        };
      }),
    };
  });
  const requests = canManage
    ? club.memberships
        .filter((member) => member.status === "PENDING")
        .map((member) => ({
          id: member.id,
          username: member.user.username,
          name:
            `${member.user.profile?.firstName ?? ""} ${member.user.profile?.lastName ?? ""}`.trim() ||
            member.user.username,
        }))
    : [];
  const adminMembers: ClubMemberAdminDto[] = active.map((member) => ({
    membershipId: member.id,
    userId: member.userId,
    role: member.role,
    username: member.user.username,
    name:
      `${member.user.profile?.firstName ?? ""} ${member.user.profile?.lastName ?? ""}`.trim() ||
      member.user.username,
    avatarUrl: member.user.profile?.avatarKey
      ? `/api/v1/profile/avatar/${member.userId}`
      : null,
  }));
  const friendshipRows = canManage
    ? await prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              profile: {
                select: { firstName: true, lastName: true, avatarKey: true },
              },
            },
          },
          addressee: {
            select: {
              id: true,
              username: true,
              profile: {
                select: { firstName: true, lastName: true, avatarKey: true },
              },
            },
          },
        },
      })
    : [];
  const inviteFriends: ClubFriendInviteDto[] = friendshipRows.map((row) => {
    const person = row.requesterId === userId ? row.addressee : row.requester;
    const relatedMembership = club.memberships.find(
      (member) => member.userId === person.id,
    );
    return {
      userId: person.id,
      username: person.username,
      name:
        `${person.profile?.firstName ?? ""} ${person.profile?.lastName ?? ""}`.trim() ||
        person.username,
      avatarUrl: person.profile?.avatarKey
        ? `/api/v1/profile/avatar/${person.id}`
        : null,
      membershipStatus: relatedMembership?.status ?? null,
    };
  });
  const clubSettings: ClubSettingsDto = {
    name: club.name,
    description: club.description,
    type: club.type,
    visibility: club.visibility,
    country: club.country,
    department: club.department,
    city: club.city,
    discipline: club.discipline,
    disciplines: club.disciplines,
    accentColor: club.accentColor,
    memberLimit: club.memberLimit,
    latitude: club.latitude?.toString() ?? null,
    longitude: club.longitude?.toString() ?? null,
    avatarUrl: club.avatarKey ? `/api/v1/clubs/${club.id}/avatar` : null,
  };
  return (
    <main className="space-y-6 pb-10">
      <Link
        href="/clubes"
        className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-4 py-2 text-sm font-bold text-slate-300"
      >
        <ArrowLeft size={16} />
        Todos los clubes
      </Link>
      <header className="relative isolate overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,.22),transparent_32%),radial-gradient(circle_at_5%_80%,rgba(163,230,53,.15),transparent_30%),linear-gradient(145deg,#111827,#070b12)] p-6 sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <span className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-white/[.07] text-cyan-300 shadow-xl">
            <Dumbbell size={42} />
            {club.avatarKey ? (
              <Image
                src={`/api/v1/clubs/${club.id}/avatar`}
                alt={`Foto de ${club.name}`}
                fill
                unoptimized
                className="object-cover"
              />
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-[.16em] text-cyan-300">
              {club.type} · {club.visibility}
            </p>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">
              {club.name}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-300">{club.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-3 py-2">
                <UsersRound size={14} />
                {active.length} integrantes
              </span>
              {club.city ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-3 py-2">
                  <MapPin size={14} />
                  {club.city}
                </span>
              ) : null}
              {club.discipline ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-3 py-2">
                  <Flame size={14} />
                  {club.discipline}
                </span>
              ) : null}
              {club.disciplines
                .filter((item) => item !== club.discipline)
                .slice(0, 4)
                .map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-3 py-2"
                  >
                    <Flame size={14} />
                    {item}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </header>
      {club.latitude && club.longitude ? (
        <section className="flex flex-col gap-4 rounded-[28px] border border-lime-300/20 bg-gradient-to-r from-lime-300/[.08] to-cyan-300/[.05] p-5 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-300 text-slate-950">
            <MapPin size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-[.14em] text-lime-300">
              PUNTO DEL CLUB
            </p>
            <h2 className="mt-1 font-black">
              {club.city ?? "Ubicación confirmada"}
              {club.department ? `, ${club.department}` : ""}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Abre el punto guardado por el administrador del club.
            </p>
          </div>
          <a
            href={`https://www.google.com/maps?q=${club.latitude.toString()},${club.longitude.toString()}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-lime-300/30 px-4 py-3 text-xs font-black text-lime-300"
          >
            Ver en el mapa <ExternalLink size={15} />
          </a>
        </section>
      ) : null}
      {mine?.status === "ACTIVE" ? (
        <ClubSocialHub
          clubId={club.id}
          initialFeed={memberFeed}
          initialSessions={clubSessions}
          initialTab={query.tab === "sessions" ? "sessions" : "feed"}
        />
      ) : (
        <section className="rounded-[28px] border border-dashed border-cyan-300/20 bg-cyan-300/[.04] p-8 text-center">
          <ShieldCheck className="mx-auto text-cyan-300" />
          <h2 className="mt-3 text-xl font-black">El vestuario abre al entrar</h2>
          <p className="mt-2 text-sm muted">
            Únete para acceder al feed privado y confirmar sesiones con el equipo.
          </p>
        </section>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-[30px] border border-slate-800 bg-slate-900/75">
          <div className="flex items-start justify-between border-b border-slate-800 p-5 sm:p-6">
            <div>
              <p className="text-[10px] font-black tracking-[.14em] text-lime-300">
                CLASIFICACIÓN SEMANAL
              </p>
              <h2 className="mt-1 text-2xl font-black">El pulso del club</h2>
              <p className="mt-1 text-xs muted">
                Se reinicia cada lunes con asistencias verificadas.
              </p>
            </div>
            <Trophy className="text-orange-300" />
          </div>
          <div className="space-y-2 p-4 sm:p-5">
            {ranking.map((member, index) => (
              <article
                key={member.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${member.userId === userId ? "border-lime-300/30 bg-lime-300/[.06]" : "border-slate-800 bg-slate-950/50"}`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 0 ? "bg-orange-300 text-slate-950" : index === 1 ? "bg-slate-300 text-slate-950" : index === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"}`}
                >
                  {index < 3 ? <Medal size={16} /> : index + 1}
                </span>
                <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-lime-300 to-cyan-300 font-black text-slate-950">
                  {member.name.charAt(0)}
                  {member.avatarUrl ? (
                    <Image
                      src={member.avatarUrl}
                      alt={`Foto de ${member.name}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <strong className="truncate text-sm">{member.name}</strong>
                    {member.role === "OWNER" ? (
                      <Crown size={13} className="text-orange-300" />
                    ) : null}
                  </span>
                  <small className="text-slate-500">
                    @{member.username} · {member.minutes} min
                  </small>
                </span>
                <span className="text-right">
                  <strong className="block text-xl text-lime-300">
                    {member.workouts}
                  </strong>
                  <small className="text-[9px] text-slate-500">entrenos</small>
                </span>
              </article>
            ))}
            {!ranking.length ? (
              <p className="p-8 text-center muted">
                El ranking comienza con la primera asistencia del equipo.
              </p>
            ) : null}
          </div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-[28px] border border-cyan-400/15 bg-cyan-400/[.05] p-5">
            <ShieldCheck className="text-cyan-300" />
            <h2 className="mt-3 text-xl font-black">Vestuario privado</h2>
            <p className="mt-2 text-sm muted">
              Solo integrantes activos podrán acceder a publicaciones,
              temporadas y sesiones del club.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <span className="rounded-2xl bg-slate-950/60 p-3">
                <CalendarCheck size={16} className="text-lime-300" />
                <strong className="mt-2 block">
                  {ranking.reduce((sum, row) => sum + row.workouts, 0)}
                </strong>
                <small className="text-slate-500">esta semana</small>
              </span>
              <span className="rounded-2xl bg-slate-950/60 p-3">
                <UsersRound size={16} className="text-cyan-300" />
                <strong className="mt-2 block">{active.length}</strong>
                <small className="text-slate-500">miembros</small>
              </span>
            </div>
          </section>
          <ClubDetailActions
            clubId={club.id}
            membership={mine ? { status: mine.status, role: mine.role } : null}
            requests={requests}
            members={adminMembers}
            friends={inviteFriends}
            settings={clubSettings}
          />
        </aside>
      </div>
    </main>
  );
}
