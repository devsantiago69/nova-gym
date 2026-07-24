import { getServerSession } from "next-auth";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  Crown,
  Flame,
  HardDrive,
  Medal,
  MoveRight,
  QrCode,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { ProfileSocialHub } from "@/components/profile/profile-social-hub";
import { ProfileAccountCenter } from "@/components/profile/profile-account-center";
import { ProfileAvatarEditor } from "@/components/profile/profile-avatar-editor";
import { authOptions } from "@/lib/auth";
import { publicFitnessStats } from "@/modules/profile/public-stats";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    include: {
      profile: true,
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
        orderBy: { startsAt: "desc" },
        take: 1,
      },
    },
  });
  const timezone = user.profile?.timezone ?? "America/Bogota";
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const timelineStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1),
  );
  const [fitness, timelineAttendances, timelineRestDays, availablePlans] =
    await Promise.all([
      publicFitnessStats(user.id),
      prisma.attendance.findMany({
        where: {
          userId: user.id,
          status: "COMPLETED",
          invalidatedAt: null,
          localDate: { gte: timelineStart },
        },
        select: { localDate: true },
        orderBy: { localDate: "asc" },
      }),
      prisma.challengeRestDay.findMany({
        where: { userId: user.id, localDate: { gte: timelineStart } },
        select: { localDate: true },
        distinct: ["localDate"],
        orderBy: { localDate: "asc" },
      }),
      prisma.plan.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ monthlyPrice: "asc" }, { name: "asc" }],
      }),
    ]);
  const attendanceDates = timelineAttendances.map((row) =>
    row.localDate.toISOString().slice(0, 10),
  );
  const restDates = timelineRestDays.map((row) =>
    row.localDate.toISOString().slice(0, 10),
  );
  const monthlyBars = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (5 - index), 1),
    );
    const key = date.toISOString().slice(0, 7);
    return {
      key,
      label: date
        .toLocaleDateString("es-CO", { month: "short", timeZone: "UTC" })
        .replace(".", ""),
      value: attendanceDates.filter((item) => item.startsWith(key)).length,
    };
  });
  const name =
    `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() ||
    user.username;
  const shareUrl = `${process.env.APP_URL ?? "https://gym.dotaly.io"}/conectar/${encodeURIComponent(user.username)}`;
  const qrSvg = await QRCode.toString(shareUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#05080d", light: "#ffffff" },
  });
  const cards = [
    [Flame, "Racha actual", `${fitness.streak} días`, "text-orange-400"],
    [
      CalendarCheck,
      "Asistencias",
      String(fitness.attendances),
      "text-lime-400",
    ],
    [Medal, "Puntos globales", String(fitness.globalPoints), "text-yellow-400"],
    [
      Trophy,
      "Puntos en retos",
      String(fitness.challengePoints),
      "text-cyan-400",
    ],
    [Users, "Amigos", String(fitness.friends), "text-violet-400"],
  ] as const;
  const currentPlan = user.subscriptions[0]?.plan;
  const planVisual =
    Number(currentPlan?.monthlyPrice ?? 0) >= 29_900
      ? {
          badge:
            "border-yellow-200/40 bg-gradient-to-r from-yellow-300/20 via-lime-300/15 to-cyan-300/15 text-yellow-100 shadow-[0_0_30px_rgba(250,204,21,.2)]",
          glow: "bg-yellow-300/45",
          icon: "text-yellow-200",
        }
      : Number(currentPlan?.monthlyPrice ?? 0) > 0
        ? {
            badge:
              "border-cyan-200/40 bg-gradient-to-r from-cyan-300/20 via-violet-300/15 to-blue-300/15 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,.2)]",
            glow: "bg-cyan-300/45",
            icon: "text-cyan-200",
          }
        : {
            badge:
              "border-lime-200/25 bg-gradient-to-r from-lime-300/12 to-emerald-300/[.07] text-lime-100 shadow-[0_0_24px_rgba(163,230,53,.12)]",
            glow: "bg-lime-300/35",
            icon: "text-lime-200",
          };
  return (
    <section className="pb-8">
      <section className="relative isolate overflow-hidden rounded-[34px] border border-white/10 bg-slate-900/80 shadow-[0_30px_100px_rgba(0,0,0,.28)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 -z-10 h-36 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(163,230,53,.25),transparent_34%),linear-gradient(135deg,#12221f,#111827_55%,#25152a)] sm:h-44" />
        <div className="px-5 pb-5 pt-16 text-center sm:px-8 sm:pb-8 sm:pt-20">
          <div className="mx-auto w-fit">
            <ProfileAvatarEditor
              userId={user.id}
              name={name}
              hasAvatar={Boolean(user.profile?.avatarKey)}
            />
          </div>
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h1 className="text-3xl font-black sm:text-5xl">{name}</h1>
              <span
                title="Perfil verificado"
                aria-label="Perfil verificado"
                className="grid h-8 w-8 place-items-center rounded-full border border-cyan-200/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.2)]"
              >
                <BadgeCheck size={19} fill="currentColor" className="text-cyan-200 [&>path:last-child]:text-slate-950" />
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">@{user.username}</p>
            {user.profile?.bio ? (
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-200">
                {user.profile.bio}
              </p>
            ) : (
              <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
                Comparte tu meta o lo que te inspira desde los ajustes de tu
                perfil.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-[11px] font-black tracking-wide ${planVisual.badge}`}
              >
                <i
                  className={`absolute -left-2 top-1/2 -z-10 h-8 w-8 -translate-y-1/2 animate-pulse rounded-full blur-xl ${planVisual.glow}`}
                />
                <Crown size={14} className={planVisual.icon} />
                {currentPlan?.name ?? "Sin plan"}
              </span>
              {fitness.streak > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 px-3 py-2 text-[11px] font-black text-orange-300">
                  <Flame size={14} />
                  Racha de {fitness.streak} días
                </span>
              ) : (
                <span className="rounded-full bg-lime-400/10 px-3 py-2 text-[11px] font-black text-lime-300">
                  Tu próxima racha comienza hoy
                </span>
              )}
            </div>
          </div>
          <div className="-mx-2 mt-6 flex snap-x gap-2 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
            {cards.map(([Icon, label, value, color]) => (
              <div
                key={label}
                className="min-w-[116px] snap-start rounded-2xl border border-white/[.06] bg-black/20 p-3 text-left sm:min-w-0 sm:text-center"
              >
                <Icon size={18} className={`${color} sm:mx-auto`} />
                <strong className="mt-2 block text-xl">{value}</strong>
                <span className="block text-[10px] text-slate-400">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a
              href="#ajustes"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm font-black transition hover:border-lime-300"
            >
              <Settings size={17} />
              Editar perfil
            </a>
            <a
              href="#mi-qr"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-lime-300"
            >
              <QrCode size={17} />
              Compartir perfil
            </a>
          </div>
        </div>
      </section>
      <section className="mt-5 overflow-hidden rounded-[30px] border border-white/[.08] bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,.11),transparent_34%),rgba(10,18,32,.76)] p-5 shadow-[0_22px_65px_rgba(0,0,0,.18)] backdrop-blur-xl sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[.16em] text-lime-300">
              PLANES NOVA
            </p>
            <h2 className="mt-1 text-2xl font-black">Crece a tu ritmo</h2>
            <p className="mt-1 text-sm muted">
              Compara los planes configurados por Nova.
            </p>
          </div>
          <Link
            href="/planes"
            className="shrink-0 text-xs font-black text-lime-300"
          >
            Ver todos →
          </Link>
        </div>
        {availablePlans.length > 1 ? (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05] px-3 py-2.5 sm:hidden">
            <span className="text-[10px] font-black tracking-wide text-cyan-100">
              DESLIZA PARA VER {availablePlans.length} OPCIONES
            </span>
            <span className="flex items-center gap-2 text-cyan-300">
              <span className="flex gap-1">
                {availablePlans.map((plan, index) => (
                  <i
                    key={plan.id}
                    className={`h-1.5 rounded-full ${index === 0 ? "w-5 bg-cyan-300" : "w-1.5 bg-slate-600"}`}
                  />
                ))}
              </span>
              <MoveRight size={18} className="animate-pulse" />
            </span>
          </div>
        ) : null}
        <div className="relative -mr-5 mt-4 sm:mr-0">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#0a1220] to-transparent sm:hidden" />
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible sm:pr-0">
          {availablePlans.map((plan) => {
            const current = user.subscriptions[0]?.plan.id === plan.id;
            const price = new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: plan.currency,
              maximumFractionDigits: 0,
            }).format(Number(plan.monthlyPrice));
            return (
              <Link
                href="/planes"
                key={plan.id}
                className={`relative min-w-[76vw] snap-start overflow-hidden rounded-[26px] border p-5 transition sm:min-w-0 ${current ? "border-lime-300/40 bg-lime-300/[.08] shadow-[0_0_30px_rgba(163,230,53,.08)]" : "border-white/[.07] bg-slate-950/55 hover:border-cyan-300/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-2xl ${current ? "bg-lime-300 text-slate-950" : "bg-gradient-to-br from-violet-300 to-cyan-300 text-slate-950"}`}
                  >
                    {current ? <Check size={20} /> : <Crown size={20} />}
                  </span>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black text-slate-300">
                    {current ? "TU PLAN" : plan.code}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-black">{plan.name}</h3>
                <p className="mt-1 text-2xl font-black text-lime-300">
                  {Number(plan.monthlyPrice) === 0 ? "Gratis" : price}
                  {Number(plan.monthlyPrice) > 0 ? (
                    <small className="ml-1 text-[10px] font-bold text-slate-500">
                      /mes
                    </small>
                  ) : null}
                </p>
                <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Trophy size={13} className="text-orange-300" />
                    {plan.activeChallengeLimit >= 10000
                      ? "Retos ilimitados"
                      : `${plan.activeChallengeLimit} retos`}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HardDrive size={13} className="text-cyan-300" />
                    {plan.storageLimitMb >= 1024
                      ? `${Math.round(plan.storageLimitMb / 1024)} GB`
                      : `${plan.storageLimitMb} MB`}
                  </span>
                </div>
                <span className="mt-4 flex items-center justify-between border-t border-white/[.06] pt-3 text-xs font-black text-slate-200">
                  {current ? "Plan activo" : "Conocer este plan"}
                  <ArrowRight size={16} className="text-lime-300" />
                </span>
              </Link>
            );
          })}
          </div>
        </div>
      </section>
      <ProfileSocialHub
        qrSvg={qrSvg}
        shareUrl={shareUrl}
        stats={{ name, username: user.username, ...fitness }}
        progress={{
          todayKey,
          trackingStartDate: "2026-07-13",
          attendanceDates,
          restDates,
          monthlyBars,
        }}
      />
      <div id="ajustes" className="scroll-mt-24">
        <ProfileAccountCenter
          initial={{
            firstName: user.profile?.firstName ?? "",
            lastName: user.profile?.lastName ?? "",
            username: user.username,
            email: user.email,
            whatsappNumber: user.whatsappNumber ?? "",
            bio: user.profile?.bio ?? "",
            locale: user.profile?.locale === "en" ? "en" : "es",
            localeAuto: user.profile?.localeAuto ?? true,
            fontFamily:
              user.profile?.fontFamily === "modern" ||
              user.profile?.fontFamily === "rounded" ||
              user.profile?.fontFamily === "editorial"
                ? user.profile.fontFamily
                : "nova",
            storyDurationSeconds: user.profile?.storyDurationSeconds ?? 10,
            timezone: user.profile?.timezone ?? "America/Bogota",
            showActiveChallenges: user.profile?.showActiveChallenges ?? true,
            attendanceLocationEnabled:
              user.profile?.attendanceLocationEnabled ?? false,
          }}
        />
      </div>
      <div className="mt-6 flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-400/10 text-lime-300">
          ✓
        </span>
        <div>
          <h2 className="font-black">Privacidad por diseño</h2>
          <p className="mt-1 text-sm muted">
            La tarjeta pública comparte únicamente estadísticas deportivas.
            Fotografías, ubicación, WhatsApp, correo y datos privados nunca
            aparecen en el QR ni en la historia.
          </p>
        </div>
      </div>
    </section>
  );
}
