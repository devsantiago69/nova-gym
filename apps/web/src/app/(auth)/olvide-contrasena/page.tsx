"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Dumbbell, Mail, Send, ShieldCheck } from "lucide-react";
import { appConfig } from "@gymchallenge/config";

type Step = "request" | "verify" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const json = await res.json() as { success: boolean; data?: { maskedEmail?: string }; message: string; errors?: Array<{ message: string }> };
    setLoading(false);
    if (!res.ok) { setMessage(json.errors?.[0]?.message ?? json.message); return; }
    setMaskedEmail(json.data?.maskedEmail ?? "");
    setStep("verify");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/v1/auth/verify-reset-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, code }),
    });
    const json = await res.json() as { success: boolean; data?: { resetUrl?: string }; message: string; errors?: Array<{ message: string }> };
    setLoading(false);
    if (!res.ok) { setMessage(json.errors?.[0]?.message ?? json.message); return; }
    setResetUrl(json.data?.resetUrl ?? "");
    setStep("reset");
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const url = new URL(resetUrl);
    const token = url.searchParams.get("token");
    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: newPassword }),
    });
    const json = await res.json() as { success: boolean; message: string; errors?: Array<{ message: string }> };
    setLoading(false);
    if (!res.ok) { setMessage(json.errors?.[0]?.message ?? json.message); return; }
    setStep("done");
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
          <h1 className="mt-8 max-w-xl text-5xl font-black leading-tight">No te preocupes, <span className="text-lime-400">te ayudamos.</span></h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400">
            Te enviaremos un código de verificación a tu correo electrónico para que puedas restablecer tu contraseña de forma segura.
          </p>
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-lime-300"><Mail size={19} /></span>
              <span className="font-bold">Recibe un código por correo</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-lime-300"><ShieldCheck size={19} /></span>
              <span className="font-bold">Establece una nueva contraseña</span>
            </div>
          </div>
        </section>
        <section className="mx-auto w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <Link href="/login" className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700"><ArrowLeft /></Link>
            <strong className="text-2xl text-lime-400">{appConfig.name}</strong>
            <span className="w-11" />
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {step === "request" && (
              <>
                <p className="text-sm font-bold text-lime-400">RECUPERAR CONTRASEÑA</p>
                <h2 className="mt-2 text-3xl font-black">¿Olvidaste tu contraseña?</h2>
                <p className="mt-2 text-slate-400">Ingresa tu usuario o correo y te enviaremos un código de verificación.</p>
                <form onSubmit={requestCode} className="mt-7 space-y-5">
                  <label className="block">
                    <span className="text-sm font-bold">Usuario o correo</span>
                    <input
                      name="identifier"
                      required
                      minLength={3}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="santiago o tu@correo.com"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400"
                    />
                  </label>
                  {message && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}
                  <button className="btn w-full py-4 text-base" disabled={loading}>
                    {loading ? "Enviando…" : <><Send size={18} className="mr-2 inline" />Enviar código</>}
                  </button>
                </form>
                <p className="mt-4 text-center text-sm text-slate-500">
                  ¿Recordaste tu contraseña? <Link href="/login" className="font-bold text-lime-300">Inicia sesión</Link>
                </p>
              </>
            )}
            {step === "verify" && (
              <>
                <p className="text-sm font-bold text-lime-400">VERIFICAR CÓDIGO</p>
                <h2 className="mt-2 text-3xl font-black">Revisa tu correo</h2>
                <p className="mt-2 text-slate-400">
                  Enviamos un código de 4 dígitos a <strong className="text-white">{maskedEmail}</strong>. Ingresa el código a continuación.
                </p>
                <form onSubmit={verifyCode} className="mt-7 space-y-5">
                  <label className="block">
                    <span className="text-sm font-bold">Código de verificación</span>
                    <input
                      name="code"
                      required
                      minLength={4}
                      maxLength={8}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="1234"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-center font-mono text-2xl tracking-widest outline-none focus:border-lime-400"
                    />
                  </label>
                  {message && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}
                  <button className="btn w-full py-4 text-base" disabled={loading}>
                    {loading ? "Verificando…" : "Verificar código"}
                  </button>
                </form>
                <p className="mt-4 text-center text-sm text-slate-500">
                  ¿No recibiste el código? <button onClick={() => { setStep("request"); setMessage(""); }} className="font-bold text-lime-300">Enviar otro</button>
                </p>
              </>
            )}
            {step === "reset" && (
              <>
                <p className="text-sm font-bold text-lime-400">NUEVA CONTRASEÑA</p>
                <h2 className="mt-2 text-3xl font-black">Establece tu nueva contraseña</h2>
                <p className="mt-2 text-slate-400">Elige una contraseña segura de al menos 12 caracteres.</p>
                <form onSubmit={resetPassword} className="mt-7 space-y-5">
                  <label className="block">
                    <span className="text-sm font-bold">Nueva contraseña</span>
                    <input
                      type="password"
                      name="newPassword"
                      required
                      minLength={12}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 12 caracteres"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400"
                    />
                  </label>
                  {message && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}
                  <button className="btn w-full py-4 text-base" disabled={loading}>
                    {loading ? "Actualizando…" : "Actualizar contraseña"}
                  </button>
                </form>
              </>
            )}
            {step === "done" && (
              <div className="text-center">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-lime-400/15 text-lime-400">
                  <ShieldCheck size={40} />
                </div>
                <h2 className="text-3xl font-black">¡Listo!</h2>
                <p className="mt-3 text-slate-400">Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
                <Link href="/login" className="btn mt-8 inline-flex w-full items-center justify-center gap-2 py-4 text-base">
                  Iniciar sesión
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
