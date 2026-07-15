import { getServerSession } from "next-auth";
import QRCode from "qrcode";
import { CalendarCheck, Flame, Medal, Trophy, Users } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { ProfileSocialHub } from "@/components/profile/profile-social-hub";
import { ProfileAccountCenter } from "@/components/profile/profile-account-center";
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
  const fitness = await publicFitnessStats(user.id);
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
      <div className="relative overflow-hidden rounded-[32px] border border-slate-700 bg-gradient-to-br from-lime-500/20 via-slate-900 to-orange-500/10 p-6 sm:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-black tracking-[.18em] text-lime-300">
            IDENTIDAD NOVA
          </p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">{name}</h1>
          <p className="mt-2 text-lg muted">
            @{user.username} · Plan{" "}
            {user.subscriptions[0]?.plan.name ?? "Sin plan"}
          </p>
          {fitness.streak > 0 ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-400/15 px-4 py-2 font-bold text-orange-300">
              <Flame size={19} />
              Tu fuego lleva {fitness.streak} días encendido
            </p>
          ) : (
            <p className="mt-5 inline-flex rounded-full bg-slate-950/60 px-4 py-2 text-sm font-bold text-slate-300">
              Tu próxima racha empieza hoy
            </p>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([Icon, label, value, color]) => (
          <article key={label} className="card p-4 sm:p-5">
            <Icon className={color} />
            <p className="mt-3 text-2xl font-black">{value}</p>
            <p className="text-xs muted sm:text-sm">{label}</p>
          </article>
        ))}
      </div>
      <ProfileSocialHub
        qrSvg={qrSvg}
        shareUrl={shareUrl}
        stats={{ name, username: user.username, ...fitness }}
      />
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
          storyDurationSeconds: user.profile?.storyDurationSeconds ?? 10,
          timezone: user.profile?.timezone ?? "America/Bogota",
          showActiveChallenges: user.profile?.showActiveChallenges ?? true,
        }}
      />
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
