"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Play } from "lucide-react";

export function StartRoutineButton({ routineId }: { routineId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <div><button disabled={busy} onClick={async()=>{setBusy(true);setMessage("");const response=await fetch(`/api/v1/routines/${routineId}/sessions`,{method:"POST"});const payload=await response.json();setBusy(false);if(!response.ok){setMessage(payload.errors?.[0]?.message??"No pudimos iniciar");return;}router.push(`/rutinas/sesion/${payload.data.id}`)}} className="btn w-full gap-2 py-4 text-base">{busy?<LoaderCircle className="animate-spin"/>:<Play fill="currentColor"/>} Iniciar entrenamiento</button>{message?<p className="mt-3 rounded-xl bg-red-400/10 p-3 text-center text-xs font-bold text-red-200">{message}</p>:null}</div>;
}

