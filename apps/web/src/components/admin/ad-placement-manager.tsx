"use client";

import { useState } from "react";
import { Check, Megaphone, Save } from "lucide-react";

type Placement = {
  id: string;
  key: string;
  label: string;
  page: string;
  format: "DISPLAY" | "NATIVE_FEED" | "REWARDED";
  slotId: string | null;
  enabled: boolean;
  frequency: number;
  createdAt: string;
  updatedAt: string;
};

const formatLabels: Record<Placement["format"], string> = {
  DISPLAY: "Display",
  NATIVE_FEED: "Nativo en feed",
  REWARDED: "Recompensa (XP)",
};

const pageLabels: Record<string, string> = {
  inicio: "Inicio",
  actividad: "Actividad",
  retos: "Retos",
  perfil: "Perfil",
};

export function AdPlacementManager({ initial }: { initial: Placement[] }) {
  const [placements, setPlacements] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, { slotId: string; frequency: number }>>(
    Object.fromEntries(
      initial.map((placement) => [
        placement.id,
        { slotId: placement.slotId ?? "", frequency: placement.frequency },
      ]),
    ),
  );
  const [saving, setSaving] = useState<string>();
  const [message, setMessage] = useState("");

  function isDirty(placement: Placement) {
    const draft = drafts[placement.id];
    if (!draft) return false;
    return draft.slotId !== (placement.slotId ?? "") || draft.frequency !== placement.frequency;
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setSaving(id);
    setMessage("");
    const response = await fetch(`/api/v1/admin/ad-placements/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      data?: Placement;
      message: string;
      errors?: Array<{ message: string }>;
    };
    setSaving(undefined);
    setMessage(response.ok ? result.message : (result.errors?.[0]?.message ?? result.message));
    if (response.ok && result.data) {
      setPlacements((current) =>
        current.map((placement) => (placement.id === result.data!.id ? result.data! : placement)),
      );
    }
  }

  async function toggleEnabled(placement: Placement) {
    await patch(placement.id, { enabled: !placement.enabled });
  }

  async function saveDraft(placement: Placement) {
    const draft = drafts[placement.id];
    if (!draft) return;
    await patch(placement.id, { slotId: draft.slotId, frequency: draft.frequency });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/[.06] p-4 text-sm text-violet-100">
        <Megaphone className="shrink-0 text-violet-300" />
        <div>
          <strong>Espacios curados, no un editor libre</strong>
          <p className="mt-1 text-violet-100/70">
            Estos espacios ya fueron elegidos con cuidado dentro del diseño de la app. Aquí solo enciendes o
            apagas cada uno y le asignas el ID de unidad de anuncio de tu cuenta de AdSense. Los anuncios reales
            solo aparecen cuando el sitio esté aprobado en AdSense y el espacio tenga un ID válido.
          </p>
        </div>
      </div>

      {message && (
        <p role="status" className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm font-bold text-violet-200">
          {message}
        </p>
      )}

      <div className="grid gap-4">
        {placements.map((placement) => {
          const draft = drafts[placement.id] ?? { slotId: "", frequency: placement.frequency };
          const dirty = isDirty(placement);
          return (
            <article
              key={placement.id}
              className={`rounded-[24px] border p-5 transition ${placement.enabled ? "border-lime-400/30 bg-lime-400/[.04]" : "border-slate-800 bg-slate-900/70"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-black text-slate-300">
                      {pageLabels[placement.page] ?? placement.page}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[9px] font-black text-slate-300">
                      {formatLabels[placement.format]}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-black">{placement.label}</h2>
                  <p className="text-xs muted">clave: {placement.key}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleEnabled(placement)}
                  disabled={saving === placement.id}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition ${placement.enabled ? "bg-lime-400" : "bg-slate-700"}`}
                  aria-label={placement.enabled ? "Apagar espacio" : "Encender espacio"}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${placement.enabled ? "translate-x-7" : "translate-x-1"}`}
                  />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <label className="text-xs font-bold">
                  ID de unidad de anuncio (AdSense)
                  <input
                    value={draft.slotId}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [placement.id]: { ...draft, slotId: event.target.value },
                      }))
                    }
                    placeholder="Ej. 1234567890"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm"
                  />
                </label>
                {placement.format === "NATIVE_FEED" && (
                  <label className="text-xs font-bold">
                    Cada N publicaciones
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={draft.frequency}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [placement.id]: { ...draft, frequency: Number(event.target.value) },
                        }))
                      }
                      className="mt-2 w-24 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm"
                    />
                  </label>
                )}
                <button
                  type="button"
                  disabled={!dirty || saving === placement.id}
                  onClick={() => void saveDraft(placement)}
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-bold transition hover:border-lime-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {dirty ? <Save size={15} /> : <Check size={15} />}
                  {saving === placement.id ? "Guardando…" : dirty ? "Guardar" : "Guardado"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
