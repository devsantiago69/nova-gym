"use client";

import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Languages,
  LockKeyhole,
  Mail,
  MapPin,
  Play,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  UserRound,
} from "lucide-react";

type Locale = "es" | "en";
type Settings = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  whatsappNumber: string;
  bio: string;
  locale: Locale;
  localeAuto: boolean;
  storyDurationSeconds: number;
  timezone: string;
  showActiveChallenges: boolean;
};

const languages: Array<{
  code: Locale;
  flag: string;
  name: string;
  detail: string;
}> = [
  { code: "es", flag: "🇨🇴", name: "Español", detail: "Latinoamérica" },
  { code: "en", flag: "🇺🇸", name: "English", detail: "United States" },
];

const timezones = [
  ["America/Bogota", "Bogotá · Colombia"],
  ["America/Mexico_City", "Ciudad de México"],
  ["America/Lima", "Lima · Perú"],
  ["America/Santiago", "Santiago · Chile"],
  ["America/Argentina/Buenos_Aires", "Buenos Aires"],
  ["America/New_York", "New York"],
  ["Europe/Madrid", "Madrid · España"],
] as const;

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3.5 outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/10";

export function ProfileAccountCenter({ initial }: { initial: Settings }) {
  const [tab, setTab] = useState<
    "identity" | "language" | "stories" | "security"
  >("identity");
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">(
    "success",
  );
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);

  const passwordStrength = useMemo(() => {
    const value = passwords.newPassword;
    return [
      value.length >= 12,
      /[A-Z]/.test(value),
      /[a-z]/.test(value),
      /\d/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ].filter(Boolean).length;
  }, [passwords.newPassword]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function saveSettings(event?: React.FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/v1/profile/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setSaving(false);
    setMessageKind(response.ok ? "success" : "error");
    setMessage(
      response.ok ? json.message : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok) window.location.reload();
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessageKind("error");
      setMessage("Las contraseñas nuevas no coinciden");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/v1/profile/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }),
    });
    const json = (await response.json()) as {
      message: string;
      errors?: Array<{ message: string }>;
    };
    setSaving(false);
    setMessageKind(response.ok ? "success" : "error");
    setMessage(
      response.ok
        ? "Contraseña actualizada. Volveremos a iniciar sesión para proteger tu cuenta."
        : (json.errors?.[0]?.message ?? json.message),
    );
    if (response.ok)
      window.setTimeout(() => void signOut({ callbackUrl: "/login" }), 1200);
  }

  const tabs = [
    ["identity", UserRound, "Mi identidad", "Perfil social"],
    ["language", Languages, "Idioma y región", "Tu experiencia"],
    ["stories", Play, "Mis historias", "Duración y reproducción"],
    ["security", KeyRound, "Seguridad", "Contraseña"],
  ] as const;

  return (
    <section className="mt-7 overflow-hidden rounded-[30px] border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 shadow-[0_24px_80px_rgba(0,0,0,.2)]">
      <header className="border-b border-slate-800 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[.18em] text-cyan-300">
              CENTRO DE CUENTA
            </p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              Tu perfil, a tu manera.
            </h2>
            <p className="mt-2 text-sm muted">
              Controla cómo te presentas, el idioma de Nova Gym y la seguridad
              de tu cuenta.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-2 text-xs font-black text-lime-300">
            <ShieldCheck size={15} />
            DATOS PROTEGIDOS
          </span>
        </div>
      </header>
      <div className="grid lg:grid-cols-[280px_1fr]">
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-800 p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:content-start lg:border-b-0 lg:border-r lg:p-5">
          {tabs.map(([id, Icon, label, detail]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setMessage("");
              }}
              className={`flex min-w-[170px] items-center gap-3 rounded-2xl border p-3 text-left transition lg:min-w-0 ${tab === id ? "border-lime-400/40 bg-lime-400/10" : "border-transparent hover:bg-slate-800/60"}`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tab === id ? "bg-lime-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}
              >
                <Icon size={19} />
              </span>
              <span>
                <strong className="block text-sm">{label}</strong>
                <small className="text-slate-500">{detail}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 p-5 sm:p-7 lg:p-8">
          {tab === "identity" && (
            <form onSubmit={saveSettings} className="space-y-5">
              <div>
                <p className="text-xs font-black text-lime-300">
                  PERFIL SOCIAL
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  Así te ve tu comunidad
                </h3>
                <p className="mt-1 text-sm muted">
                  Tu nombre, usuario y biografía aparecen en amigos, retos y
                  clasificaciones.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Nombre
                  <div className="relative">
                    <UserRound
                      className="absolute left-4 top-6 text-slate-500"
                      size={17}
                    />
                    <input
                      value={settings.firstName}
                      onChange={(event) =>
                        update("firstName", event.target.value)
                      }
                      minLength={2}
                      required
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </label>
                <label className="text-sm font-bold">
                  Apellidos
                  <input
                    value={settings.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                    minLength={2}
                    required
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-bold">
                  Usuario
                  <div className="relative">
                    <AtSign
                      className="absolute left-4 top-6 text-slate-500"
                      size={17}
                    />
                    <input
                      value={settings.username}
                      onChange={(event) =>
                        update("username", event.target.value.toLowerCase())
                      }
                      required
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </label>
                <label className="text-sm font-bold">
                  Correo
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-6 text-slate-500"
                      size={17}
                    />
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(event) => update("email", event.target.value)}
                      required
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </label>
                <label className="text-sm font-bold sm:col-span-2">
                  WhatsApp
                  <div className="relative">
                    <Smartphone
                      className="absolute left-4 top-6 text-slate-500"
                      size={17}
                    />
                    <input
                      value={settings.whatsappNumber}
                      onChange={(event) =>
                        update("whatsappNumber", event.target.value)
                      }
                      placeholder="+573001234567"
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                </label>
                <label className="text-sm font-bold sm:col-span-2">
                  Tu bio{" "}
                  <span className="float-right text-xs font-normal text-slate-500">
                    {settings.bio.length}/280
                  </span>
                  <textarea
                    value={settings.bio}
                    onChange={(event) =>
                      update("bio", event.target.value.slice(0, 280))
                    }
                    rows={4}
                    placeholder="Cuenta qué te mueve, tu meta o tu estilo de entrenamiento…"
                    className={`${inputClass} resize-none`}
                  />
                </label>
              </div>
              <button
                disabled={saving}
                className="btn w-full gap-2 py-4 sm:w-auto sm:px-7"
              >
                <Save size={18} />
                {saving ? "Guardando…" : "Guardar mi perfil"}
              </button>
            </form>
          )}

          {tab === "language" && (
            <div className="space-y-7">
              <div>
                <p className="text-xs font-black text-cyan-300">
                  EXPERIENCIA PERSONAL
                </p>
                <h3 className="mt-1 text-2xl font-black">Idioma y región</h3>
                <p className="mt-1 text-sm muted">
                  Personaliza la navegación, fechas y horarios de tu
                  experiencia.
                </p>
              </div>
              <div>
                <p className="mb-3 text-sm font-black">
                  Idioma de la aplicación
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => update("localeAuto", true)}
                    className={`relative rounded-2xl border p-4 text-left transition ${settings.localeAuto ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,.08)]" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"}`}
                  >
                    <span className="text-3xl">🌐</span>
                    <strong className="mt-3 block">Automático</strong>
                    <small className="text-slate-500">
                      Según tu zona horaria
                    </small>
                    {settings.localeAuto && (
                      <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-cyan-400 text-slate-950">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                  {languages.map((language) => {
                    const selected =
                      !settings.localeAuto && settings.locale === language.code;
                    return (
                      <button
                        type="button"
                        key={language.code}
                        onClick={() => {
                          update("locale", language.code);
                          update("localeAuto", false);
                        }}
                        className={`relative rounded-2xl border p-4 text-left transition ${selected ? "border-lime-400 bg-lime-400/10 shadow-[0_0_25px_rgba(163,230,53,.08)]" : "border-slate-700 bg-slate-950/50 hover:border-slate-500"}`}
                      >
                        <span className="text-3xl">{language.flag}</span>
                        <strong className="mt-3 block">{language.name}</strong>
                        <small className="text-slate-500">
                          {language.detail}
                        </small>
                        {selected && (
                          <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-lime-400 text-slate-950">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs muted">
                  En automático, Nova Gym elige Español para zonas de
                  Latinoamérica y España, e English para zonas en inglés.
                  Siempre puedes cambiarlo manualmente.
                </p>
              </div>
              <label className="block text-sm font-black">
                Zona horaria
                <div className="relative">
                  <MapPin
                    className="absolute left-4 top-6 text-slate-500"
                    size={17}
                  />
                  <select
                    value={settings.timezone}
                    onChange={(event) => update("timezone", event.target.value)}
                    className={`${inputClass} pl-11`}
                  >
                    {timezones.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="mt-2 block text-xs font-normal muted">
                  Se usa para tu asistencia diaria, calendario y notificaciones.
                </span>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
                <span>
                  <strong className="block">Mostrar retos activos</strong>
                  <small className="text-slate-500">
                    Permite que tus amigos vean cuáles retos estás construyendo.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={settings.showActiveChallenges}
                  onChange={(event) =>
                    update("showActiveChallenges", event.target.checked)
                  }
                  className="h-5 w-5 accent-lime-400"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSettings()}
                className="btn w-full gap-2 py-4 sm:w-auto sm:px-7"
              >
                <Globe2 size={18} />
                {saving ? "Aplicando…" : "Aplicar preferencias"}
              </button>
            </div>
          )}

          {tab === "stories" && (
            <div className="space-y-7">
              <div>
                <p className="text-xs font-black text-violet-300">
                  EXPERIENCIA DE HISTORIAS
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  Tu ritmo, tu historia
                </h3>
                <p className="mt-1 text-sm muted">
                  Elige cuánto tiempo permanece visible cada entrenamiento antes
                  de avanzar.
                </p>
              </div>
              <div className="overflow-hidden rounded-[26px] border border-violet-400/20 bg-gradient-to-br from-violet-400/10 via-slate-950 to-cyan-400/5 p-5">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-400 text-slate-950">
                    <Timer size={23} />
                  </span>
                  <div>
                    <strong className="text-lg">Duración por historia</strong>
                    <p className="mt-1 text-sm muted">
                      Se aplica a tus historias y a las sesiones temporales del
                      historial compartido.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((seconds) => (
                    <button
                      type="button"
                      key={seconds}
                      onClick={() => update("storyDurationSeconds", seconds)}
                      className={`relative rounded-2xl border px-2 py-4 text-center transition ${settings.storyDurationSeconds === seconds ? "border-lime-300 bg-lime-300 text-slate-950 shadow-[0_0_30px_rgba(163,230,53,.16)]" : "border-slate-700 bg-slate-900/70 hover:border-violet-300"}`}
                    >
                      <strong className="block text-2xl">{seconds}</strong>
                      <small
                        className={
                          settings.storyDurationSeconds === seconds
                            ? "text-slate-800"
                            : "text-slate-500"
                        }
                      >
                        segundos
                      </small>
                      {settings.storyDurationSeconds === seconds && (
                        <Check className="absolute right-2 top-2" size={14} />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-black/25 p-4">
                  <span className="relative grid h-12 w-12 place-items-center rounded-full border-2 border-lime-400 text-lime-300">
                    <Play size={18} fill="currentColor" />
                    <span className="absolute -right-1 -top-1 rounded-full bg-violet-400 px-1.5 py-0.5 text-[8px] font-black text-slate-950">
                      {settings.storyDurationSeconds}s
                    </span>
                  </span>
                  <div>
                    <strong className="text-sm">Vista previa</strong>
                    <p className="text-xs muted">
                      Puedes pausar, avanzar, regresar y volver a abrir
                      historias ya validadas.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/[.05] p-4">
                <ShieldCheck className="shrink-0 text-cyan-300" />
                <div>
                  <strong>Privacidad temporal</strong>
                  <p className="mt-1 text-xs muted">
                    Solo participantes aceptados del mismo reto pueden abrir el
                    historial. Cada reproducción usa un acceso temporal
                    protegido.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSettings()}
                className="btn w-full gap-2 py-4 sm:w-auto sm:px-7"
              >
                <Save size={18} />
                {saving ? "Guardando…" : "Guardar experiencia"}
              </button>
            </div>
          )}

          {tab === "security" && (
            <form onSubmit={changePassword} className="space-y-5">
              <div>
                <p className="text-xs font-black text-orange-300">
                  ACCESO Y SEGURIDAD
                </p>
                <h3 className="mt-1 text-2xl font-black">
                  Renueva tu contraseña
                </h3>
                <p className="mt-1 text-sm muted">
                  Al cambiarla, cerraremos la sesión para comprobar tu nueva
                  clave.
                </p>
              </div>
              <div className="rounded-2xl border border-orange-400/15 bg-orange-400/[.05] p-4">
                <div className="flex gap-3">
                  <LockKeyhole className="shrink-0 text-orange-300" />
                  <div>
                    <strong>Una contraseña solo tuya</strong>
                    <p className="mt-1 text-xs muted">
                      Usa mínimo 12 caracteres y combina mayúsculas, minúsculas,
                      números y símbolos.
                    </p>
                  </div>
                </div>
              </div>
              <label className="block text-sm font-bold">
                Contraseña actual
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwords.currentPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    autoComplete="current-password"
                    required
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((value) => !value)}
                    aria-label={
                      showPasswords
                        ? "Ocultar contraseñas"
                        : "Mostrar contraseñas"
                    }
                    className="absolute right-3 top-5 p-2 text-slate-400"
                  >
                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Nueva contraseña
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwords.newPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    minLength={12}
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                </label>
                <label className="text-sm font-bold">
                  Confirmar contraseña
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={passwords.confirmPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    minLength={12}
                    autoComplete="new-password"
                    required
                    className={inputClass}
                  />
                </label>
              </div>
              <div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <span
                      key={level}
                      className={`h-1.5 flex-1 rounded-full ${passwordStrength >= level ? (passwordStrength >= 4 ? "bg-lime-400" : "bg-orange-400") : "bg-slate-800"}`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs muted">
                  Seguridad:{" "}
                  {passwordStrength >= 5
                    ? "excelente"
                    : passwordStrength >= 4
                      ? "fuerte"
                      : passwordStrength >= 2
                        ? "media"
                        : "por completar"}
                </p>
              </div>
              <button
                disabled={saving || passwordStrength < 4}
                className="btn w-full gap-2 py-4 sm:w-auto sm:px-7"
              >
                <KeyRound size={18} />
                {saving ? "Protegiendo…" : "Cambiar contraseña"}
              </button>
            </form>
          )}

          {message && (
            <p
              role="status"
              className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${messageKind === "success" ? "border-lime-400/20 bg-lime-400/[.07] text-lime-300" : "border-red-400/20 bg-red-400/[.07] text-red-300"}`}
            >
              {messageKind === "success" && (
                <Sparkles className="mr-2 inline" size={16} />
              )}{" "}
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
