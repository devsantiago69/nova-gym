import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { UpgradePlanExperience } from "@/components/billing/upgrade-plan-experience";
import { authOptions } from "@/lib/auth";

export default async function PlansPage() {
  const session = await getServerSession(authOptions);
  const [subscription, plans] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        userId: session!.user.id,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
      include: { plan: true },
      orderBy: { startsAt: "desc" },
    }),
    prisma.plan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ monthlyPrice: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!plans.length)
    return (
      <section className="card p-8 text-center">
        <h1 className="text-3xl font-black">
          Los planes Nova están en preparación
        </h1>
        <p className="mt-2 muted">
          Vuelve pronto para conocer la experiencia completa.
        </p>
      </section>
    );
  return (
    <main className="space-y-7 pb-10">
      <div>
        <Link
          href="/perfil"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/50 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-lime-300 hover:text-white"
        >
          <ArrowLeft size={16} />
          Volver a mi perfil
        </Link>
        <p className="text-sm font-black text-lime-300">PLANES</p>
        <h1 className="mt-1 text-3xl font-black sm:text-4xl">
          Elige cuánto quieres crecer.
        </h1>
        <p className="mt-2 muted">
          Compara las opciones creadas por administración y solicita el cambio
          de forma segura mientras finalizamos la pasarela de pagos.
        </p>
      </div>
      <UpgradePlanExperience
        currentPlanId={subscription?.plan.id ?? null}
        currentPlan={subscription?.plan.name ?? "Sin plan"}
        plans={plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          code: plan.code,
          description: plan.description,
          monthlyPrice: Number(plan.monthlyPrice),
          currency: plan.currency,
          trialDays: plan.trialDays,
          storageLimitMb: plan.storageLimitMb,
          activeChallengeLimit: plan.activeChallengeLimit,
          friendLimit: plan.friendLimit,
          historyMonths: plan.historyMonths,
          advancedStatsEnabled: plan.advancedStatsEnabled,
          exportsEnabled: plan.exportsEnabled,
        }))}
      />
    </main>
  );
}
