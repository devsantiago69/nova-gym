import { getServerSession } from "next-auth";
import Link from "next/link";
import {
  Clock3,
  Flame,
  Hourglass,
  Plus,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { finalizeExpiredChallenges, prisma } from "@gymchallenge/database";
import { ChallengeActions } from "@/components/challenges/challenge-actions";
import {
  ChallengeEvidenceFeed,
  type ChallengeEvidence,
} from "@/components/challenges/challenge-evidence-feed";
import { ChallengeTeamPanel } from "@/components/challenges/challenge-team-panel";
import { ChallengeWorkoutPanel } from "@/components/challenges/challenge-workout-panel";
import { ChallengeCompletionPanel } from "@/components/challenges/challenge-completion-panel";
import {
  PersonalChallengeTemplates,
  type PersonalChallengeConfiguration,
} from "@/components/challenges/personal-challenge-templates";
import { ChallengeSectionNav } from "@/components/challenges/challenge-section-nav";
import { ChallengeAccordion } from "@/components/challenges/challenge-accordion";
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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string; template?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const currentUserId = session!.user.id;
  const query = await searchParams;
  const requestedChallengeId = query.challenge;
  await finalizeExpiredChallenges(prisma);
  await syncUserActiveChallenges(currentUserId);

  const [
    templates,
    challenges,
    friendships,
    consumedViews,
    personalTemplateRows,
  ] = await Promise.all([
    prisma.challengeTemplate.findMany({
      where: {
        status: "ACTIVE",
        versions: { some: { publishedAt: { not: null } } },
      },
      include: {
        versions: {
          where: { publishedAt: { not: null } },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.challenge.findMany({
      where: { participants: { some: { userId: currentUserId } } },
      include: {
        category: true,
        participants: {
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: "asc" },
        },
        scoreEvents: {
          include: {
            user: { include: { profile: true } },
            attendance: {
              include: {
                photos: {
                  select: { id: true, type: true },
                  orderBy: { createdAt: "asc" },
                },
                challengeReviews: {
                  select: {
                    challengeId: true,
                    reviewerId: true,
                    verdict: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        creator: { include: { profile: true } },
        ruleSnapshot: true,
        checklistItems: { orderBy: { sortOrder: "asc" } },
        completions: {
          where: { status: { in: ["SUBMITTED", "VALID"] } },
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
      },
      include: {
        requester: { include: { profile: true } },
        addressee: { include: { profile: true } },
      },
    }),
    prisma.challengeEvidenceView.findMany({
      where: { viewerId: currentUserId },
      select: { challengeId: true, attendanceId: true },
    }),
    prisma.userChallengeTemplate.findMany({
      where: { ownerId: currentUserId, archivedAt: null },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const categories = templates.flatMap((template) =>
    template.versions[0]
      ? [
          {
            id: template.id,
            categoryId: template.categoryId,
            templateId: template.id,
            name: template.name,
            description: template.shortDescription,
            durationDays: template.versions[0].defaultDurationDays,
            targetAttendances: template.versions[0].defaultTargetValue,
            pointsPerAttendance: template.versions[0].pointsPerCompletion,
            completionBonus: template.versions[0].completionBonus,
          },
        ]
      : [],
  );
  const consumedViewKeys = new Set(
    consumedViews.map((view) => `${view.challengeId}:${view.attendanceId}`),
  );

  const friends = friendships
    .map((row) =>
      row.requesterId === currentUserId ? row.addressee : row.requester,
    )
    .map((user) => ({
      id: user.id,
      username: user.username,
      name:
        `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() ||
        user.username,
    }));

  const invitations = challenges
    .filter(
      (challenge) =>
        challenge.status === "PENDING" &&
        challenge.creatorId !== currentUserId &&
        challenge.participants.some(
          (participant) =>
            participant.userId === currentUserId &&
            participant.acceptedAt === null,
        ),
    )
    .map((challenge) => ({
      id: challenge.id,
      category: challenge.name,
      creator:
        challenge.creator.profile?.firstName ?? challenge.creator.username,
    }));

  const evidenceByAttendance = new Map<string, ChallengeEvidence>();
  for (const challenge of challenges)
    for (const event of challenge.scoreEvents) {
      if (!event.attendance || !event.attendanceId) continue;
      const existing = evidenceByAttendance.get(event.attendanceId);
      const challengeLabels = existing?.challenges ?? [];
      const challengesForAttendance = challengeLabels.some(
        (item) => item.id === challenge.id,
      )
        ? challengeLabels
        : [...challengeLabels, { id: challenge.id, name: challenge.name }];
      const challengeReviews = event.attendance.challengeReviews.filter(
        (review) => review.challengeId === challenge.id,
      );
      const verdictByReviewer = new Map<string, "CONFIRMED" | "REJECTED">();
      for (const review of challengeReviews) {
        const current = verdictByReviewer.get(review.reviewerId);
        if (!current || review.verdict === "REJECTED")
          verdictByReviewer.set(review.reviewerId, review.verdict);
      }
      const verdicts = [...verdictByReviewer.values()];
      const reviewStateByChallenge = {
        ...(existing?.reviewStateByChallenge ?? {}),
        [challenge.id]: {
          myVerdict: verdictByReviewer.get(currentUserId) ?? null,
          confirmed: verdicts.filter((verdict) => verdict === "CONFIRMED").length,
          rejected: verdicts.filter((verdict) => verdict === "REJECTED").length,
        },
      };
      const primaryReviewState =
        reviewStateByChallenge[existing?.challengeId ?? challenge.id];
      evidenceByAttendance.set(event.attendanceId, {
        evidenceKey: event.attendanceId,
        challengeId: existing?.challengeId ?? challenge.id,
        challengeName: existing?.challengeName ?? challenge.name,
        challenges: challengesForAttendance,
        attendanceId: event.attendanceId,
        ownerId: event.userId,
        ownerName: event.user.profile?.firstName ?? event.user.username,
        username: event.user.username,
        avatarUrl: event.user.profile?.avatarKey
          ? `/api/v1/profile/avatar/${event.userId}`
          : undefined,
        localDate: event.attendance.localDate.toISOString(),
        durationMinutes: event.attendance.durationMinutes,
        latitude:
          event.userId === currentUserId &&
          event.attendance.startLatitude !== null
            ? Number(event.attendance.startLatitude)
            : null,
        longitude:
          event.userId === currentUserId &&
          event.attendance.startLongitude !== null
            ? Number(event.attendance.startLongitude)
            : null,
        accuracy:
          event.userId === currentUserId &&
          event.attendance.startAccuracyMeters !== null
            ? Number(event.attendance.startAccuracyMeters)
            : null,
        photos: event.attendance.photos,
        myVerdict: primaryReviewState?.myVerdict ?? null,
        confirmed: primaryReviewState?.confirmed ?? 0,
        rejected: primaryReviewState?.rejected ?? 0,
        viewConsumed: consumedViewKeys.has(
          `${existing?.challengeId ?? challenge.id}:${event.attendanceId}`,
        ),
        storyDurationSeconds: event.user.profile?.storyDurationSeconds ?? 10,
        reviewStateByChallenge,
      });
    }
  const evidence = [...evidenceByAttendance.values()].sort(
    (left, right) =>
      new Date(right.localDate).getTime() - new Date(left.localDate).getTime(),
  );
  const activeChallenges = challenges.filter(
    (challenge) => challenge.status === "ACTIVE",
  ).length;
  const completedChallenges = challenges.filter(
    (challenge) => challenge.status === "COMPLETED",
  ).length;
  const challengePoints = challenges.reduce(
    (total, challenge) =>
      total +
      (challenge.participants.find(
        (participant) => participant.userId === currentUserId,
      )?.score ?? 0),
    0,
  );
  const personalTemplates = personalTemplateRows.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    categoryName: template.category.name,
    usageCount: template.usageCount,
    configuration: template.configuration as PersonalChallengeConfiguration,
  }));

  return (
    <section className="pb-8">
      <div className="mb-6">
        <p className="text-sm font-bold text-lime-400">RETOS Y RACHAS</p>
        <h1 className="flex items-center gap-2 text-3xl font-black">
          Mantén vivo tu fuego{" "}
          <Flame
            className="h-8 w-8 shrink-0 fill-orange-400/20 text-orange-400"
            aria-hidden="true"
          />
        </h1>
        <p className="mt-2 max-w-3xl muted">
          Comparte tu progreso con tu equipo. Cada asistencia válida suma al
          reto sin mezclar sus puntos con tu clasificación global.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
          <div className="rounded-2xl border border-lime-400/15 bg-lime-400/[.06] p-3">
            <Flame size={16} className="text-orange-300" />
            <strong className="mt-2 block text-xl">{activeChallenges}</strong>
            <span className="text-[10px] muted">Activos</span>
          </div>
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[.05] p-3">
            <Trophy size={16} className="text-cyan-300" />
            <strong className="mt-2 block text-xl">
              {completedChallenges}
            </strong>
            <span className="text-[10px] muted">Completados</span>
          </div>
          <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[.05] p-3">
            <Sparkles size={16} className="text-violet-300" />
            <strong className="mt-2 block text-xl">{challengePoints}</strong>
            <span className="text-[10px] muted">Puntos</span>
          </div>
        </div>
      </div>

      <ChallengeSectionNav invitationCount={invitations.length} />

      <div id="historias" className="scroll-mt-32">
        <ChallengeEvidenceFeed
          currentUserId={currentUserId}
          initial={evidence}
        />
      </div>

      <ChallengeAccordion
        id="mis-retos"
        kind="challenges"
        eyebrow="TU COMPETENCIA"
        title="Mis retos"
        description="Progreso, equipo y entrenamientos de cada competencia."
        count={challenges.length}
        defaultOpen={Boolean(requestedChallengeId)}
      >
        {challenges.length === 0 ? (
          <div className="card p-6 muted">
            Todavía no tienes retos. Agrega amigos desde Comunidad y crea el
            primero.
          </div>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            {challenges.map((challenge) => {
              const mine = challenge.participants.find(
                (participant) => participant.userId === currentUserId,
              );
              const mineAttendances = challenge.scoreEvents.filter(
                (event) => event.userId === currentUserId && event.attendanceId,
              ).length;
              const mineCompletions = challenge.completions.filter(
                (item) =>
                  item.userId === currentUserId && item.status === "VALID",
              );
              const usesNumericProgress = [
                "NUMERIC_VALUE",
                "PHOTO_AND_VALUE",
              ].includes(challenge.evidenceType);
              const progressValue = usesNumericProgress
                ? mineCompletions.reduce(
                    (total, item) =>
                      total +
                      (item.numericValue === null
                        ? 0
                        : Number(item.numericValue)),
                    0,
                  )
                : challenge.targetUnit === "attendances"
                  ? mineAttendances
                  : mineCompletions.length;
              const progress = Math.min(
                100,
                Math.round((progressValue / challenge.targetValue) * 100),
              );
              const snapshotRules = (challenge.ruleSnapshot?.rules ?? {}) as {
                numericRules?: {
                  minimum?: number;
                  maximum?: number;
                  allowDecimals?: boolean;
                };
              };
              const pendingMembers = challenge.participants.filter(
                (participant) => participant.acceptedAt === null,
              ).length;
              const challengeEvidence = evidence
                .filter((item) =>
                  item.challenges.some((label) => label.id === challenge.id),
                )
                .map((item) => ({
                  ...item,
                  challengeId: challenge.id,
                  challengeName: challenge.name,
                  myVerdict:
                    item.reviewStateByChallenge[challenge.id]?.myVerdict ?? null,
                  confirmed:
                    item.reviewStateByChallenge[challenge.id]?.confirmed ?? 0,
                  rejected:
                    item.reviewStateByChallenge[challenge.id]?.rejected ?? 0,
                  viewConsumed: consumedViewKeys.has(
                    `${challenge.id}:${item.attendanceId}`,
                  ),
                }));
              return (
                <article
                  key={challenge.id}
                  className="w-[86vw] max-w-[390px] shrink-0 snap-center overflow-hidden rounded-[28px] border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30 shadow-[0_20px_70px_rgba(0,0,0,.22)]"
                >
                  <div className="border-b border-slate-800 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1.5 text-[10px] font-black ${statusStyles[challenge.status] ?? statusStyles.EXPIRED}`}
                      >
                        {statusNames[challenge.status] ?? challenge.status}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs muted">
                        <Clock3 size={14} />
                        {challenge.durationDays} días
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-black">
                      {challenge.name}
                    </h3>
                    <p className="mt-1 text-sm muted">
                      {challenge.targetValue} asistencias para completar el
                      desafío.
                    </p>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <span className="text-3xl font-black text-lime-400">
                          {progressValue}
                        </span>
                        <span className="text-sm muted">
                          {" "}
                          / {challenge.targetValue}{" "}
                          {usesNumericProgress ? challenge.targetUnit : ""}
                        </span>
                      </div>
                      <strong className="text-sm">
                        {mine?.score ?? 0} pts del reto
                      </strong>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 via-lime-400 to-cyan-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {mine && mine.result !== "PENDING" && (
                      <div
                        className={`mt-4 rounded-2xl border p-3 text-sm font-black ${["WIN", "COMPLETED"].includes(mine.result) ? "border-lime-400/25 bg-lime-400/[.08] text-lime-300" : mine.result === "DRAW" ? "border-cyan-400/25 bg-cyan-400/[.08] text-cyan-300" : "border-orange-400/20 bg-orange-400/[.06] text-orange-200"}`}
                      >
                        {mine.result === "WIN"
                          ? "🏆 Ganaste este reto"
                          : mine.result === "COMPLETED"
                            ? "✨ Objetivo completado"
                            : mine.result === "DRAW"
                              ? "🤝 El reto terminó en empate"
                              : mine.result === "FAILED"
                                ? "Tu reto finalizó sin alcanzar la meta"
                                : "El reto llegó a su final"}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-sm font-bold">
                        <UsersRound size={17} className="text-cyan-300" />
                        Equipo
                      </span>
                      {pendingMembers > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-orange-300">
                          <Hourglass size={12} />
                          {pendingMembers} por aceptar
                        </span>
                      )}
                    </div>
                    <div className="mt-4 flex -space-x-2">
                      {challenge.participants.map((participant) => (
                        <div
                          key={participant.id}
                          title={
                            participant.user.profile?.firstName ??
                            participant.user.username
                          }
                          className={`grid h-11 w-11 place-items-center rounded-full border-2 border-slate-900 font-black ${participant.acceptedAt ? "bg-gradient-to-br from-lime-400 to-cyan-400 text-slate-950" : "bg-slate-700 text-slate-300"}`}
                        >
                          {(
                            participant.user.profile?.firstName ??
                            participant.user.username
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <ChallengeTeamPanel
                      challengeId={challenge.id}
                      challengeName={challenge.name}
                      targetAttendances={challenge.targetValue}
                      canLeave={["PENDING", "ACTIVE"].includes(
                        challenge.status,
                      )}
                      currentUserIsCreator={
                        challenge.creatorId === currentUserId
                      }
                      members={challenge.participants.map((participant) => ({
                        id: participant.id,
                        userId: participant.userId,
                        name:
                          `${participant.user.profile?.firstName ?? ""} ${participant.user.profile?.lastName ?? ""}`.trim() ||
                          participant.user.username,
                        username: participant.user.username,
                        score: participant.score,
                        attendanceCount: challenge.scoreEvents.filter(
                          (event) => event.userId === participant.userId,
                        ).length,
                        accepted: participant.acceptedAt !== null,
                        isCreator: participant.userId === challenge.creatorId,
                        isCurrent: participant.userId === currentUserId,
                      }))}
                    />
                    <ChallengeWorkoutPanel
                      challengeName={challenge.name}
                      currentUserId={currentUserId}
                      evidence={challengeEvidence}
                      targetAttendances={challenge.targetValue}
                      participants={challenge.participants.map(
                        (participant) => ({
                          userId: participant.userId,
                          name:
                            `${participant.user.profile?.firstName ?? ""} ${participant.user.profile?.lastName ?? ""}`.trim() ||
                            participant.user.username,
                          username: participant.user.username,
                          score: participant.score,
                          accepted: participant.acceptedAt !== null,
                          isCurrent: participant.userId === currentUserId,
                        }),
                      )}
                      autoOpen={requestedChallengeId === challenge.id}
                    />
                    <ChallengeCompletionPanel
                      challengeId={challenge.id}
                      challengeName={challenge.name}
                      status={challenge.status}
                      evidenceType={challenge.evidenceType}
                      targetUnit={challenge.targetUnit}
                      maxDailyCompletions={challenge.maxDailyCompletions}
                      isGymAttendance={
                        challenge.targetUnit === "attendances" &&
                        challenge.evidenceType === "TWO_PHOTOS"
                      }
                      currentUserId={currentUserId}
                      checklistItems={challenge.checklistItems.map((item) => ({
                        id: item.id,
                        label: item.label,
                        required: item.required,
                        points: item.points,
                      }))}
                      completions={challenge.completions.map((item) => ({
                        id: item.id,
                        userId: item.userId,
                        name:
                          `${item.user.profile?.firstName ?? ""} ${item.user.profile?.lastName ?? ""}`.trim() ||
                          item.user.username,
                        logicalDate: item.logicalDate.toISOString(),
                        status: item.status,
                        points: item.calculatedPoints,
                        numericValue:
                          item.numericValue === null
                            ? null
                            : Number(item.numericValue),
                        unit: item.unit,
                      }))}
                      numericMinimum={snapshotRules.numericRules?.minimum}
                      numericMaximum={snapshotRules.numericRules?.maximum}
                      allowDecimals={snapshotRules.numericRules?.allowDecimals}
                    />
                    <p className="mt-4 text-xs muted">
                      Finaliza{" "}
                      {challenge.endsAt.toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </ChallengeAccordion>

      <ChallengeAccordion
        id="crear-reto"
        kind="create"
        eyebrow="NUEVA META"
        title="Crear un reto"
        description="Elige una opción rápida o diseña una experiencia personalizada."
        count={invitations.length}
        defaultOpen={Boolean(query.template || invitations.length)}
      >
        <ChallengeActions
          categories={categories}
          friends={friends}
          invitations={invitations}
          {...(query.template ? { initialTemplateId: query.template } : {})}
        />
        <Link
          href="/retos/crear"
          className="group mt-4 flex items-center gap-4 overflow-hidden rounded-[26px] border border-cyan-400/20 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,.12),transparent_30%),linear-gradient(135deg,#101a2b,#090d16)] p-5 text-left sm:p-7"
        >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
          <Sparkles />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-xs font-black text-cyan-300">
            CONSTRUCTOR CON AUTOGUARDADO
          </span>
          <strong className="mt-1 block text-2xl">Diseña tu propio reto</strong>
          <small className="mt-1 block muted">
            Cinco pasos, borrador recuperable y vista previa antes de publicar.
          </small>
        </span>
        <Plus className="text-cyan-300 transition group-hover:rotate-90" />
        </Link>
      </ChallengeAccordion>

      <ChallengeAccordion
        id="explorar"
        kind="explore"
        eyebrow="DESCUBRIR"
        title="Explora nuevos retos"
        description="Tus fórmulas guardadas y el catálogo oficial de Nova."
        count={categories.length + personalTemplates.length}
      >
        {personalTemplates.length ? (
          <div className="mb-5">
            <PersonalChallengeTemplates initial={personalTemplates} />
          </div>
        ) : null}
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-black tracking-[.14em] text-cyan-300">
              CATÁLOGO NOVA
            </p>
            <h3 className="mt-1 text-lg font-black">Plantillas disponibles</h3>
          </div>
          <Link
            href="/retos/plantillas"
            className="shrink-0 text-xs font-black text-lime-300"
          >
            Ver todo →
          </Link>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          {categories.map((category) => (
            <article
              key={category.templateId}
              className="card w-[82vw] max-w-[360px] shrink-0 snap-center p-6"
            >
              <Flame className="h-10 w-10 text-orange-400" />
              <h3 className="mt-3 text-2xl font-black">{category.name}</h3>
              <p className="mt-2 text-sm muted">{category.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <span className="rounded-xl bg-slate-950 p-3">
                  <Target className="mb-1 text-lime-400" size={18} />
                  Meta {category.targetAttendances}
                </span>
                <span className="rounded-xl bg-slate-950 p-3">
                  <Trophy className="mb-1 text-lime-400" size={18} />
                  Bono +{category.completionBonus}
                </span>
              </div>
              <a
                href={`/retos?template=${category.templateId}#crear-reto`}
                className="btn mt-5 w-full"
              >
                Usar plantilla
              </a>
            </article>
          ))}
        </div>
      </ChallengeAccordion>
    </section>
  );
}
