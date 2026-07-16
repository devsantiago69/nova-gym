"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Flame,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { ChallengeDraftData } from "@/modules/challenges/draft-schema";
import { ChallengeUnitPicker } from "@/components/challenges/challenge-unit-picker";

type Category = { id: string; name: string; description: string };
type Friend = { id: string; name: string; username: string };
type Draft = {
  id: string;
  title: string;
  currentStep: number;
  updatedAt: string;
  data: ChallengeDraftData;
};
type Props = {
  categories: Category[];
  friends: Friend[];
  drafts: Draft[];
  initialDraft: Draft | null;
  plan: { name: string; activeChallengeLimit: number } | null;
};
const defaultData: ChallengeDraftData = {
  mode: "SOLO",
  targetIds: [],
  categoryId: "",
  name: "",
  description: "",
  challengeType: "REACH_TARGET",
  durationDays: 30,
  targetValue: 20,
  targetUnit: "sesiones",
  evidenceType: "TEXT",
  numericMinimum: 0,
  numericMaximum: 10000,
  allowDecimals: false,
  pointsPerCompletion: 2,
  completionBonus: 10,
  winnerBonus: 0,
  maxDailyCompletions: 1,
  validWeekdays: [1, 2, 3, 4, 5, 6, 7],
  checklistItems: [],
  saveAsPersonalTemplate: false,
};
const week = [
  [1, "L"],
  [2, "M"],
  [3, "M"],
  [4, "J"],
  [5, "V"],
  [6, "S"],
  [7, "D"],
] as const;
const evidenceLabels = {
  NONE: "Confirmación honesta",
  CHECK_IN: "Check-in",
  ONE_PHOTO: "Una fotografía",
  TWO_PHOTOS: "Inicio y final",
  TEXT: "Texto privado",
  CHECKLIST: "Lista de actividades",
  NUMERIC_VALUE: "Registrar una cantidad",
  PHOTO_AND_VALUE: "Fotografía y cantidad",
} as const;
const typeLabels = {
  REACH_TARGET: "Alcanzar mi meta",
  MOST_ATTENDANCES: "Mayor cantidad",
  FIRST_TO_TARGET: "Primero en llegar",
  STREAK: "Mantener una racha",
  ACCUMULATED_AMOUNT: "Acumular una cantidad",
} as const;
const typeDescriptions = {
  REACH_TARGET: "Cumples cuando alcanzas una meta total dentro del plazo.",
  MOST_ATTENDANCES: "En equipo, gana quien registra más cumplimientos válidos.",
  FIRST_TO_TARGET: "Gana la primera persona que completa la meta definida.",
  STREAK: "El objetivo es mantener la mayor continuidad sin romper la cadena.",
  ACCUMULATED_AMOUNT:
    "Cada registro suma una cantidad hasta completar el objetivo.",
} as const;

export function ChallengeCreator({
  categories,
  friends,
  drafts,
  initialDraft,
  plan,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<ChallengeDraftData>(
    () =>
      initialDraft?.data ?? {
        ...defaultData,
        categoryId: categories[0]?.id ?? "",
      },
  );
  const [step, setStep] = useState(initialDraft?.currentStep ?? 1);
  const [draftId, setDraftId] = useState(initialDraft?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(
    initialDraft ? new Date(initialDraft.updatedAt) : null,
  );
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const requestVersion = useRef(0);
  const category = categories.find((item) => item.id === data.categoryId);
  const visibleFriends = useMemo(
    () =>
      friends.filter((item) =>
        `${item.name} ${item.username}`
          .toLowerCase()
          .includes(friendQuery.toLowerCase()),
      ),
    [friends, friendQuery],
  );
  function update<K extends keyof ChallengeDraftData>(
    key: K,
    value: ChallengeDraftData[K],
  ) {
    setData((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage("");
  }
  useEffect(() => {
    if (!dirty) return;
    const version = ++requestVersion.current;
    const timer = setTimeout(async () => {
      setSaving(true);
      const response = await fetch(
        draftId
          ? `/api/v1/challenge-drafts/${draftId}`
          : "/api/v1/challenge-drafts",
        {
          method: draftId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentStep: step, data }),
        },
      );
      const json = (await response.json()) as {
        data?: { id?: string };
        errors?: Array<{ message: string }>;
      };
      if (version === requestVersion.current) {
        if (response.ok) {
          const id = draftId ?? json.data?.id ?? null;
          if (id && !draftId) {
            setDraftId(id);
            window.history.replaceState({}, "", `/retos/crear?draft=${id}`);
          }
          setSavedAt(new Date());
          setDirty(false);
        } else
          setMessage(
            json.errors?.[0]?.message ?? "No pudimos guardar el borrador",
          );
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [data, dirty, draftId, step]);
  function validateStep() {
    if (
      step === 1 &&
      (!data.categoryId ||
        data.name.trim().length < 3 ||
        data.description.trim().length < 10)
    )
      return "Completa categoría, nombre y una descripción de al menos 10 caracteres.";
    if (
      step === 2 &&
      (!data.targetUnit.trim() || data.durationDays < 1 || data.targetValue < 1)
    )
      return "Revisa duración, meta y unidad.";
    if (
      step === 3 &&
      data.evidenceType === "CHECKLIST" &&
      data.checklistItems.length === 0
    )
      return "Agrega al menos una actividad al checklist.";
    if (
      step === 3 &&
      (data.evidenceType === "NUMERIC_VALUE" ||
        data.evidenceType === "PHOTO_AND_VALUE") &&
      (data.numericMinimum < 0 ||
        data.numericMaximum <= 0 ||
        data.numericMaximum < data.numericMinimum)
    )
      return "Revisa los valores mínimo y máximo permitidos.";
    if (step === 4 && data.mode === "SOCIAL" && data.targetIds.length === 0)
      return "Selecciona al menos un amigo.";
    return null;
  }
  function next() {
    const error = validateStep();
    if (error) {
      setMessage(error);
      return;
    }
    setStep((value) => Math.min(5, value + 1));
    setDirty(true);
    setMessage("");
  }
  function back() {
    setStep((value) => Math.max(1, value - 1));
    setDirty(true);
    setMessage("");
  }
  function toggleFriend(id: string) {
    update(
      "targetIds",
      data.targetIds.includes(id)
        ? data.targetIds.filter((item) => item !== id)
        : data.targetIds.length < 3
          ? [...data.targetIds, id]
          : data.targetIds,
    );
    if (data.targetIds.length >= 3 && !data.targetIds.includes(id))
      setMessage("Puedes invitar máximo tres amigos.");
  }
  async function removeDraft(id: string) {
    if (!confirm("¿Eliminar este borrador?")) return;
    const response = await fetch(`/api/v1/challenge-drafts/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      if (id === draftId) router.replace("/retos/crear");
      else router.refresh();
    }
  }
  async function publish() {
    const error = validateStep();
    if (error) {
      setMessage(error);
      return;
    }
    if (!plan) {
      setMessage("Necesitas un plan activo para publicar el reto.");
      return;
    }
    setPublishing(true);
    setMessage("");
    const response = await fetch("/api/v1/challenges/custom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...data,
        draftId: draftId ?? undefined,
        termsAccepted: true,
      }),
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    if (response.ok) {
      setMessage(json.message);
      setTimeout(() => router.push("/retos"), 700);
    } else {
      setMessage(json.errors?.[0]?.message ?? json.message);
      setPublishing(false);
    }
  }
  const checklistText = data.checklistItems
    .map((item) => item.label)
    .join("\n");
  return (
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
      <aside className="space-y-4">
        <Link
          href="/retos"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft size={17} />
          Volver a retos
        </Link>
        <div className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-cyan-300">MIS BORRADORES</p>
            <Bookmark size={16} />
          </div>
          <div className="mt-3 space-y-2">
            {drafts.length === 0 ? (
              <p className="text-xs muted">
                Tu progreso aparecerá aquí automáticamente.
              </p>
            ) : (
              drafts.map((item) => (
                <div
                  key={item.id}
                  className={`group flex items-center gap-2 rounded-xl border p-2 ${item.id === draftId ? "border-cyan-400/40 bg-cyan-400/[.06]" : "border-slate-800 bg-slate-950/50"}`}
                >
                  <Link
                    href={`/retos/crear?draft=${item.id}`}
                    className="min-w-0 flex-1"
                  >
                    <strong className="block truncate text-xs">
                      {item.title}
                    </strong>
                    <span className="text-[10px] muted">
                      Paso {item.currentStep} ·{" "}
                      {new Date(item.updatedAt).toLocaleDateString("es-CO")}
                    </span>
                  </Link>
                  <button
                    onClick={() => removeDraft(item.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                    aria-label="Eliminar borrador"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          <Link
            href="/retos/crear"
            className="mt-3 block rounded-xl border border-dashed border-slate-700 p-2 text-center text-xs font-black text-lime-300"
          >
            + Nuevo reto
          </Link>
        </div>
        {plan && (
          <div className="rounded-[24px] border border-lime-400/15 bg-lime-400/[.04] p-4">
            <p className="text-[10px] font-black text-lime-300">TU PLAN</p>
            <strong className="mt-1 block">{plan.name}</strong>
            <span className="text-xs muted">
              Hasta {plan.activeChallengeLimit} retos activos
            </span>
          </div>
        )}
      </aside>
      <main className="overflow-hidden rounded-[30px] border border-slate-700 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.1),transparent_25%),#0d1524] shadow-2xl">
        <header className="border-b border-slate-800 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-cyan-300">
                CONSTRUCTOR PERSONALIZADO
              </p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                Diseña un reto que sí sea tuyo
              </h1>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-[10px] font-bold text-slate-300">
              {saving ? (
                <>
                  <Save size={13} />
                  Guardando…
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} className="text-lime-300" />
                  {savedAt ? "Guardado" : "Listo"}
                </>
              )}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {["Idea", "Reglas", "Prueba", "Equipo", "Vista"].map(
              (label, index) => (
                <button
                  key={label}
                  onClick={() => index + 1 < step && setStep(index + 1)}
                  className="text-left"
                >
                  <span
                    className={`block h-1.5 rounded-full ${index + 1 <= step ? "bg-gradient-to-r from-lime-400 to-cyan-400" : "bg-slate-700"}`}
                  />
                  <span
                    className={`mt-2 hidden text-[9px] font-black sm:block ${index + 1 === step ? "text-cyan-300" : "text-slate-500"}`}
                  >
                    {label}
                  </span>
                </button>
              ),
            )}
          </div>
        </header>
        <div className="p-5 sm:p-7">
          {step === 1 && (
            <section className="space-y-5">
              <Title
                eyebrow="PASO 1 · TU IDEA"
                title="¿Qué quieres conquistar?"
              />
              <Field
                label="Categoría"
                hint="Ayuda a organizar el reto y recomendarte experiencias relacionadas."
              >
                <select
                  value={data.categoryId}
                  onChange={(e) => update("categoryId", e.target.value)}
                  className="control"
                >
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Nombre"
                hint="Usa un nombre corto y motivador que explique la meta de un vistazo."
              >
                <input
                  value={data.name}
                  onChange={(e) => update("name", e.target.value)}
                  maxLength={160}
                  placeholder="Ej. Leer 20 páginas cada noche"
                  className="control"
                />
              </Field>
              <Field
                label="Descripción"
                hint="Cuenta qué debes hacer y qué significa completar este reto."
              >
                <textarea
                  value={data.description}
                  onChange={(e) => update("description", e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Describe la meta y por qué importa…"
                  className="control"
                />
              </Field>
              {category && (
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[.04] p-4 text-sm">
                  <strong>{category.name}</strong>
                  <p className="mt-1 muted">{category.description}</p>
                </div>
              )}
            </section>
          )}
          {step === 2 && (
            <section className="space-y-5">
              <Title
                eyebrow="PASO 2 · REGLAS"
                title="Dale ritmo a tu objetivo"
              />
              <Field
                label="Forma de completar"
                hint="Define cómo decidirá el sistema si alcanzaste el objetivo y, cuando participen amigos, quién obtiene el resultado ganador."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(typeLabels).map(([value, label]) => {
                    const selected = data.challengeType === value;
                    return (
                      <button
                        type="button"
                        key={value}
                        onClick={() =>
                          update(
                            "challengeType",
                            value as ChallengeDraftData["challengeType"],
                          )
                        }
                        className={`rounded-2xl border p-4 text-left transition ${selected ? "border-lime-300 bg-lime-400/[.08]" : "border-slate-800 bg-slate-950/70 hover:border-slate-600"}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <strong>{label}</strong>
                          {selected && (
                            <CheckCircle2
                              size={18}
                              className="shrink-0 text-lime-300"
                            />
                          )}
                        </span>
                        <small className="mt-1.5 block leading-relaxed muted">
                          {
                            typeDescriptions[
                              value as keyof typeof typeDescriptions
                            ]
                          }
                        </small>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Duración del reto"
                  hint="El plazo empieza cuando publiques o cuando todos los invitados acepten."
                >
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={data.durationDays}
                    onChange={(e) =>
                      update("durationDays", Number(e.target.value))
                    }
                    className="control"
                  />
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {[7, 15, 21, 30, 60, 90].map((days) => (
                      <button
                        type="button"
                        key={days}
                        onClick={() => update("durationDays", days)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${data.durationDays === days ? "bg-cyan-300 text-slate-950" : "bg-slate-950 text-slate-400"}`}
                      >
                        {days} días
                      </button>
                    ))}
                  </div>
                </Field>
                <Field
                  label="Meta total"
                  hint={`La barra llegará al 100% cuando acumules ${data.targetValue || 0} ${data.targetUnit}.`}
                >
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={data.targetValue}
                    onChange={(e) =>
                      update("targetValue", Number(e.target.value))
                    }
                    className="control"
                  />
                </Field>
                <Field
                  label="¿Qué vas a medir?"
                  hint="Esta unidad aparecerá en tu progreso, registros, resultados y estadísticas."
                >
                  <ChallengeUnitPicker
                    value={data.targetUnit}
                    onChange={(value) => update("targetUnit", value)}
                  />
                </Field>
              </div>
              <div>
                <p className="text-sm font-bold">Días válidos</p>
                <p className="mt-1 text-xs font-normal muted">
                  Solo podrás registrar avances durante los días seleccionados.
                </p>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {week.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        update(
                          "validWeekdays",
                          data.validWeekdays.includes(value)
                            ? data.validWeekdays.length > 1
                              ? data.validWeekdays.filter(
                                  (day) => day !== value,
                                )
                              : data.validWeekdays
                            : [...data.validWeekdays, value],
                        )
                      }
                      className={`aspect-square rounded-xl font-black ${data.validWeekdays.includes(value) ? "bg-lime-400 text-slate-950" : "bg-slate-950 text-slate-500"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
          {step === 3 && (
            <section className="space-y-5">
              <Title
                eyebrow="PASO 3 · EVIDENCIA"
                title="¿Cómo registrarás el avance?"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(evidenceLabels).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() =>
                      update(
                        "evidenceType",
                        value as ChallengeDraftData["evidenceType"],
                      )
                    }
                    className={`rounded-2xl border p-4 text-left font-bold ${data.evidenceType === value ? "border-violet-300 bg-violet-400/10 text-violet-200" : "border-slate-800 bg-slate-950"}`}
                  >
                    {label}
                    {data.evidenceType === value && (
                      <CheckCircle2 className="float-right" size={18} />
                    )}
                  </button>
                ))}
              </div>
              {(data.evidenceType === "NUMERIC_VALUE" ||
                data.evidenceType === "PHOTO_AND_VALUE") && (
                <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/[.05] p-4">
                  <p className="text-xs font-black text-cyan-300">
                    REGLAS DE LA CANTIDAD
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label={`Mínimo por registro (${data.targetUnit})`}>
                      <input
                        type="number"
                        min={0}
                        step={data.allowDecimals ? "0.001" : "1"}
                        value={data.numericMinimum}
                        onChange={(e) =>
                          update("numericMinimum", Number(e.target.value))
                        }
                        className="control"
                      />
                    </Field>
                    <Field label={`Máximo por registro (${data.targetUnit})`}>
                      <input
                        type="number"
                        min={0.001}
                        step={data.allowDecimals ? "0.001" : "1"}
                        value={data.numericMaximum}
                        onChange={(e) =>
                          update("numericMaximum", Number(e.target.value))
                        }
                        className="control"
                      />
                    </Field>
                  </div>
                  <label className="mt-3 flex items-center gap-3 rounded-2xl bg-slate-950 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={data.allowDecimals}
                      onChange={(e) =>
                        update("allowDecimals", e.target.checked)
                      }
                      className="h-4 w-4 accent-cyan-400"
                    />
                    Permitir decimales, por ejemplo 2,5 kilómetros
                  </label>
                </div>
              )}
              {data.evidenceType === "CHECKLIST" && (
                <Field label="Actividades (una por línea)">
                  <textarea
                    value={checklistText}
                    onChange={(e) =>
                      update(
                        "checklistItems",
                        e.target.value
                          .split("\n")
                          .filter(Boolean)
                          .map((label) => ({
                            label,
                            required: true,
                            points: 0,
                          })),
                      )
                    }
                    rows={5}
                    className="control"
                    placeholder={
                      "Calentamiento\nRutina principal\nEstiramiento"
                    }
                  />
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Puntos por cumplimiento"
                  hint="Se entregan cada vez que un registro es validado."
                >
                  <input
                    type="number"
                    min={0}
                    value={data.pointsPerCompletion}
                    onChange={(e) =>
                      update("pointsPerCompletion", Number(e.target.value))
                    }
                    className="control"
                  />
                </Field>
                <Field
                  label="Máximo por día"
                  hint="Evita registrar demasiados avances en una sola fecha."
                >
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={data.maxDailyCompletions}
                    onChange={(e) =>
                      update("maxDailyCompletions", Number(e.target.value))
                    }
                    className="control"
                  />
                </Field>
                <Field
                  label="Bono por completar"
                  hint="Puntos adicionales al alcanzar la meta total."
                >
                  <input
                    type="number"
                    min={0}
                    value={data.completionBonus}
                    onChange={(e) =>
                      update("completionBonus", Number(e.target.value))
                    }
                    className="control"
                  />
                </Field>
                <Field
                  label="Bono ganador"
                  hint="Solo se aplica en competencias cuando existe un ganador."
                >
                  <input
                    type="number"
                    min={0}
                    value={data.winnerBonus}
                    onChange={(e) =>
                      update("winnerBonus", Number(e.target.value))
                    }
                    className="control"
                  />
                </Field>
              </div>
            </section>
          )}
          {step === 4 && (
            <section className="space-y-5">
              <Title
                eyebrow="PASO 4 · PARTICIPACIÓN"
                title="¿Lo haces solo o acompañado?"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Mode
                  active={data.mode === "SOLO"}
                  icon={<UserRound />}
                  title="Reto personal"
                  text="Comienza cuando publiques."
                  onClick={() => {
                    update("mode", "SOLO");
                    update("targetIds", []);
                  }}
                />
                <Mode
                  active={data.mode === "SOCIAL"}
                  icon={<UsersRound />}
                  title="Con amigos"
                  text="Invita hasta tres amigos."
                  onClick={() => update("mode", "SOCIAL")}
                />
              </div>
              {data.mode === "SOCIAL" && (
                <>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4">
                    <Search size={18} />
                    <input
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      placeholder="Buscar amigos"
                      className="w-full bg-transparent py-4 outline-none"
                    />
                    <span className="text-xs text-cyan-300">
                      {data.targetIds.length}/3
                    </span>
                  </label>
                  <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                    {visibleFriends.map((friend) => (
                      <button
                        type="button"
                        key={friend.id}
                        onClick={() => toggleFriend(friend.id)}
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${data.targetIds.includes(friend.id) ? "border-cyan-300 bg-cyan-400/10" : "border-slate-800 bg-slate-950"}`}
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 font-black">
                          {friend.name[0]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate">
                            {friend.name}
                          </strong>
                          <small className="muted">@{friend.username}</small>
                        </span>
                        {data.targetIds.includes(friend.id) && (
                          <CheckCircle2 className="text-cyan-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <label className="flex items-start gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/[.06] p-4 text-sm">
                <input
                  type="checkbox"
                  checked={data.saveAsPersonalTemplate}
                  onChange={(e) =>
                    update("saveAsPersonalTemplate", e.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-violet-400"
                />
                <span>
                  <strong className="block text-violet-200">
                    Guardar también en Mis plantillas
                  </strong>
                  <span className="muted">
                    La configuración quedará disponible para repetirla.
                  </span>
                </span>
              </label>
            </section>
          )}
          {step === 5 && (
            <section className="space-y-5">
              <Title
                eyebrow="PASO 5 · VISTA PREVIA"
                title="Tu reto está listo para cobrar vida"
              />
              <div className="overflow-hidden rounded-[28px] border border-lime-400/25 bg-gradient-to-br from-slate-950 via-slate-950 to-lime-950/30">
                <div className="border-b border-slate-800 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-lime-400/10 px-3 py-1 text-[10px] font-black text-lime-300">
                      {data.mode === "SOLO"
                        ? "RETO PERSONAL"
                        : `${data.targetIds.length + 1} PARTICIPANTES`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs muted">
                      <Clock3 size={14} />
                      {data.durationDays} días
                    </span>
                  </div>
                  <h2 className="mt-4 text-3xl font-black">
                    {data.name || "Tu nuevo reto"}
                  </h2>
                  <p className="mt-2 text-sm muted">
                    {data.description || "Agrega una descripción para tu meta."}
                  </p>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <Preview
                    icon={<Target />}
                    label="Objetivo"
                    value={`${data.targetValue} ${data.targetUnit}`}
                  />
                  <Preview
                    icon={<Eye />}
                    label="Evidencia"
                    value={evidenceLabels[data.evidenceType]}
                  />
                  <Preview
                    icon={<CalendarDays />}
                    label="Frecuencia"
                    value={`${data.validWeekdays.length} días válidos`}
                  />
                  <Preview
                    icon={<Sparkles />}
                    label="Recompensa"
                    value={`${data.pointsPerCompletion} pts por registro`}
                  />
                </div>
                <div className="mx-5 mb-5 flex items-start gap-3 rounded-2xl border border-lime-400/15 bg-lime-400/[.04] p-4 text-xs muted">
                  <ShieldCheck size={18} className="shrink-0 text-lime-300" />
                  <p>
                    Al publicar, estas reglas se congelan en un snapshot. Los
                    cambios futuros en categorías o plantillas no modificarán
                    este reto.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4 text-sm">
                <CheckCircle2 className="text-lime-300" />
                <span>
                  Revisé la duración, meta, evidencia, puntos y participantes.
                </span>
              </label>
            </section>
          )}
          {message && (
            <p
              role="status"
              className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-400/[.06] p-4 text-center text-sm font-bold text-orange-200"
            >
              {message}
            </p>
          )}
          <footer className="mt-7 flex gap-3 border-t border-slate-800 pt-5">
            {step > 1 && (
              <button
                onClick={back}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-700 py-4 font-bold"
              >
                <ArrowLeft size={18} />
                Atrás
              </button>
            )}
            {step < 5 ? (
              <button onClick={next} className="btn flex-[1.5] gap-2 py-4">
                Continuar
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                disabled={publishing || saving}
                onClick={publish}
                className="btn flex-[1.5] gap-2 py-4"
              >
                <Flame size={18} />
                {publishing
                  ? "Publicando…"
                  : data.mode === "SOLO"
                    ? "Comenzar mi reto"
                    : "Enviar invitaciones"}
              </button>
            )}
          </footer>
        </div>
      </main>
    </div>
  );
}

function Title({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black text-lime-300">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
    </div>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block text-sm font-bold">
      <p>{label}</p>
      {hint && (
        <p className="mt-1 text-xs font-normal leading-relaxed muted">{hint}</p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Mode({
  active,
  icon,
  title,
  text,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left ${active ? "border-cyan-300 bg-cyan-400/10" : "border-slate-700 bg-slate-950"}`}
    >
      <span className="text-cyan-300">{icon}</span>
      <strong className="mt-3 block">{title}</strong>
      <p className="mt-1 text-xs muted">{text}</p>
    </button>
  );
}
function Preview({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4">
      <span className="text-lime-300">{icon}</span>
      <span className="mt-3 block text-[10px] font-black text-slate-500">
        {label.toUpperCase()}
      </span>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}
