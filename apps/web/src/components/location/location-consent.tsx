"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  LocateFixed,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  locationErrorMessage,
  requestBrowserLocation,
} from "@/lib/browser-location";

type ConsentState = "idle" | "requesting" | "granted" | "denied" | "saving";

export function LocationConsent({
  preference,
}: {
  preference: boolean | null;
}) {
  const [state, setState] = useState<ConsentState>("idle");
  const [visible, setVisible] = useState(preference === null);
  const [accuracy, setAccuracy] = useState<number>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (preference !== true || !("geolocation" in navigator)) return;
    if (!("permissions" in navigator)) return;
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state === "granted")
          return requestBrowserLocation().catch(() => undefined);
        return undefined;
      })
      .catch(() => undefined);
  }, [preference]);

  async function savePreference(enabled: boolean) {
    const response = await fetch("/api/v1/profile/location-preference", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error("PREFERENCE_SAVE_FAILED");
  }

  async function enableLocation() {
    setState("requesting");
    setError("");
    try {
      const position = await requestBrowserLocation(true);
      await savePreference(true);
      setAccuracy(Math.round(position.accuracy));
      setState("granted");
      window.setTimeout(() => setVisible(false), 1600);
    } catch (caught) {
      setState("denied");
      setError(locationErrorMessage(caught));
    }
  }

  async function continueWithoutLocation() {
    setState("saving");
    setError("");
    try {
      await savePreference(false);
      setVisible(false);
    } catch {
      setState("denied");
      setError("No pudimos guardar tu elección. Intenta nuevamente.");
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center overflow-y-auto overscroll-contain bg-slate-950/80 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-8 backdrop-blur-md sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-title"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(163,230,53,.14),transparent_34%),linear-gradient(150deg,rgba(15,23,42,.98),rgba(2,6,23,.98))] p-5 shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:p-7"
      >
        <button
          type="button"
          onClick={() => void continueWithoutLocation()}
          aria-label="Continuar sin ubicación"
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-slate-950/60 p-2 text-slate-400 transition hover:text-white"
        >
          <X size={19} />
        </button>

        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-400 text-slate-950 shadow-[0_0_32px_rgba(163,230,53,.2)]">
          <MapPin size={25} />
        </div>
        <p className="mt-5 text-[10px] font-black tracking-[.16em] text-lime-300">
          TÚ DECIDES
        </p>
        <h2 id="location-title" className="mt-1 pr-8 text-2xl font-black sm:text-3xl">
          ¿Quieres validar el lugar de tus entrenamientos?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Es opcional. Si la activas, Nova guarda un punto únicamente al iniciar
          y finalizar. Si eliges continuar sin ella, podrás registrar tu
          entrenamiento normalmente.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="flex gap-3 rounded-2xl border border-lime-300/15 bg-lime-300/[.06] p-3.5">
            <ShieldCheck className="shrink-0 text-lime-300" size={20} />
            <p className="text-xs leading-relaxed text-slate-300">
              Sin seguimiento en segundo plano ni ubicación continua.
            </p>
          </div>
          <div className="flex gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05] p-3.5">
            <LocateFixed className="shrink-0 text-cyan-300" size={20} />
            <p className="text-xs leading-relaxed text-slate-300">
              Puedes cambiar esta decisión cuando quieras en Perfil.
            </p>
          </div>
        </div>

        {state === "denied" ? (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.07] p-4">
            <strong className="text-sm text-amber-200">No se activó la ubicación</strong>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{error}</p>
            <Link
              href="/perfil?ajuste=privacidad#ajustes"
              onClick={() => setVisible(false)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-black text-cyan-300"
            >
              Revisar privacidad en Perfil <ArrowRight size={14} />
            </Link>
          </div>
        ) : null}

        {state === "granted" ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-lime-200">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-300 text-slate-950">
              <Check size={18} />
            </span>
            <strong>Ubicación lista{accuracy ? ` · precisión ±${accuracy} m` : ""}</strong>
          </div>
        ) : (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void enableLocation()}
              disabled={state === "requesting" || state === "saving"}
              className="btn order-1 w-full gap-2 py-3.5 sm:order-2"
            >
              <LocateFixed size={18} />
              {state === "requesting" ? "Solicitando…" : "Usar ubicación"}
            </button>
            <button
              type="button"
              onClick={() => void continueWithoutLocation()}
              disabled={state === "requesting" || state === "saving"}
              className="order-2 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3.5 text-sm font-black text-slate-200 sm:order-1"
            >
              {state === "saving" ? "Guardando…" : "Ahora no"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
