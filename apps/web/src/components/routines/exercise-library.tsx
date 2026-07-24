"use client";
import { useEffect, useState } from "react";
import {
  Dumbbell,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { ExerciseVisual } from "./exercise-visual";
import { ExercisePreviewModal } from "./exercise-preview-modal";

type Exercise = {
  id: string;
  displayName: string;
  bodyPart: string;
  equipment: string;
  target: string;
  muscleGroup: string | null;
  instructionsEs: string;
  instructionStepsEs: string[];
};
const filters = [
  "Todos",
  "waist",
  "chest",
  "back",
  "upper legs",
  "upper arms",
  "shoulders",
  "cardio",
];
const names: Record<string, string> = {
  Todos: "Todo",
  waist: "Core",
  chest: "Pecho",
  back: "Espalda",
  "upper legs": "Piernas",
  "upper arms": "Brazos",
  shoulders: "Hombros",
  cardio: "Cardio",
};
export function ExerciseLibrary({ licensed }: { licensed: boolean }) {
  const [query, setQuery] = useState("");
  const [part, setPart] = useState("Todos");
  const [items, setItems] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ take: "60" });
      if (query.trim()) params.set("query", query.trim());
      if (part !== "Todos") params.set("bodyPart", part);
      const response = await fetch(`/api/v1/exercises?${params}`, {
        signal: controller.signal,
      });
      if (response.ok) setItems((await response.json()).data);
      setLoading(false);
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, part]);
  return (
    <>
      <section className="rounded-[2rem] border border-slate-700 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.13),transparent_30%),#0b1424] p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-300 text-slate-950">
            <Dumbbell />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">
              Biblioteca Nova
            </p>
            <h1 className="text-3xl font-black">1.324 movimientos</h1>
            <p className="mt-1 text-sm text-slate-400">
              Busca, aprende y encuentra tu ejercicio.
            </p>
          </div>
        </div>
        <label className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-lime-300">
          <Search className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, músculo o equipo..."
            className="w-full bg-transparent py-4 outline-none"
          />
          {loading ? (
            <LoaderCircle className="animate-spin text-lime-300" size={18} />
          ) : null}
        </label>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700 text-slate-500">
            <SlidersHorizontal size={17} />
          </span>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setPart(filter)}
              className={`shrink-0 rounded-xl border px-4 text-xs font-black ${part === filter ? "border-lime-300 bg-lime-300 text-slate-950" : "border-slate-700 bg-slate-950"}`}
            >
              {names[filter]}
            </button>
          ))}
        </div>
      </section>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            className="group overflow-hidden rounded-[1.4rem] border border-slate-800 bg-slate-900 text-left transition hover:-translate-y-1 hover:border-lime-300/40"
          >
            <div className="relative aspect-square">
              <ExerciseVisual
                licensed={licensed}
                exerciseId={item.id}
                name={item.displayName}
                showModeLabel={false}
                className="h-full w-full"
              />
              <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[8px] font-black uppercase text-cyan-200 backdrop-blur">
                {item.equipment}
              </span>
            </div>
            <div className="p-3">
              <strong className="line-clamp-2 min-h-10 text-sm">
                {item.displayName}
              </strong>
              <span className="mt-2 flex items-center gap-1 text-[10px] capitalize text-lime-300">
                <Target size={11} />
                {item.target}
              </span>
            </div>
          </button>
        ))}
      </div>
      {!loading && !items.length ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-700 p-10 text-center">
          <Search className="mx-auto text-slate-600" />
          <p className="mt-3 font-black">No encontramos ese movimiento</p>
        </div>
      ) : null}
      {selected ? (
        <ExercisePreviewModal
          exercise={selected}
          licensed={licensed}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
