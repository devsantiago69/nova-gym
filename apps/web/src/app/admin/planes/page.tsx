import { prisma } from "@gymchallenge/database";
import { PlanManager } from "@/components/admin/plan-manager";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ include: { _count: { select: { subscriptions: true } } }, orderBy: { monthlyPrice: "asc" } });
  return <section><p className="text-xs font-black text-violet-300">MONETIZACIÓN</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Planes del SaaS</h1><p className="mb-7 mt-2 muted">Diseña la oferta comercial, límites y funciones disponibles para cada cliente.</p><PlanManager initial={plans.map((plan) => ({ ...plan, monthlyPrice: Number(plan.monthlyPrice), createdAt: plan.createdAt.toISOString(), updatedAt: plan.updatedAt.toISOString() }))}/></section>;
}
