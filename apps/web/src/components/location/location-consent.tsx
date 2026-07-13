"use client";

import { useEffect, useState } from "react";
import { LocateFixed, MapPin, ShieldCheck, X } from "lucide-react";

type PermissionState = "checking" | "prompt" | "requesting" | "granted" | "denied";

export function LocationConsent() {
  const [state, setState] = useState<PermissionState>("checking");
  const [accuracy, setAccuracy] = useState<number>();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let permission: PermissionStatus | undefined;
    async function check() {
      if (!("geolocation" in navigator)) { setState("denied"); setVisible(true); return; }
      try {
        permission = await navigator.permissions.query({ name: "geolocation" });
        const update = () => {
          if (permission?.state === "granted") { setState("granted"); setVisible(false); }
          else { setState(permission?.state === "denied" ? "denied" : "prompt"); setVisible(true); }
        };
        permission.addEventListener("change", update);
        update();
      } catch { setState("prompt"); setVisible(true); }
    }
    void check();
    return () => permission?.removeEventListener("change", () => undefined);
  }, []);

  function requestLocation() {
    setState("requesting");
    navigator.geolocation.getCurrentPosition(
      position => { setAccuracy(Math.round(position.coords.accuracy)); setState("granted"); setTimeout(() => setVisible(false), 1800); },
      () => { setState("denied"); setVisible(true); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  if (!visible || state === "checking") return null;
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/75 p-3 backdrop-blur-sm sm:place-items-center">
    <section role="dialog" aria-modal="true" aria-labelledby="location-title" className="card relative w-full max-w-md p-6 shadow-2xl">
      {state !== "prompt" && <button type="button" onClick={() => setVisible(false)} aria-label="Cerrar" className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-800"><X size={20}/></button>}
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-400/15"><MapPin className="text-lime-400"/></div>
      <h2 id="location-title" className="mt-5 text-2xl font-black">Activa tu ubicación</h2>
      <p className="mt-2 muted">Nova Gym la utiliza únicamente para verificar el lugar al iniciar y finalizar una asistencia. No hacemos seguimiento continuo.</p>
      <div className="mt-5 flex gap-3 rounded-xl bg-slate-950 p-4"><ShieldCheck className="shrink-0 text-lime-400"/><p className="text-sm">Tus coordenadas son privadas y solo un administrador autorizado puede revisarlas.</p></div>
      {state === "denied" && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">El permiso está bloqueado. Pulsa el icono de ubicación junto a la dirección del navegador, selecciona “Permitir” y vuelve a intentarlo.</p>}
      {state === "granted" ? <div className="mt-5 flex items-center gap-3 rounded-xl bg-lime-400/10 p-4 text-lime-300"><LocateFixed/><strong>Ubicación activada{accuracy?` · precisión ${accuracy} m`:""}</strong></div> : <button type="button" onClick={requestLocation} disabled={state === "requesting"} className="btn mt-5 w-full py-4">{state === "requesting"?"Solicitando permiso…":"Permitir ubicación"}</button>}
    </section>
  </div>;
}
