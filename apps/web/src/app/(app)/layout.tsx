import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LocationConsent } from "@/components/location/location-consent";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { LocaleRuntime } from "@/components/i18n/locale-runtime";
import { resolveAppLocale } from "@/lib/i18n/locale";
import { appConfig } from "@gymchallenge/config";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await getServerSession(authOptions);
  if (
    !s?.user.id ||
    s.user.status === "INACTIVE" ||
    s.user.status === "SUSPENDED"
  )
    redirect("/login");
  if (s.user.status === "PENDING_PASSWORD_CHANGE")
    redirect("/cambiar-contrasena");
  const [profile, subscription] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: s.user.id },
      select: {
        firstName: true,
        lastName: true,
        locale: true,
        localeAuto: true,
        timezone: true,
        fontFamily: true,
        attendanceLocationEnabled: true,
      },
    }),
    prisma.subscription.findFirst({
      where: {
        userId: s.user.id,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
        plan: { status: "ACTIVE" },
      },
      select: { plan: { select: { code: true } } },
      orderBy: { startsAt: "desc" },
    }),
  ]);
  const locale = resolveAppLocale(profile ?? {});
  const displayName =
    `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
    s.user.name;
  const adminLabel = locale === "en" ? "Admin" : "Administrar";
  return (
    <div
      className="nova-app min-h-screen"
      data-app-font={profile?.fontFamily ?? "nova"}
    >
      <LocaleRuntime locale={locale} />
      <LocationConsent
        preference={profile?.attendanceLocationEnabled ?? null}
      />
      <header className="sticky top-0 z-40 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-b border-white/[.06] bg-[#070b12]/78 p-4 shadow-[0_12px_35px_rgba(0,0,0,.12)] backdrop-blur-2xl sm:p-5 md:rounded-b-[24px]">
        <Link href="/inicio" className="text-xl font-black text-lime-400">
          {appConfig.name}
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-sm muted sm:inline">{displayName}</span>
          {s.user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="rounded-xl bg-lime-400 px-3 py-2 text-sm font-black text-slate-950 sm:px-4"
            >
              {adminLabel}
            </Link>
          )}
          <NotificationCenter />
          <LogoutButton locale={locale} />
        </div>
      </header>
      <BottomNav
        locale={locale}
        premium={Boolean(subscription && subscription.plan.code.toUpperCase() !== "FREE")}
      />
      <main className="mx-auto max-w-6xl px-4 pb-32 md:pb-24">{children}</main>
    </div>
  );
}
