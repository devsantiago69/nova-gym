"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, UserRound, X } from "lucide-react";

type Props = {
  needsOnboarding: boolean;
};

export function OnboardingModal({ needsOnboarding }: Props) {
  const [open, setOpen] = useState(needsOnboarding);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [whatsapp, setWhatsapp] = useState("+57");

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/v1/profile/onboarding", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        whatsappNumber: whatsapp.trim() || undefined,
      }),
    });
    const json = (await res.json()) as {
      success: boolean;
      message: string;
      errors?: Array<{ message: string }>;
    };
    setSaving(false);
    if (!res.ok) {
      setMessage(json.errors?.[0]?.message ?? json.message);
      return;
    }
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="relative bg-gradient-to-br from-lime-400 to-emerald-400 p-6 text-slate-950 sm:p-8">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-950/10 transition hover:bg-slate-950/20"
          >
            <X size={16} />
          </button>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950/15">
            <Sparkles size={22} />
          </div>
          <h2 className="mt-4 text-2xl font-black sm:text-3xl">
            ¡Bienvenido!
          </h2>
          <p className="mt-2 font-medium text-slate-800">
            Cuéntanos un poco sobre ti para personalizar tu experiencia.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
          <label className="block text-sm font-bold">
            Tu nombre
            <div className="mt-2 flex items-center rounded-2xl border border-slate-700 bg-slate-950/80 focus-within:border-lime-400">
              <UserRound size={18} className="ml-4 text-slate-500" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
                placeholder="Santiago"
                className="min-w-0 flex-1 bg-transparent p-3.5 outline-none"
              />
            </div>
          </label>
          <label className="block text-sm font-bold">
            Tus apellidos
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              minLength={2}
              placeholder="Restrepo"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 outline-none focus:border-lime-400"
            />
          </label>
          <label className="block text-sm font-bold">
            WhatsApp{" "}
            <span className="font-normal text-slate-500">(opcional)</span>
            <div className="mt-2 flex items-center rounded-2xl border border-slate-700 bg-slate-950/80 focus-within:border-lime-400">
              <span className="ml-4 text-sm text-slate-500">WA</span>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+573001234567"
                className="min-w-0 flex-1 bg-transparent p-3.5 outline-none"
              />
            </div>
          </label>
          {message && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={saving || !firstName.trim() || !lastName.trim()}
            className="btn flex w-full items-center justify-center gap-2 py-4 text-base"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Check size={18} />
            )}
            {saving ? "Guardando…" : "Completar mi perfil"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full text-center text-xs font-bold text-slate-500 transition hover:text-slate-300"
          >
            Ahora no, completar después
          </button>
        </form>
      </div>
    </div>
  );
}
