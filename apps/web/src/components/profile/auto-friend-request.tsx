"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, UserPlus } from "lucide-react";

export function AutoFriendRequest({ targetId, loginUrl }: { targetId?: string; loginUrl: string }) {
  const [status, setStatus] = useState(targetId ? "Enviando solicitud…" : "Inicia sesión para conectar");
  useEffect(() => {
    if (!targetId) return;
    let active = true;
    void fetch("/api/v1/friends", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", targetId }) }).then(async (response) => {
      const json = await response.json() as { message: string; errors?: Array<{ message: string }> };
      if (!active) return;
      if (response.ok) setStatus("¡Solicitud enviada! Ahora solo falta que la acepte.");
      else if (["Ya son amigos", "Ya existe una solicitud pendiente"].some((text) => (json.errors?.[0]?.message ?? json.message).includes(text))) setStatus(json.errors?.[0]?.message ?? json.message);
      else setStatus(json.errors?.[0]?.message ?? json.message);
    }).catch(() => active && setStatus("No pudimos enviar la solicitud. Intenta nuevamente."));
    return () => { active = false; };
  }, [targetId]);
  if (!targetId) return <Link href={loginUrl} className="btn mt-6 w-full gap-2 py-4"><UserPlus/>Iniciar sesión y agregar</Link>;
  return <div role="status" className="mt-6 flex items-center gap-3 rounded-2xl border border-lime-400/25 bg-lime-400/[.07] p-4 font-bold text-lime-200">{status === "Enviando solicitud…" ? <LoaderCircle className="animate-spin"/> : <CheckCircle2/>}{status}</div>;
}
