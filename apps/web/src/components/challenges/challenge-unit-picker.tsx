"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  Dumbbell,
  Footprints,
  GlassWater,
  Library,
  NotebookTabs,
  Pencil,
  Repeat2,
  Route,
  Search,
  Timer,
  WalletCards,
  X,
} from "lucide-react";

const units = [
  {
    value: "asistencias",
    label: "Asistencias",
    description: "Visitas verificadas a un lugar",
    group: "Actividad",
    Icon: CheckCircle2,
    color: "text-lime-300",
  },
  {
    value: "sesiones",
    label: "Sesiones",
    description: "Entrenamientos, estudio o práctica",
    group: "Actividad",
    Icon: Dumbbell,
    color: "text-orange-300",
  },
  {
    value: "días",
    label: "Días",
    description: "Cumplimientos diarios y hábitos",
    group: "Tiempo",
    Icon: CalendarDays,
    color: "text-cyan-300",
  },
  {
    value: "minutos",
    label: "Minutos",
    description: "Tiempo dedicado en cada registro",
    group: "Tiempo",
    Icon: Timer,
    color: "text-cyan-300",
  },
  {
    value: "horas",
    label: "Horas",
    description: "Acumula tiempo de estudio o trabajo",
    group: "Tiempo",
    Icon: Clock3,
    color: "text-violet-300",
  },
  {
    value: "páginas",
    label: "Páginas",
    description: "Lectura acumulada de libros",
    group: "Lectura",
    Icon: BookOpen,
    color: "text-amber-300",
  },
  {
    value: "libros",
    label: "Libros",
    description: "Cantidad de libros terminados",
    group: "Lectura",
    Icon: Library,
    color: "text-amber-300",
  },
  {
    value: "kilómetros",
    label: "Kilómetros",
    description: "Distancia caminada, corrida o rodada",
    group: "Movimiento",
    Icon: Route,
    color: "text-lime-300",
  },
  {
    value: "pasos",
    label: "Pasos",
    description: "Movimiento diario acumulado",
    group: "Movimiento",
    Icon: Footprints,
    color: "text-lime-300",
  },
  {
    value: "litros",
    label: "Litros",
    description: "Hidratación o volumen acumulado",
    group: "Bienestar",
    Icon: Droplets,
    color: "text-cyan-300",
  },
  {
    value: "vasos",
    label: "Vasos",
    description: "Seguimiento simple de hidratación",
    group: "Bienestar",
    Icon: GlassWater,
    color: "text-cyan-300",
  },
  {
    value: "pesos colombianos",
    label: "Pesos colombianos",
    description: "Metas privadas de ahorro en COP",
    group: "Finanzas",
    Icon: WalletCards,
    color: "text-emerald-300",
  },
  {
    value: "dólares",
    label: "Dólares",
    description: "Metas privadas de ahorro en USD",
    group: "Finanzas",
    Icon: Banknote,
    color: "text-emerald-300",
  },
  {
    value: "actividades",
    label: "Actividades",
    description: "Tareas o acciones completadas",
    group: "Productividad",
    Icon: NotebookTabs,
    color: "text-violet-300",
  },
  {
    value: "repeticiones",
    label: "Repeticiones",
    description: "Series o movimientos acumulados",
    group: "Actividad",
    Icon: Repeat2,
    color: "text-orange-300",
  },
] as const;

export function ChallengeUnitPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const known = units.find((item) => item.value === value);
  const [custom, setCustom] = useState(known ? "" : value);
  const visible = useMemo(
    () =>
      units.filter((item) =>
        `${item.label} ${item.description} ${item.group}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const Icon = known?.Icon ?? Pencil;
  function choose(next: string) {
    onChange(next);
    setCustom("");
    setOpen(false);
    setQuery("");
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-3.5 text-left outline-none transition hover:border-cyan-400/60"
      >
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-900 ${known?.color ?? "text-violet-300"}`}
        >
          <Icon size={23} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate">
            {known?.label ?? (value || "Seleccionar unidad")}
          </strong>
          <small className="mt-0.5 block truncate muted">
            {known?.description ?? "Unidad personalizada"}
          </small>
        </span>
        <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black text-cyan-300">
          CAMBIAR
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-[30px] border border-slate-700 bg-slate-900 shadow-2xl sm:max-w-2xl sm:rounded-[30px]">
            <header className="flex items-start justify-between border-b border-slate-800 p-5">
              <div>
                <p className="text-xs font-black text-cyan-300">
                  UNIDAD DE PROGRESO
                </p>
                <h3 className="mt-1 text-2xl font-black">¿Qué vas a medir?</h3>
                <p className="mt-1 text-sm muted">
                  Elige una opción para que el sistema muestre y calcule bien tu
                  avance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-950 p-3"
              >
                <X />
              </button>
            </header>
            <div className="max-h-[calc(88vh-130px)] overflow-y-auto p-4 sm:p-5">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-cyan-400">
                <Search size={18} className="text-slate-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar páginas, kilómetros, ahorro…"
                  className="w-full bg-transparent py-4 outline-none"
                />
              </label>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {visible.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => choose(item.value)}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${value === item.value ? "border-cyan-300 bg-cyan-400/10" : "border-slate-800 bg-slate-950/70 hover:border-slate-600"}`}
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 ${item.color}`}
                    >
                      <item.Icon size={21} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block">{item.label}</strong>
                      <small className="line-clamp-1 muted">
                        {item.description}
                      </small>
                    </span>
                    {value === item.value && (
                      <CheckCircle2
                        size={18}
                        className="ml-auto shrink-0 text-cyan-300"
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-dashed border-violet-400/30 bg-violet-400/[.05] p-4">
                <div className="flex items-center gap-2">
                  <Pencil size={18} className="text-violet-300" />
                  <strong>¿No aparece lo que necesitas?</strong>
                </div>
                <p className="mt-1 text-xs muted">
                  Escribe una unidad corta, por ejemplo “clases”, “recetas” o
                  “proyectos”.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={custom}
                    onChange={(event) =>
                      setCustom(event.target.value.toLowerCase())
                    }
                    maxLength={50}
                    placeholder="Mi unidad personalizada"
                    className="control min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    disabled={custom.trim().length < 2}
                    onClick={() => choose(custom.trim())}
                    className="btn shrink-0"
                  >
                    Usar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
