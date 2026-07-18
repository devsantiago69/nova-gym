"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Globe2,
  HeartPulse,
  LoaderCircle,
  LocateFixed,
  LockKeyhole,
  MapPin,
  PersonStanding,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

type Place = { id: number; name: string };
type ClubDraft = {
  name: string;
  description: string;
  type: "GYM" | "CITY" | "DISCIPLINE" | "COMMUNITY";
  visibility: "PUBLIC" | "REQUEST" | "PRIVATE";
  country: string;
  department: string;
  city: string;
  discipline: string;
  disciplines: string[];
  accentColor: "lime" | "cyan" | "orange" | "violet";
  latitude: string;
  longitude: string;
};

const types = [
  ["GYM", Building2, "Mi gimnasio", "La comunidad de un lugar físico"],
  ["CITY", MapPin, "Mi ciudad", "Personas que entrenan cerca"],
  ["DISCIPLINE", Dumbbell, "Una disciplina", "Unidos por el mismo deporte"],
  ["COMMUNITY", UsersRound, "Comunidad", "Una identidad y propósito común"],
] as const;
const access = [
  ["PUBLIC", Globe2, "Abierto", "Cualquiera entra al instante"],
  ["REQUEST", ShieldCheck, "Con aprobación", "Tú decides quién entra"],
  ["PRIVATE", LockKeyhole, "Privado", "Solo mediante invitación"],
] as const;
const disciplines = [
  ["Fuerza", Dumbbell],
  ["Hipertrofia", Dumbbell],
  ["Running", PersonStanding],
  ["Cross training", Zap],
  ["Ciclismo", Bike],
  ["Calistenia", PersonStanding],
  ["Boxeo", Zap],
  ["Yoga", HeartPulse],
  ["Pilates", HeartPulse],
  ["Spinning", Bike],
  ["Baile", Sparkles],
  ["Natación", HeartPulse],
  ["Fútbol", UsersRound],
  ["Movilidad", PersonStanding],
  ["Bienestar", HeartPulse],
] as const;
const colors = [
  ["lime", "Pulso", "bg-lime-400", "border-lime-300 bg-lime-300/10"],
  ["cyan", "Flow", "bg-cyan-400", "border-cyan-300 bg-cyan-300/10"],
  ["orange", "Fuego", "bg-orange-400", "border-orange-300 bg-orange-300/10"],
  ["violet", "Aura", "bg-violet-400", "border-violet-300 bg-violet-300/10"],
] as const;

export function ClubCreateWizard({ onClose, onCreated, notify }: { onClose: () => void; onCreated: (slug: string) => void; notify: (message: string) => void }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState("");
  const [departments, setDepartments] = useState<Place[]>([]);
  const [cities, setCities] = useState<Place[]>([]);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  const [draft, setDraft] = useState<ClubDraft>({ name: "", description: "", type: "GYM", visibility: "REQUEST", country: "Colombia", department: "", city: "", discipline: "Fuerza", disciplines: ["Fuerza"], accentColor: "lime", latitude: "", longitude: "" });

  useEffect(() => {
    void fetch("/api/v1/geo/colombia?resource=departments").then((response) => response.json()).then((json: { data?: Place[] }) => setDepartments(json.data ?? [])).catch(() => undefined);
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
  }, [photoUrl]);

  async function chooseDepartment(name: string) {
    setDraft((current) => ({ ...current, department: name, city: "" }));
    const selected = departments.find((row) => row.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
    if (!selected) return setCities([]);
    setBusy("cities");
    const response = await fetch(`/api/v1/geo/colombia?resource=cities&departmentId=${selected.id}`);
    const json = (await response.json()) as { data?: Place[] };
    setCities(json.data ?? []);
    setBusy("");
    setDepartmentOpen(false);
  }

  function toggleDiscipline(value: string) {
    setDraft((current) => {
      const selected = current.disciplines.includes(value)
        ? current.disciplines.filter((item) => item !== value)
        : [...current.disciplines, value];
      const normalized = selected.length ? selected : [value];
      return { ...current, disciplines: normalized, discipline: normalized[0] ?? value };
    });
  }

  async function chooseCity(name: string) {
    setDraft((current) => ({ ...current, city: name }));
    setCityOpen(false);
    setBusy("geocoding");
    const response = await fetch(
      `/api/v1/geo/colombia?resource=search&department=${encodeURIComponent(draft.department)}&city=${encodeURIComponent(name)}`,
    );
    const json = (await response.json()) as {
      data?: { latitude: number; longitude: number };
    };
    setBusy("");
    if (response.ok && json.data)
      setDraft((current) => ({
        ...current,
        city: name,
        latitude: String(json.data!.latitude),
        longitude: String(json.data!.longitude),
      }));
  }

  function locate() {
    if (!navigator.geolocation) return notify("Tu dispositivo no permite obtener ubicación");
    setBusy("location");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const response = await fetch(`/api/v1/geo/colombia?resource=reverse&latitude=${coords.latitude}&longitude=${coords.longitude}`);
      const json = (await response.json()) as { data?: { country: string; department: string; city: string; latitude: number; longitude: number }; errors?: Array<{ message: string }> };
      setBusy("");
      if (!response.ok || !json.data) return notify(json.errors?.[0]?.message ?? "No pudimos reconocer tu ciudad");
      setDraft((current) => ({ ...current, country: json.data!.country, department: json.data!.department, city: json.data!.city, latitude: String(json.data!.latitude), longitude: String(json.data!.longitude) }));
      const matched = departments.find((row) => row.name.toLocaleLowerCase("es") === json.data!.department.toLocaleLowerCase("es"));
      if (matched) {
        const cityResponse = await fetch(`/api/v1/geo/colombia?resource=cities&departmentId=${matched.id}`);
        const cityJson = (await cityResponse.json()) as { data?: Place[] };
        setCities(cityJson.data ?? []);
      }
      notify("Ubicación completada con tu GPS");
    }, () => { setBusy(""); notify("No pudimos leer tu ubicación. Puedes buscarla manualmente."); }, { enableHighAccuracy: true, timeout: 12_000 });
  }

  async function create() {
    setBusy("create");
    const response = await fetch("/api/v1/clubs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    const json = (await response.json()) as { data?: { id: string; slug: string }; message: string; errors?: Array<{ message: string }> };
    if (!response.ok || !json.data) { setBusy(""); return notify(json.errors?.[0]?.message ?? json.message); }
    if (photo) {
      const upload = new FormData();
      upload.set("avatar", photo);
      const uploadResponse = await fetch(`/api/v1/clubs/${json.data.id}/avatar`, { method: "POST", body: upload });
      if (!uploadResponse.ok) notify("El club fue creado, pero la foto no pudo guardarse");
    }
    setBusy("");
    notify("Tu club ya tiene identidad propia");
    onCreated(json.data.slug);
  }

  const canContinue = step === 1 ? draft.name.trim().length >= 3 && draft.description.trim().length >= 20 : step === 2 ? Boolean(draft.department && draft.city) : true;
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 p-2 backdrop-blur-xl sm:p-6">
    <div className="mx-auto min-h-full w-full max-w-3xl sm:grid sm:place-items-center">
      <section className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#0b1220] shadow-2xl">
        <header className="relative overflow-hidden border-b border-slate-800 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,.18),transparent_35%),linear-gradient(120deg,rgba(163,230,53,.08),transparent)] p-5 sm:p-7">
          <button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-slate-950/80"><X size={19} /></button>
          <p className="text-[10px] font-black tracking-[.17em] text-lime-300">CLUBES NOVA · PASO {step} DE 3</p>
          <h2 className="mt-2 pr-12 text-3xl font-black">{step === 1 ? "Dale una identidad" : step === 2 ? "Encuentra a tu gente" : "Define la energía"}</h2>
          <p className="mt-2 text-sm text-slate-400">{step === 1 ? "Una imagen y una historia que la gente quiera seguir." : step === 2 ? "Conecta con personas cercanas o de tu misma disciplina." : "Decide cómo se siente y cómo crece tu comunidad."}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">{[1, 2, 3].map((value) => <span key={value} className={`h-1 rounded-full ${value <= step ? "bg-gradient-to-r from-lime-300 to-cyan-300" : "bg-slate-700"}`} />)}</div>
        </header>
        <div className="p-5 sm:p-7">
          {step === 1 ? <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 rounded-[26px] border border-dashed border-slate-700 bg-slate-950/40 p-5 sm:flex-row">
              <label className="group relative grid h-28 w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[28px] border-2 border-lime-300/40 bg-gradient-to-br from-lime-300/20 to-cyan-300/10">
                {photoUrl ? <Image src={photoUrl} alt="Vista previa del club" fill unoptimized className="object-cover" /> : <><Camera className="text-lime-300" /><span className="absolute bottom-2 text-[9px] font-black">AGREGAR FOTO</span></>}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
              </label>
              <div className="text-center sm:text-left"><h3 className="font-black">La cara de tu comunidad</h3><p className="mt-1 text-sm text-slate-400">Se verá en el catálogo, el ranking y el feed. Usa un logo o una foto que los represente.</p><button onClick={() => setPhoto(null)} className={`mt-2 text-xs font-bold text-cyan-300 ${photo ? "" : "hidden"}`}>Elegir otra foto</button></div>
            </div>
            <label className="block"><span className="text-xs font-black">Nombre del club</span><span className="mt-1 block text-xs text-slate-500">Corto, reconocible y fácil de buscar.</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={120} placeholder="Ej. Titanes del Llano" className="control mt-2" /></label>
            <label className="block"><span className="text-xs font-black">¿Qué los une?</span><span className="mt-1 block text-xs text-slate-500">Cuéntale a alguien por qué debería ser parte.</span><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={600} rows={3} placeholder="Somos una comunidad que entrena…" className="control mt-2 resize-none" /></label>
          </div> : null}
          {step === 2 ? <div className="space-y-5">
            <fieldset><legend className="text-xs font-black">¿Qué tipo de club estás creando?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{types.map(([value, Icon, title, help]) => <button type="button" key={value} onClick={() => setDraft({ ...draft, type: value })} className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left ${draft.type === value ? "border-cyan-300 bg-cyan-300/10" : "border-slate-700 bg-slate-950/50"}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${draft.type === value ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-slate-400"}`}><Icon size={20} /></span><span><strong className="block text-sm">{title}</strong><small className="text-slate-500">{help}</small></span>{draft.type === value ? <Check className="ml-auto text-cyan-300" size={17} /> : null}</button>)}</div></fieldset>
            <div className="rounded-[24px] border border-slate-700 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-black">Ubicación del club</span><p className="mt-1 text-xs text-slate-500">Busca por departamento y ciudad o complétalo con tu GPS.</p></div><button onClick={locate} disabled={busy === "location"} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-lime-300 px-3 py-2 text-[10px] font-black text-slate-950">{busy === "location" ? <LoaderCircle className="animate-spin" size={14} /> : <LocateFixed size={14} />} Usar GPS</button></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[10px] font-bold text-slate-400">PAÍS</span><div className="control flex items-center gap-2 text-sm"><span>🇨🇴</span> Colombia</div></label><label className="relative z-20"><span className="mb-1.5 block text-[10px] font-bold text-slate-400">DEPARTAMENTO</span><div className="relative"><input value={draft.department} onFocus={() => setDepartmentOpen(true)} onChange={(e) => { setDraft({ ...draft, department: e.target.value, city: "", latitude: "", longitude: "" }); setDepartmentOpen(true); }} placeholder="Busca tu departamento…" autoComplete="off" className="control pr-10" /><MapPin size={16} className="absolute right-4 top-4 text-cyan-300" /></div>{departmentOpen ? <div className="absolute inset-x-0 top-[76px] max-h-56 overflow-y-auto rounded-2xl border border-slate-700 bg-[#08101d] p-2 shadow-2xl">{departments.filter((row) => row.name.toLocaleLowerCase("es").includes(draft.department.toLocaleLowerCase("es"))).slice(0, 10).map((row) => <button type="button" key={row.id} onMouseDown={(event) => event.preventDefault()} onClick={() => void chooseDepartment(row.name)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-cyan-300/10"><MapPin size={14} className="text-cyan-300" />{row.name}</button>)}{!departments.length ? <p className="p-3 text-xs text-slate-500">Cargando departamentos…</p> : null}</div> : null}</label><label className="relative z-10 sm:col-span-2"><span className="mb-1.5 block text-[10px] font-bold text-slate-400">CIUDAD O MUNICIPIO</span><div className="relative"><input value={draft.city} onFocus={() => setCityOpen(true)} onChange={(e) => { setDraft({ ...draft, city: e.target.value, latitude: "", longitude: "" }); setCityOpen(true); }} disabled={!draft.department || busy === "cities"} placeholder={busy === "cities" ? "Cargando ciudades…" : "Busca tu ciudad o municipio…"} autoComplete="off" className="control pr-10" />{busy === "cities" || busy === "geocoding" ? <LoaderCircle size={16} className="absolute right-4 top-4 animate-spin text-cyan-300" /> : <Search size={16} className="absolute right-4 top-4 text-slate-500" />}</div>{cityOpen && cities.length ? <div className="absolute inset-x-0 top-[76px] max-h-56 overflow-y-auto rounded-2xl border border-slate-700 bg-[#08101d] p-2 shadow-2xl">{cities.filter((row) => row.name.toLocaleLowerCase("es").includes(draft.city.toLocaleLowerCase("es"))).slice(0, 12).map((row) => <button type="button" key={row.id} onClick={() => void chooseCity(row.name)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-lime-300/10"><MapPin size={14} className="text-lime-300" />{row.name}</button>)}</div> : null}{draft.latitude && draft.longitude ? <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-lime-300"><Check size={13} /> Punto listo para mostrar en el mapa</p> : null}</label></div>
            </div>
            <fieldset><legend className="text-xs font-black">¿Qué se entrena aquí?</legend><p className="mt-1 text-xs text-slate-500">Elige todas las disciplinas que representen al club.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{disciplines.map(([value, Icon]) => { const selected = draft.disciplines.includes(value); return <button type="button" key={value} onClick={() => toggleDiscipline(value)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold ${selected ? "border-lime-300 bg-lime-300/10 text-lime-200" : "border-slate-700 text-slate-400"}`}><span className={`grid h-7 w-7 place-items-center rounded-lg ${selected ? "bg-lime-300 text-slate-950" : "bg-slate-800"}`}><Icon size={14} /></span>{value}{selected ? <Check size={14} className="ml-auto" /> : null}</button>; })}</div><p className="mt-3 text-[11px] font-bold text-cyan-200">{draft.disciplines.length} seleccionada{draft.disciplines.length === 1 ? "" : "s"}: {draft.disciplines.join(" · ")}</p></fieldset>
          </div> : null}
          {step === 3 ? <div className="space-y-6">
            <fieldset><legend className="text-xs font-black">¿Cómo entran nuevos integrantes?</legend><div className="mt-3 grid gap-2">{access.map(([value, Icon, title, help]) => <button type="button" key={value} onClick={() => setDraft({ ...draft, visibility: value })} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${draft.visibility === value ? "border-lime-300 bg-lime-300/[.08]" : "border-slate-700 bg-slate-950/40"}`}><Icon size={20} className={draft.visibility === value ? "text-lime-300" : "text-slate-500"} /><span className="flex-1"><strong className="block text-sm">{title}</strong><small className="text-slate-500">{help}</small></span>{draft.visibility === value ? <Check size={18} className="text-lime-300" /> : null}</button>)}</div></fieldset>
            <fieldset><legend className="text-xs font-black">Energía visual</legend><p className="mt-1 text-xs text-slate-500">Este color identificará las tarjetas y espacios del club.</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{colors.map(([value, name, swatch, selected]) => <button type="button" key={value} onClick={() => setDraft({ ...draft, accentColor: value })} className={`relative rounded-2xl border p-3 text-left ${draft.accentColor === value ? selected : "border-slate-700 bg-slate-950/40"}`}><span className={`block h-8 rounded-xl ${swatch}`} /><strong className="mt-2 block text-xs">{name}</strong>{draft.accentColor === value ? <Check size={15} className="absolute right-2 top-2 rounded-full bg-slate-950 p-0.5 text-white" /> : null}</button>)}</div></fieldset>
            <div className={`overflow-hidden rounded-[26px] border bg-gradient-to-br p-5 ${draft.accentColor === "cyan" ? "from-cyan-400/20 to-slate-950 border-cyan-300/20" : draft.accentColor === "orange" ? "from-orange-400/20 to-slate-950 border-orange-300/20" : draft.accentColor === "violet" ? "from-violet-400/20 to-slate-950 border-violet-300/20" : "from-lime-400/20 to-slate-950 border-lime-300/20"}`}><div className="flex items-center gap-3"><span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white/10">{photoUrl ? <Image src={photoUrl} alt="Club" fill unoptimized className="object-cover" /> : <UsersRound />}</span><span className="min-w-0"><small className="font-black tracking-widest text-cyan-300">VISTA PREVIA</small><h3 className="truncate text-xl font-black">{draft.name || "Tu nuevo club"}</h3><p className="truncate text-xs text-slate-400">{draft.city || "Tu ciudad"} · {draft.disciplines.slice(0, 3).join(" · ")}</p></span></div></div>
          </div> : null}
          <footer className="mt-7 flex gap-3 border-t border-slate-800 pt-5">{step > 1 ? <button onClick={() => setStep((value) => value - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-black"><ChevronLeft size={16} /> Atrás</button> : null}<button disabled={!canContinue || busy === "create"} onClick={() => step < 3 ? setStep((value) => value + 1) : void create()} className="btn ml-auto flex-1 gap-2 py-3.5 disabled:opacity-40">{busy === "create" ? <LoaderCircle className="animate-spin" /> : step === 3 ? <Sparkles /> : null}{step === 3 ? "Crear mi club" : "Continuar"}{step < 3 ? <ChevronRight size={17} /> : null}</button></footer>
        </div>
      </section>
    </div>
  </div>;
}
