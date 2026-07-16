"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  Infinity,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

type PlanView = {
  id: string;
  name: string;
  monthlyPrice: number;
  currency: string;
};

const benefits = [
  "Retos activos ilimitados",
  "Amigos y equipos sin límite",
  "Historial completo para siempre",
  "Fotografías y evidencias sin límite práctico",
  "Estadísticas avanzadas",
  "Exportaciones e integraciones",
  "Todas las nuevas funciones premium",
];

export function UpgradePlanExperience({
  currentPlan,
  unlimited,
}: {
  currentPlan: string;
  unlimited: PlanView;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"CARD" | "PSE" | "NEQUI">("CARD");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const price = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: unlimited.currency,
    maximumFractionDigits: 0,
  }).format(unlimited.monthlyPrice);

  async function requestUpgrade() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/v1/billing/upgrade-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: unlimited.id, paymentMethod: method }),
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
      <section className="relative isolate overflow-hidden rounded-[34px] border border-lime-300/25 bg-[radial-gradient(circle_at_85%_10%,rgba(163,230,53,.22),transparent_30%),radial-gradient(circle_at_5%_90%,rgba(34,211,238,.14),transparent_30%),linear-gradient(145deg,#101a22,#080b12_62%,#171024)] p-6 shadow-[0_30px_100px_rgba(163,230,53,.08)] sm:p-9">
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[10px] font-black tracking-[.16em] text-lime-300">
              <Crown size={14} />
              NOVA UNLIMITED
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[.98] sm:text-6xl">
              Tu progreso no debería tener techo.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Toda la experiencia social, todos tus retos y todo tu historial en
              un solo plan. Sin niveles confusos ni funciones escondidas.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setOpen(true);
                  setMessage("");
                }}
                className="btn gap-2 px-6 py-4 text-base"
              >
                <Sparkles size={18} />
                Mejorar mi plan
                <ChevronRight size={18} />
              </button>
              <span className="text-sm text-slate-400">
                Plan actual:{" "}
                <strong className="text-white">{currentPlan}</strong>
              </span>
            </div>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-black/25 p-5 backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-lime-300">
                  TODO INCLUIDO
                </p>
                <p className="mt-2 text-4xl font-black">{price}</p>
                <span className="text-sm text-slate-400">
                  por mes · cancela cuando quieras
                </span>
              </div>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-300 text-slate-950">
                <Infinity size={30} />
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {benefits.map((benefit) => (
                <span
                  key={benefit}
                  className="flex items-center gap-2 text-sm text-slate-200"
                >
                  <Check size={16} className="shrink-0 text-lime-300" />
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      {open ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-3 backdrop-blur-xl sm:grid sm:place-items-center sm:p-6">
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
                  CHECKOUT SEGURO
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Activa Nova Unlimited
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
                  <strong className="block">{unlimited.name}</strong>
                  <small className="text-slate-400">Renovación mensual</small>
                </span>
                <strong className="text-xl text-lime-300">{price}</strong>
              </div>
              <div>
                <p className="mb-3 text-sm font-black">
                  ¿Cómo prefieres pagar?
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
                  <strong className="text-sm">Activación asistida</strong>
                  <p className="mt-1 text-xs text-slate-400">
                    La pasarela automática está en integración. Al continuar
                    registraremos tu solicitud y confirmaremos contigo antes de
                    realizar cualquier cobro.
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
              <p className="text-center text-[10px] text-slate-500">
                No se realizará ningún cobro automático en esta etapa.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
