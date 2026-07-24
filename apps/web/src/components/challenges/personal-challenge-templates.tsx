"use client";

import { useState } from "react";
import {
  Archive,
  BookmarkCheck,
  Flame,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export type PersonalChallengeConfiguration = {
  categoryId: string;
  name: string;
  description: string;
  challengeType:
    | "MOST_ATTENDANCES"
    | "FIRST_TO_TARGET"
    | "REACH_TARGET"
    | "STREAK"
    | "ACCUMULATED_AMOUNT";
  durationDays: number;
  targetValue: number;
  targetUnit: string;
  evidenceType:
    | "NONE"
    | "CHECK_IN"
    | "ONE_PHOTO"
    | "TWO_PHOTOS"
    | "TEXT"
    | "CHECKLIST"
    | "NUMERIC_VALUE"
    | "PHOTO_AND_VALUE";
  numericMinimum?: number;
  numericMaximum?: number;
  allowDecimals?: boolean;
  pointsPerCompletion: number;
  completionBonus: number;
  winnerBonus: number;
  maxDailyCompletions: number;
  validWeekdays: number[];
  checklistItems: Array<{ label: string; required: boolean; points: number }>;
};
export type PersonalChallengeTemplate = {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  usageCount: number;
  configuration: PersonalChallengeConfiguration;
};

export function PersonalChallengeTemplates({
  initial,
}: {
  initial: PersonalChallengeTemplate[];
}) {
  const [templates, setTemplates] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function launch(template: PersonalChallengeTemplate) {
    setBusy(template.id);
    setMessage("");
    const response = await fetch("/api/v1/challenges/custom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...template.configuration,
        mode: "SOLO",
        targetIds: [],
        termsAccepted: true,
        saveAsPersonalTemplate: false,
      }),
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    if (response.ok) {
      await fetch(`/api/v1/user-challenge-templates/${template.id}`, {
        method: "PATCH",
      });
      setMessage(`“${template.name}” comenzó. Sus reglas quedaron protegidas.`);
      setTimeout(() => location.reload(), 900);
    } else setMessage(json.errors?.[0]?.message ?? json.message);
    setBusy(null);
  }
  async function archive(id: string) {
    if (
      !confirm(
        "¿Archivar esta plantilla personal? Tus retos existentes no cambiarán.",
      )
    )
      return;
    setBusy(id);
    setMessage("");
    const response = await fetch(`/api/v1/user-challenge-templates/${id}`, {
      method: "DELETE",
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    if (response.ok) {
      setTemplates((current) => current.filter((item) => item.id !== id));
      setMessage(
        "Plantilla archivada. Los retos existentes conservan sus reglas.",
      );
    } else setMessage(json.errors?.[0]?.message ?? json.message);
    setBusy(null);
  }
  if (templates.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-[26px] border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,.12),transparent_34%),#0c1220] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black text-violet-300">
            <BookmarkCheck size={15} />
            TU BIBLIOTECA PRIVADA
          </p>
          <h2 className="mt-1 text-2xl font-black">Mis plantillas</h2>
          <p className="mt-1 text-sm muted">
            Repite tus mejores fórmulas sin volver a configurarlas.
          </p>
        </div>
        <span className="rounded-full bg-violet-400/10 px-3 py-1.5 text-xs font-black text-violet-200">
          {templates.length}
        </span>
      </div>
      <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        {templates.map((template) => (
          <article
            key={template.id}
            className="w-[82vw] max-w-[340px] shrink-0 snap-center rounded-[24px] border border-slate-700 bg-slate-950/80 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-300 text-slate-950">
                <Flame size={21} />
              </span>
              <button
                type="button"
                disabled={busy === template.id}
                onClick={() => archive(template.id)}
                title="Archivar plantilla"
                className="rounded-full border border-slate-700 p-2 text-slate-400 hover:border-red-300 hover:text-red-300"
              >
                <Archive size={16} />
              </button>
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-cyan-300">
              {template.categoryName}
            </p>
            <h3 className="mt-1 text-xl font-black">{template.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm muted">
              {template.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-slate-900 px-3 py-1.5">
                {template.configuration.durationDays} días
              </span>
              <span className="rounded-full bg-slate-900 px-3 py-1.5">
                Meta {template.configuration.targetValue}{" "}
                {template.configuration.targetUnit}
              </span>
              <span className="rounded-full bg-slate-900 px-3 py-1.5">
                Usada {template.usageCount}×
              </span>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => launch(template)}
              className="btn mt-5 w-full gap-2"
            >
              <Play size={17} />
              {busy === template.id ? "Preparando…" : "Iniciar reto personal"}
            </button>
          </article>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-lime-400/15 bg-lime-400/[.04] p-4 text-xs muted">
        <ShieldCheck className="shrink-0 text-lime-300" size={18} />
        <p>
          Solo tú ves estas plantillas. Cada reto iniciado conserva un snapshot
          independiente.
        </p>
      </div>
      {message && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-950 p-4 text-sm font-bold text-cyan-200"
        >
          <Sparkles size={17} />
          {message}
        </p>
      )}
    </section>
  );
}
