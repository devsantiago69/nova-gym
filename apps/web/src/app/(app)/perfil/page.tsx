import { getServerSession } from "next-auth";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowRight,
  CalendarCheck,
  Crown,
  Flame,
  Medal,
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
  const [fitness, timelineAttendances, timelineRestDays] = await Promise.all([
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
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black tracking-wide text-cyan-200">
                PERFIL ACTIVO
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
              <span className="rounded-full bg-white/[.06] px-3 py-2 text-[11px] font-black text-slate-300">
                PLAN {user.subscriptions[0]?.plan.name ?? "SIN PLAN"}
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
      {user.subscriptions[0]?.plan.code !== "PRO" ? (
        <Link
          href="/planes"
          className="group mt-5 flex items-center gap-4 overflow-hidden rounded-[26px] border border-violet-400/20 bg-gradient-to-r from-violet-400/10 via-slate-900 to-lime-400/[.08] p-5 transition hover:border-lime-300/35"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-lime-300 text-slate-950">
            <Crown size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-[10px] font-black tracking-[.14em] text-lime-300">
              NOVA UNLIMITED
            </span>
            <strong className="mt-0.5 block text-lg">
              Lleva tu experiencia al siguiente nivel
            </strong>
            <small className="block text-slate-400">
              Retos, amigos, estadísticas e historial sin límites.
            </small>
          </span>
          <ArrowRight className="shrink-0 text-lime-300 transition group-hover:translate-x-1" />
        </Link>
      ) : null}
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
