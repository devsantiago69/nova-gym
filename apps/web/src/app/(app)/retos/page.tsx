import { getServerSession } from "next-auth";
import { Clock3, Flame, Hourglass, Target, Trophy, UsersRound } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { ChallengeActions } from "@/components/challenges/challenge-actions";
import { ChallengeEvidenceFeed, type ChallengeEvidence } from "@/components/challenges/challenge-evidence-feed";
import { ChallengeTeamPanel } from "@/components/challenges/challenge-team-panel";
import { authOptions } from "@/lib/auth";
import { syncUserActiveChallenges } from "@/modules/challenges/sync-progress";

const statusNames: Record<string, string> = {
  PENDING: "Esperando al equipo",
  ACTIVE: "En progreso",
  COMPLETED: "Completado",
  CANCELED: "Cancelado",
  EXPIRED: "Finalizado",
  REJECTED: "Rechazado",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-orange-400/15 text-orange-300",
  ACTIVE: "bg-lime-400/15 text-lime-300",
  COMPLETED: "bg-cyan-400/15 text-cyan-300",
  CANCELED: "bg-red-400/15 text-red-300",
  EXPIRED: "bg-slate-700 text-slate-300",
  REJECTED: "bg-red-400/15 text-red-300",
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  const currentUserId = session!.user.id;
  await syncUserActiveChallenges(currentUserId);

  const [categories, challenges, friendships, consumedViews, currentUser] = await Promise.all([
    prisma.challengeCategory.findMany({ where: { status: "ACTIVE" }, orderBy: { durationDays: "asc" } }),
    prisma.challenge.findMany({
      where: { participants: { some: { userId: currentUserId } } },
      include: {
        category: true,
        participants: { include: { user: { include: { profile: true } } }, orderBy: { createdAt: "asc" } },
        scoreEvents: {
          include: {
            user: { include: { profile: true } },
            attendance: {
              include: {
                photos: { select: { id: true, type: true }, orderBy: { createdAt: "asc" } },
                challengeReviews: { select: { challengeId: true, reviewerId: true, verdict: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        creator: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }] },
      include: { requester: { include: { profile: true } }, addressee: { include: { profile: true } } },
    }),
    prisma.challengeEvidenceView.findMany({ where: { viewerId: currentUserId }, select: { challengeId: true, attendanceId: true } }),
    prisma.user.findUnique({ where: { id: currentUserId }, select: { username: true } }),
  ]);
  const consumedAttendanceIds = new Set(consumedViews.map((view) => view.attendanceId));

  const friends = friendships
    .map((row) => row.requesterId === currentUserId ? row.addressee : row.requester)
    .map((user) => ({
      id: user.id,
      username: user.username,
      name: `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || user.username,
    }));

  const invitations = challenges
    .filter((challenge) => challenge.status === "PENDING" && challenge.creatorId !== currentUserId && challenge.participants.some((participant) => participant.userId === currentUserId && participant.acceptedAt === null))
    .map((challenge) => ({ id: challenge.id, category: challenge.category.name, creator: challenge.creator.profile?.firstName ?? challenge.creator.username }));

  const evidenceByAttendance = new Map<string, ChallengeEvidence>();
  for (const challenge of challenges) for (const event of challenge.scoreEvents) {
    const existing = evidenceByAttendance.get(event.attendanceId);
    const challengeLabels = existing?.challenges ?? [];
    const challengesForAttendance = challengeLabels.some((item) => item.id === challenge.id)
      ? challengeLabels
      : [...challengeLabels, { id: challenge.id, name: challenge.category.name }];
    const verdictByReviewer = new Map<string, "CONFIRMED" | "REJECTED">();
    for (const review of event.attendance.challengeReviews) {
      const current = verdictByReviewer.get(review.reviewerId);
      if (!current || review.verdict === "REJECTED") verdictByReviewer.set(review.reviewerId, review.verdict);
    }
    const verdicts = [...verdictByReviewer.values()];
    evidenceByAttendance.set(event.attendanceId, {
      evidenceKey: event.attendanceId,
      challengeId: existing?.challengeId ?? challenge.id,
      challengeName: existing?.challengeName ?? challenge.category.name,
      challenges: challengesForAttendance,
      attendanceId: event.attendanceId,
      ownerId: event.userId,
      ownerName: event.user.profile?.firstName ?? event.user.username,
      username: event.user.username,
      localDate: event.attendance.localDate.toISOString(),
      durationMinutes: event.attendance.durationMinutes,
      latitude: event.userId === currentUserId && event.attendance.startLatitude !== null ? Number(event.attendance.startLatitude) : null,
      longitude: event.userId === currentUserId && event.attendance.startLongitude !== null ? Number(event.attendance.startLongitude) : null,
      accuracy: event.userId === currentUserId && event.attendance.startAccuracyMeters !== null ? Number(event.attendance.startAccuracyMeters) : null,
      photos: event.attendance.photos,
      myVerdict: verdictByReviewer.get(currentUserId) ?? null,
      confirmed: verdicts.filter((verdict) => verdict === "CONFIRMED").length,
      rejected: verdicts.filter((verdict) => verdict === "REJECTED").length,
      viewConsumed: consumedAttendanceIds.has(event.attendanceId),
    });
  }
  const evidence = [...evidenceByAttendance.values()].sort((left, right) => new Date(right.localDate).getTime() - new Date(left.localDate).getTime());

  return <section className="pb-8">
    <div className="mb-6">
      <p className="text-sm font-bold text-lime-400">RETOS Y RACHAS</p>
      <h1 className="flex items-center gap-2 text-3xl font-black">Mantén vivo tu fuego <Flame className="h-8 w-8 shrink-0 fill-orange-400/20 text-orange-400" aria-hidden="true" /></h1>
      <p className="mt-2 max-w-3xl muted">Comparte tu progreso con tu equipo. Cada asistencia válida suma al reto sin mezclar sus puntos con tu clasificación global.</p>
    </div>

    <ChallengeEvidenceFeed currentUserId={currentUserId} currentUsername={currentUser?.username ?? "privado"} initial={evidence} />

    <section className="mb-9">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold text-orange-300">TU COMPETENCIA</p><h2 className="mt-1 text-2xl font-black">Mis retos</h2></div>
        <span className="text-xs muted">Desliza para explorar</span>
      </div>
      {challenges.length === 0 ? <div className="card p-6 muted">Todavía no tienes retos. Agrega amigos desde Comunidad y crea el primero.</div> : <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">{challenges.map((challenge) => {
        const mine = challenge.participants.find((participant) => participant.userId === currentUserId);
        const mineAttendances = challenge.scoreEvents.filter((event) => event.userId === currentUserId).length;
        const progress = Math.min(100, Math.round(mineAttendances / challenge.category.targetAttendances * 100));
        const pendingMembers = challenge.participants.filter((participant) => participant.acceptedAt === null).length;
        return <article key={challenge.id} className="w-[86vw] max-w-[390px] shrink-0 snap-center overflow-hidden rounded-[28px] border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30 shadow-[0_20px_70px_rgba(0,0,0,.22)]">
          <div className="border-b border-slate-800 p-5">
            <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${statusStyles[challenge.status] ?? statusStyles.EXPIRED}`}>{statusNames[challenge.status] ?? challenge.status}</span><span className="inline-flex items-center gap-1 text-xs muted"><Clock3 size={14}/>{challenge.category.durationDays} días</span></div>
            <h3 className="mt-4 text-2xl font-black">{challenge.category.name}</h3>
            <p className="mt-1 text-sm muted">{challenge.category.targetAttendances} asistencias para completar el desafío.</p>
            <div className="mt-5 flex items-end justify-between"><div><span className="text-3xl font-black text-lime-400">{mineAttendances}</span><span className="text-sm muted"> / {challenge.category.targetAttendances}</span></div><strong className="text-sm">{mine?.score ?? 0} pts del reto</strong></div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-lime-400 to-cyan-400" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-sm font-bold"><UsersRound size={17} className="text-cyan-300"/>Equipo</span>{pendingMembers > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-orange-300"><Hourglass size={12}/>{pendingMembers} por aceptar</span>}</div>
            <div className="mt-4 flex -space-x-2">{challenge.participants.map((participant) => <div key={participant.id} title={participant.user.profile?.firstName ?? participant.user.username} className={`grid h-11 w-11 place-items-center rounded-full border-2 border-slate-900 font-black ${participant.acceptedAt ? "bg-gradient-to-br from-lime-400 to-cyan-400 text-slate-950" : "bg-slate-700 text-slate-300"}`}>{(participant.user.profile?.firstName ?? participant.user.username).charAt(0).toUpperCase()}</div>)}</div>
            <ChallengeTeamPanel challengeId={challenge.id} challengeName={challenge.category.name} targetAttendances={challenge.category.targetAttendances} canLeave={["PENDING", "ACTIVE"].includes(challenge.status)} currentUserIsCreator={challenge.creatorId === currentUserId} members={challenge.participants.map((participant) => ({ id: participant.id, userId: participant.userId, name: `${participant.user.profile?.firstName ?? ""} ${participant.user.profile?.lastName ?? ""}`.trim() || participant.user.username, username: participant.user.username, score: participant.score, attendanceCount: challenge.scoreEvents.filter((event) => event.userId === participant.userId).length, accepted: participant.acceptedAt !== null, isCreator: participant.userId === challenge.creatorId, isCurrent: participant.userId === currentUserId }))}/>
            <p className="mt-4 text-xs muted">Finaliza {challenge.endsAt.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </article>;
      })}</div>}
    </section>

    <ChallengeActions categories={categories.map(({ id, name, durationDays, targetAttendances, pointsPerAttendance }) => ({ id, name, durationDays, targetAttendances, pointsPerAttendance }))} friends={friends} invitations={invitations} />

    <section>
      <div className="mb-4"><p className="text-xs font-bold text-cyan-300">EXPLORA</p><h2 className="mt-1 text-2xl font-black">Categorías disponibles</h2></div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">{categories.map((category) => <article key={category.id} className="card w-[82vw] max-w-[360px] shrink-0 snap-center p-6"><Flame className="h-10 w-10 text-orange-400"/><h3 className="mt-3 text-2xl font-black">{category.name}</h3><p className="mt-2 text-sm muted">{category.description}</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><span className="rounded-xl bg-slate-950 p-3"><Target className="mb-1 text-lime-400" size={18}/>Meta {category.targetAttendances}</span><span className="rounded-xl bg-slate-950 p-3"><Trophy className="mb-1 text-lime-400" size={18}/>Bono +{category.completionBonus}</span></div></article>)}</div>
    </section>
  </section>;
}
