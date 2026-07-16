"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Flame,
  LoaderCircle,
  LockKeyhole,
  Plus,
  X,
} from "lucide-react";

type Completion = {
  id: string;
  userId: string;
  name: string;
  logicalDate: string;
  status: string;
  points: number;
  numericValue?: number | null;
  unit?: string | null;
};
type ChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  points: number;
};
const evidenceLabels: Record<string, string> = {
  NONE: "Confirmación honesta",
  CHECK_IN: "Check-in rápido",
  ONE_PHOTO: "Una fotografía privada",
  TWO_PHOTOS: "Fotografía inicial y final",
  TEXT: "Confirmación escrita",
  CHECKLIST: "Lista de actividades",
  NUMERIC_VALUE: "Registrar una cantidad",
  PHOTO_AND_VALUE: "Fotografía y cantidad",
};

export function ChallengeCompletionPanel({
  challengeId,
  challengeName,
  status,
  evidenceType,
  targetUnit,
  maxDailyCompletions,
  isGymAttendance,
  currentUserId,
  checklistItems,
  completions,
  numericMinimum,
  numericMaximum,
  allowDecimals,
}: {
  challengeId: string;
  challengeName: string;
  status: string;
  evidenceType: string;
  targetUnit: string;
  maxDailyCompletions: number;
  isGymAttendance: boolean;
  currentUserId: string;
  checklistItems: ChecklistItem[];
  completions: Completion[];
  numericMinimum?: number | undefined;
  numericMaximum?: number | undefined;
  allowDecimals?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    data.set("challengeId", challengeId);
    data.set("idempotencyKey", crypto.randomUUID());
    data.set("checklist", JSON.stringify(data.getAll("checklistItem")));
    const response = await fetch("/api/v1/challenge-completions", {
      method: "POST",
      body: data,
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setBusy(false);
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok) setTimeout(() => location.reload(), 900);
  }
  const ownToday = completions.some(
    (item) =>
      item.userId === currentUserId &&
      new Date(item.logicalDate).toDateString() === new Date().toDateString() &&
      ["VALID", "SUBMITTED"].includes(item.status),
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/[.06] p-3 text-left transition hover:border-lime-400/50"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400/10 text-lime-300">
          {ownToday ? <CheckCircle2 size={19} /> : <Plus size={19} />}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm">
            {ownToday ? "Cumplimiento de hoy listo" : "Registrar cumplimiento"}
          </strong>
          <small className="muted">
            {evidenceLabels[evidenceType] ?? evidenceType} · máx.{" "}
            {maxDailyCompletions}/día
          </small>
        </span>
        <ChevronRight size={18} className="text-slate-500" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-xl overflow-hidden rounded-[30px] border border-slate-700 bg-slate-900 shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-800 bg-gradient-to-r from-lime-400/10 to-cyan-400/5 p-5">
              <div>
                <p className="text-xs font-black text-lime-300">
                  REGISTRO DEL RETO
                </p>
                <h2 className="mt-1 text-2xl font-black">{challengeName}</h2>
                <p className="mt-1 text-sm muted">
                  {evidenceLabels[evidenceType] ?? evidenceType}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-950 p-3"
              >
                <X />
              </button>
            </header>
            <div className="p-5">
              {isGymAttendance ? (
                <div className="rounded-[24px] border border-orange-400/20 bg-orange-400/[.06] p-5 text-center">
                  <Flame className="mx-auto text-orange-300" size={34} />
                  <h3 className="mt-3 text-xl font-black">
                    Este reto avanza con tu entrenamiento
                  </h3>
                  <p className="mt-2 text-sm muted">
                    Registra inicio y final desde Asistencia. Al terminar, los
                    puntos se suman automáticamente aquí.
                  </p>
                  <Link href="/asistencia" className="btn mt-5 w-full">
                    Ir a registrar asistencia
                  </Link>
                </div>
              ) : status !== "ACTIVE" ? (
                <p className="rounded-2xl bg-slate-950 p-5 text-center muted">
                  Este reto no está activo y no admite nuevos registros.
                </p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  {evidenceType === "NONE" || evidenceType === "CHECK_IN" ? (
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[.05] p-4 text-sm">
                      <Check className="mb-2 text-cyan-300" />
                      <strong>Confirmación personal</strong>
                      <p className="mt-1 muted">
                        Al continuar confirmas honestamente que cumpliste la
                        actividad.
                      </p>
                    </div>
                  ) : null}
                  {evidenceType === "TEXT" && (
                    <label className="block text-sm font-bold">
                      Cuéntanos qué completaste
                      <textarea
                        name="text"
                        minLength={3}
                        maxLength={2000}
                        required
                        rows={5}
                        placeholder="Escribe una reflexión o resumen breve…"
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 outline-none focus:border-lime-400"
                      />
                    </label>
                  )}
                  {(evidenceType === "NUMERIC_VALUE" ||
                    evidenceType === "PHOTO_AND_VALUE") && (
                    <label className="block rounded-2xl border border-cyan-400/25 bg-cyan-400/[.05] p-4 text-sm font-bold">
                      ¿Cuántos {targetUnit} completaste?
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          name="numericValue"
                          type="number"
                          required
                          min={numericMinimum ?? 0}
                          max={numericMaximum ?? 10000}
                          step={allowDecimals ? "0.001" : "1"}
                          inputMode="decimal"
                          className="control text-2xl font-black"
                          placeholder="0"
                        />
                        <span className="shrink-0 text-cyan-300">
                          {targetUnit}
                        </span>
                      </div>
                      <small className="mt-2 block font-normal muted">
                        Permitido: {numericMinimum ?? 0} a {numericMaximum ?? 10000}
                        {allowDecimals ? " · admite decimales" : " · solo enteros"}
                      </small>
                    </label>
                  )}
                  {(evidenceType === "ONE_PHOTO" ||
                    evidenceType === "PHOTO_AND_VALUE") && (
                    <label className="block rounded-2xl border border-dashed border-lime-400/40 bg-slate-950 p-5 text-center font-bold">
                      <Camera className="mx-auto mb-2 text-lime-300" />
                      Agregar fotografía privada
                      <input
                        name="photo"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        required
                        className="mt-3 block w-full text-xs muted"
                      />
                    </label>
                  )}
                  {evidenceType === "TWO_PHOTOS" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="rounded-2xl border border-dashed border-cyan-400/35 bg-slate-950 p-4 text-center text-sm font-bold">
                        <Camera className="mx-auto mb-2 text-cyan-300" />
                        Fotografía inicial
                        <input
                          name="startPhoto"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          required
                          className="mt-3 block w-full text-xs muted"
                        />
                      </label>
                      <label className="rounded-2xl border border-dashed border-lime-400/35 bg-slate-950 p-4 text-center text-sm font-bold">
                        <Camera className="mx-auto mb-2 text-lime-300" />
                        Fotografía final
                        <input
                          name="endPhoto"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          required
                          className="mt-3 block w-full text-xs muted"
                        />
                      </label>
                    </div>
                  )}
                  {evidenceType === "CHECKLIST" && (
                    <fieldset>
                      <legend className="mb-3 font-black">
                        Completa las actividades
                      </legend>
                      <div className="space-y-2">
                        {checklistItems.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <input
                              name="checklistItem"
                              value={item.id}
                              type="checkbox"
                              required={item.required}
                              className="h-5 w-5 accent-lime-400"
                            />
                            <span className="flex-1 font-bold">
                              {item.label}
                            </span>
                            {item.points > 0 && (
                              <small className="text-lime-300">
                                +{item.points} pts
                              </small>
                            )}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <div className="flex items-start gap-2 rounded-2xl bg-slate-950 p-4 text-xs muted">
                    <LockKeyhole size={17} className="shrink-0 text-lime-300" />
                    Tus archivos y textos son privados. Los demás participantes
                    solo ven tu avance, fecha y puntos.
                  </div>
                  {message && (
                    <p
                      role="status"
                      className="rounded-2xl border border-slate-700 p-3 text-center text-sm font-bold text-orange-200"
                    >
                      {message}
                    </p>
                  )}
                  <button disabled={busy} className="btn w-full gap-2 py-4">
                    {busy ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <ClipboardCheck />
                    )}
                    {busy ? "Validando…" : "Confirmar cumplimiento"}
                  </button>
                </form>
              )}
              <div className="mt-6 border-t border-slate-800 pt-5">
                <h3 className="text-sm font-black">Actividad reciente</h3>
                <div className="mt-3 space-y-2">
                  {completions.length === 0 ? (
                    <p className="rounded-2xl bg-slate-950 p-4 text-sm muted">
                      Aún no hay cumplimientos registrados.
                    </p>
                  ) : (
                    completions.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl bg-slate-950 p-3"
                      >
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-xl ${item.status === "VALID" ? "bg-lime-400 text-slate-950" : "bg-orange-400/10 text-orange-300"}`}
                        >
                          <Check size={17} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">
                            {item.name}
                          </strong>
                          <small className="muted">
                            {new Date(item.logicalDate).toLocaleDateString(
                              "es-CO",
                              { day: "numeric", month: "short" },
                            )}{" "}
                            ·{" "}
                            {item.status === "VALID"
                              ? "Validado"
                              : "En revisión"}
                            {item.numericValue !== null &&
                              item.numericValue !== undefined && (
                                <> · {item.numericValue} {item.unit}</>
                              )}
                          </small>
                        </div>
                        <strong className="text-sm text-lime-300">
                          +{item.points}
                        </strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
