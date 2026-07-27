"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Dumbbell, CheckCircle, KeyRound, Loader2 } from "lucide-react";
import { appConfig } from "@gymchallenge/config";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!token) { setValidating(false); return; }
    setValidating(false);
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json() as { success: boolean; message: string; errors?: Array<{ message: string }> };
    setLoading(false);
    if (!res.ok) { setMessage(json.errors?.[0]?.message ?? json.message); return; }
    setDone(true);
  }

  if (validating) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#05080d]">
        <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
      </main>
    );
  }

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#05080d] px-4">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white">Enlace inválido</h1>
          <p className="mt-3 text-slate-400">El enlace de recuperación no es válido o no fue proporcionado.</p>
          <Link href="/olvide-contrasena" className="btn mt-6 inline-flex items-center gap-2">
            Solicitar un nuevo enlace
          </Link>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#05080d]">
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-10 lg:px-10">
          <section className="mx-auto w-full max-w-md text-center">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-lime-400/15 text-lime-400">
                <CheckCircle size={40} />
              </div>
              <h1 className="text-3xl font-black">¡Contraseña actualizada!</h1>
              <p className="mt-3 text-slate-400">Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <Link href="/login" className="btn mt-8 inline-flex w-full items-center justify-center gap-2 py-4 text-base">
                <KeyRound size={19} />Iniciar sesión
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05080d]">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_.9fr] lg:px-10">
        <section className="hidden lg:block">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
            <ArrowLeft size={17} />Volver al inicio de sesión
          </Link>
          <div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-lime-500/30 bg-lime-400/10 px-4 py-3 text-lime-300">
            <Dumbbell /><strong>{appConfig.name}</strong>
          </div>
          <h1 className="mt-8 max-w-xl text-5xl font-black leading-tight">Ya casi <span className="text-lime-400">terminas.</span></h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400">
            Elige una contraseña segura que no hayas usado antes. Te recomendamos combinar letras, números y símbolos.
          </p>
        </section>
        <section className="mx-auto w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <Link href="/login" className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700"><ArrowLeft /></Link>
            <strong className="text-2xl text-lime-400">{appConfig.name}</strong>
            <span className="w-11" />
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <p className="text-sm font-bold text-lime-400">RESTABLECER CONTRASEÑA</p>
            <h2 className="mt-2 text-3xl font-black">Nueva contraseña</h2>
            <p className="mt-2 text-slate-400">Ingresa tu nueva contraseña. Debe tener al menos 12 caracteres.</p>
            <form onSubmit={submit} className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-bold">Nueva contraseña</span>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 12 caracteres"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400"
                />
              </label>
              {message && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}
              <button className="btn w-full py-4 text-base" disabled={loading}>
                {loading ? "Actualizando…" : <><KeyRound size={18} className="mr-2 inline" />Actualizar contraseña</>}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
