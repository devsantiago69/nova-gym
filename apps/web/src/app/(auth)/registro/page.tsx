"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Clipboard, Copy, Dumbbell, KeyRound, LockKeyhole, RefreshCw, Rocket, ShieldCheck, Sparkles, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { appConfig } from "@gymchallenge/config";

function generatePassword() {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_+"];
  const random = (characters: string) => characters[crypto.getRandomValues(new Uint32Array(1))[0]! % characters.length]!;
  const characters = [...groups.map(random), ...Array.from({ length: 12 }, () => random(groups.join("")))];
  for (let index = characters.length - 1; index > 0; index -= 1) { const target = crypto.getRandomValues(new Uint32Array(1))[0]! % (index + 1); [characters[index], characters[target]] = [characters[target]!, characters[index]!]; }
  return characters.join("");
}

type Created = { username: string; password: string; name: string; plan: string; trialDays: number };
const benefits: ReadonlyArray<[LucideIcon, string]> = [[Rocket,"Acceso inmediato"],[UsersRound,"Retos con amigos"],[ShieldCheck,"Fotos y ubicación privadas"]];

export default function RegisterPage() {
  const router = useRouter();
  const [password, setPassword] = useState(generatePassword);
  const [created, setCreated] = useState<Created>();
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  async function copyCredentials(value?: Created) {
    const credentials = value ?? created; if (!credentials) return;
    try { await navigator.clipboard.writeText(`Nova Gym\nUsuario: @${credentials.username}\nContraseña: ${credentials.password}`); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/v1/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const json = await response.json() as { data?: { username: string; profile: { firstName: string; lastName: string }; subscriptions: Array<{ plan: { name: string; trialDays: number } }> }; message: string; errors?: Array<{ message: string }> };
    setSaving(false);
    if (!response.ok || !json.data) { setMessage(json.errors?.[0]?.message ?? json.message); return; }
    const result = { username: json.data.username, password, name: `${json.data.profile.firstName} ${json.data.profile.lastName}`, plan: json.data.subscriptions[0]?.plan.name ?? "Gratis", trialDays: json.data.subscriptions[0]?.plan.trialDays ?? 0 };
    setCreated(result); void copyCredentials(result);
  }

  async function enterNow() {
    if (!created) return; setSaving(true); setMessage("");
    const result = await signIn("credentials", { identifier: created.username, password: created.password, redirect: false });
    setSaving(false); if (result?.error) { setMessage("La cuenta fue creada, pero no pudimos iniciar sesión automáticamente. Usa las credenciales copiadas."); return; }
    router.push("/inicio"); router.refresh();
  }

  return <main className="relative min-h-screen overflow-hidden bg-[#05080d]"><div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl"/><div className="pointer-events-none absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-lime-400/10 blur-3xl"/><div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 lg:grid-cols-[.85fr_1.15fr] lg:px-10">
    <section className="hidden lg:block"><Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft size={17}/>Volver al acceso</Link><div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-lime-500/30 bg-lime-400/10 px-4 py-3 text-lime-300"><Dumbbell/><strong>{appConfig.name}</strong></div><h1 className="mt-8 max-w-xl text-5xl font-black leading-tight">Empieza hoy. Tu próxima racha está a <span className="text-lime-400">un minuto.</span></h1><p className="mt-5 max-w-lg text-lg text-slate-400">Crea tu cuenta, guarda tu acceso y registra tu primer entrenamiento.</p><div className="mt-8 space-y-3">{benefits.map(([Icon,label]) => <div key={label} className="flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-lime-300"><Icon size={19}/></span>{label}</div>)}</div></section>
    <section className="mx-auto w-full max-w-2xl"><div className="mb-5 flex items-center justify-between lg:hidden"><Link href="/login" className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700"><ArrowLeft/></Link><strong className="text-xl text-lime-400">{appConfig.name}</strong><span className="w-11"/></div>
      {!created ? <form onSubmit={submit} className="overflow-hidden rounded-[30px] border border-slate-800 bg-slate-900/85 shadow-2xl backdrop-blur-xl"><div className="border-b border-slate-800 bg-gradient-to-r from-lime-400/10 to-cyan-400/5 p-6 sm:p-8"><div className="flex items-center justify-between"><span className="rounded-full bg-lime-400 px-3 py-1 text-[10px] font-black text-slate-950">PASO 1 DE 2</span><span className="text-xs font-bold text-lime-300">Plan gratis</span></div><h2 className="mt-4 text-3xl font-black">Crea tu cuenta</h2><p className="mt-2 text-slate-400">Solo necesitamos tus datos básicos. Tu contraseña ya está preparada.</p></div><div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
        <label className="text-sm font-bold">Nombre<input name="firstName" required minLength={2} autoComplete="given-name" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 outline-none focus:border-lime-400"/></label><label className="text-sm font-bold">Apellidos<input name="lastName" required minLength={2} autoComplete="family-name" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 outline-none focus:border-lime-400"/></label><label className="text-sm font-bold">Tu usuario<div className="mt-2 flex items-center rounded-2xl border border-slate-700 bg-slate-950/80 focus-within:border-lime-400"><UserRound size={18} className="ml-4 text-slate-500"/><span className="pl-2 text-slate-500">@</span><input name="username" required minLength={3} autoCapitalize="none" autoCorrect="off" className="min-w-0 flex-1 bg-transparent p-3.5 pl-1 outline-none" placeholder="santiago.fit"/></div></label><label className="text-sm font-bold">WhatsApp<div className="mt-2 flex items-center rounded-2xl border border-slate-700 bg-slate-950/80 focus-within:border-lime-400"><span className="ml-4 text-slate-500">WA</span><input name="whatsappNumber" required pattern="\+[1-9][0-9]{7,14}" defaultValue="+57" className="min-w-0 flex-1 bg-transparent p-3.5 outline-none"/></div></label><label className="text-sm font-bold sm:col-span-2">Correo <span className="font-normal text-slate-500">(opcional)</span><input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-3.5 outline-none focus:border-lime-400"/></label>
        <div className="rounded-2xl border border-lime-400/25 bg-lime-400/[.06] p-4 sm:col-span-2"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400 text-slate-950"><KeyRound size={18}/></span><div><p className="text-sm font-black">Tu contraseña segura</p><p className="text-[10px] muted">La copiaremos al crear la cuenta</p></div></div><button type="button" onClick={() => setPassword(generatePassword())} className="inline-flex items-center gap-1 text-xs font-bold text-lime-300"><RefreshCw size={14}/>Otra</button></div><div className="mt-3 flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950"><input name="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required className="min-w-0 flex-1 bg-transparent p-3 font-mono text-sm outline-none"/><button type="button" onClick={() => { void navigator.clipboard.writeText(password).catch(() => undefined); }} aria-label="Copiar contraseña" className="border-l border-slate-700 px-4 text-lime-300"><Clipboard size={17}/></button></div></div>
        <label className="flex items-start gap-3 text-xs text-slate-400 sm:col-span-2"><input type="checkbox" required className="mt-0.5"/><span>Acepto crear mi cuenta y que mis evidencias deportivas sean privadas según las reglas de Nova Gym.</span></label>{message && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-2">{message}</p>}<button disabled={saving || !password} className="btn gap-2 py-4 text-base sm:col-span-2"><Sparkles size={19}/>{saving ? "Creando tu cuenta…" : "Crear mi cuenta gratis"}</button><p className="text-center text-xs text-slate-500 sm:col-span-2">¿Ya tienes cuenta? <Link href="/login" className="font-bold text-lime-300">Inicia sesión</Link></p>
      </div></form> : <section className="overflow-hidden rounded-[30px] border border-lime-400/30 bg-slate-900/90 shadow-[0_0_80px_rgba(163,230,53,.10)]"><div className="bg-gradient-to-br from-lime-400 to-emerald-400 p-7 text-slate-950 sm:p-9"><div className="flex items-center justify-between"><span className="rounded-full bg-slate-950/15 px-3 py-1 text-[10px] font-black">PASO 2 DE 2</span><CheckCircle2 size={34}/></div><h2 className="mt-5 text-3xl font-black">¡Bienvenido, {created.name.split(" ")[0]}!</h2><p className="mt-2 font-medium text-slate-800">Tu cuenta está lista y tu primera racha puede empezar hoy.</p></div><div className="p-6 sm:p-8"><div className="flex items-center gap-2 text-xs font-black text-lime-300"><LockKeyhole size={15}/>GUARDA TU ACCESO</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-950 p-4"><span className="text-xs muted">Usuario</span><p className="mt-1 font-mono text-lg">@{created.username}</p></div><div className="rounded-2xl bg-slate-950 p-4"><span className="text-xs muted">Contraseña</span><p className="mt-1 break-all font-mono text-sm">{created.password}</p></div></div><div className="mt-3 flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm"><Check className="text-cyan-300"/><span>Plan <strong>{created.plan}</strong>{created.trialDays > 0 ? ` · ${created.trialDays} días incluidos` : " activado"}</span></div>{message && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{message}</p>}<button type="button" onClick={() => copyCredentials()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 py-3.5 font-bold transition hover:border-lime-400"><Copy size={18}/>{copied ? "¡Credenciales copiadas!" : "Copiar usuario y contraseña"}</button><button type="button" disabled={saving} onClick={enterNow} className="btn mt-3 w-full gap-2 py-4 text-base"><Rocket size={19}/>{saving ? "Ingresando…" : "Entrar ahora"}</button><p className="mt-4 text-center text-xs text-slate-500">También enviamos el acceso al portapapeles de este dispositivo.</p></div></section>}
    </section>
  </div></main>;
}
