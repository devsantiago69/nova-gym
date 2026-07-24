"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  HardDrive,
  History,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";

type PlanView = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  monthlyPrice: number;
  currency: string;
  trialDays: number;
  storageLimitMb: number;
  activeChallengeLimit: number;
  friendLimit: number;
  historyMonths: number | null;
  advancedStatsEnabled: boolean;
  exportsEnabled: boolean;
};

function price(plan: PlanView) {
  if (plan.monthlyPrice === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 0,
  }).format(plan.monthlyPrice);
}

function compactLimit(value: number, label: string) {
  return value >= 10_000 ? `${label} ilimitados` : `${value} ${label}`;
}

function storage(value: number) {
  if (value >= 1_000_000) return "Almacenamiento amplio";
  if (value >= 1024) return `${Math.round(value / 1024)} GB`;
  return `${value} MB`;
}

export function UpgradePlanExperience({
  currentPlanId,
  currentPlan,
  plans,
}: {
  currentPlanId: string | null;
  currentPlan: string;
  plans: PlanView[];
}) {
  const recommended =
    plans.find((plan) => plan.id !== currentPlanId && plan.monthlyPrice > 0) ??
    plans[0];
  const [selectedId, setSelectedId] = useState(recommended?.id ?? "");
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"CARD" | "PSE" | "NEQUI">("CARD");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = plans.find((plan) => plan.id === selectedId) ?? plans[0];

  function choose(plan: PlanView) {
    setSelectedId(plan.id);
    setMessage("");
    setOpen(true);
  }

  async function requestUpgrade() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/v1/billing/upgrade-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: selected.id, paymentMethod: method }),
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(false);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
  }

  return (
    <>
      <section className="relative isolate overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_85%_10%,rgba(163,230,53,.18),transparent_30%),radial-gradient(circle_at_5%_90%,rgba(34,211,238,.12),transparent_32%),rgba(10,18,32,.82)] p-6 shadow-[0_30px_100px_rgba(0,0,0,.24)] backdrop-blur-xl sm:p-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[10px] font-black tracking-[.16em] text-lime-300">
              <Crown size={14} />
              CATÁLOGO NOVA
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">
              Un plan para cada etapa.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Todos los valores y límites vienen de la configuración del
              administrador. Cuando cambien, este catálogo se actualizará
              automáticamente.
            </p>
          </div>
          <span className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-400">
            Plan actual: <strong className="text-white">{currentPlan}</strong>
          </span>
        </div>

        <div className="-mx-2 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible">
          {plans.map((plan, index) => {
            const current = plan.id === currentPlanId;
            const featured = !current && index === plans.length - 1;
            return (
              <article
                key={plan.id}
                className={`relative min-w-[84vw] snap-center overflow-hidden rounded-[30px] border p-5 sm:min-w-[350px] lg:min-w-0 ${current ? "border-lime-300/45 bg-lime-300/[.07]" : featured ? "border-violet-300/35 bg-gradient-to-br from-violet-400/10 to-cyan-300/[.05]" : "border-white/[.08] bg-slate-950/55"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl ${current ? "bg-lime-300 text-slate-950" : featured ? "bg-gradient-to-br from-violet-300 to-cyan-300 text-slate-950" : "bg-white/10 text-cyan-200"}`}
                  >
                    {current ? <Check size={22} /> : <Crown size={22} />}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black tracking-wider text-slate-300">
                    {current ? "TU PLAN" : featured ? "MÁXIMO NIVEL" : plan.code}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-black">{plan.name}</h3>
                <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-400">
                  {plan.description ?? "Una experiencia Nova configurada para tu progreso."}
                </p>
                <p className="mt-5 text-3xl font-black text-lime-300">
                  {price(plan)}
                  {plan.monthlyPrice > 0 ? (
                    <small className="ml-1 text-[11px] font-bold text-slate-500">
                      /mes
                    </small>
                  ) : null}
                </p>
                {plan.trialDays > 0 ? (
                  <span className="mt-2 inline-flex rounded-full bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black text-cyan-200">
                    {plan.trialDays} días incluidos
                  </span>
                ) : null}
                <div className="mt-5 space-y-2.5 text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <Trophy size={15} className="text-orange-300" />
                    {compactLimit(plan.activeChallengeLimit, "retos activos")}
                  </span>
                  <span className="flex items-center gap-2">
                    <UsersRound size={15} className="text-lime-300" />
                    {compactLimit(plan.friendLimit, "amigos")}
                  </span>
                  <span className="flex items-center gap-2">
                    <HardDrive size={15} className="text-cyan-300" />
                    {storage(plan.storageLimitMb)} para evidencias
                  </span>
                  <span className="flex items-center gap-2">
                    <History size={15} className="text-violet-300" />
                    {plan.historyMonths
                      ? `${plan.historyMonths} meses de historial`
                      : "Historial completo"}
                  </span>
                  {plan.advancedStatsEnabled ? (
                    <span className="flex items-center gap-2">
                      <BarChart3 size={15} className="text-yellow-300" />
                      Estadísticas avanzadas
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={current || plan.monthlyPrice === 0}
                  onClick={() => choose(plan)}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black transition ${current ? "border border-lime-300/20 bg-lime-300/10 text-lime-200" : plan.monthlyPrice === 0 ? "border border-slate-700 text-slate-500" : "bg-lime-300 text-slate-950 hover:bg-lime-200"}`}
                >
                  {current
                    ? "Plan activo"
                    : plan.monthlyPrice === 0
                      ? "Plan inicial"
                      : "Elegir este plan"}
                  {!current && plan.monthlyPrice > 0 ? (
                    <ChevronRight size={17} />
                  ) : null}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {open && selected ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/82 p-3 backdrop-blur-xl sm:grid sm:place-items-center sm:p-6">
          <section className="mx-auto w-full max-w-xl overflow-hidden rounded-[32px] border border-slate-700 bg-slate-900 shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-800 p-5 sm:p-6">
              <div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-slate-400 sm:hidden"
                >
                  <ArrowLeft size={14} />
                  Volver
                </button>
                <p className="text-[10px] font-black tracking-[.16em] text-lime-300">
                  ACTIVACIÓN ASISTIDA
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Solicitar {selected.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="hidden rounded-full bg-slate-950 p-2.5 sm:block"
              >
                <X />
              </button>
            </header>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between rounded-2xl border border-lime-300/20 bg-lime-300/[.06] p-4">
                <span>
                  <strong className="block">{selected.name}</strong>
                  <small className="text-slate-400">Renovación mensual</small>
                </span>
                <strong className="text-xl text-lime-300">
                  {price(selected)}
                </strong>
              </div>
              <div>
                <p className="mb-3 text-sm font-black">
                  Método que prefieres usar
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["CARD", CreditCard, "Tarjeta"],
                      ["PSE", Landmark, "PSE"],
                      ["NEQUI", Smartphone, "Nequi"],
                    ] as const
                  ).map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value)}
                      className={`relative rounded-2xl border p-3 text-center transition ${method === value ? "border-lime-300 bg-lime-300/10" : "border-slate-700 bg-slate-950/60"}`}
                    >
                      <Icon
                        className={`mx-auto ${method === value ? "text-lime-300" : "text-slate-500"}`}
                        size={22}
                      />
                      <strong className="mt-2 block text-xs">{label}</strong>
                      {method === value ? (
                        <BadgeCheck
                          className="absolute right-2 top-2 text-lime-300"
                          size={14}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.05] p-4">
                <ShieldCheck className="shrink-0 text-cyan-300" />
                <div>
                  <strong className="text-sm">Todavía no habrá cobro</strong>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Registraremos tu solicitud con el plan y método elegidos. Un
                    administrador confirmará contigo antes de cualquier pago.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestUpgrade()}
                className="btn w-full gap-2 py-4"
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <LockKeyhole size={18} />
                )}
                Solicitar activación segura
              </button>
              {message ? (
                <p
                  role="status"
                  className="rounded-2xl border border-lime-300/20 bg-lime-300/[.07] p-4 text-center text-sm font-bold text-lime-200"
                >
                  {message}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
