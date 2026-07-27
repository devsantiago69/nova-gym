"use client";

import { useState } from "react";
import { Edit3, Gem, Plus, RefreshCw, Trash2, Trophy, X } from "lucide-react";

type Level = {
  id: string;
  level: number;
  title: string;
  xpThreshold: number;
  icon: string | null;
  colorFrom: string | null;
  colorTo: string | null;
  createdAt: string;
  updatedAt: string;
};

type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  name: string;
  avatarKey: string | null;
  totalXp: number;
  level: { level: number; title: string } | null;
};

const blank = { level: 1, title: "", xpThreshold: 0, icon: "", colorFrom: "#a3e635", colorTo: "#22d3ee" };

export function LevelManager({
  initialLevels,
  initialLeaderboard,
}: {
  initialLevels: Level[];
  initialLeaderboard: LeaderboardRow[];
}) {
  const [levels, setLevels] = useState(initialLevels);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Level>();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    const url = editing?.id ? `/api/v1/admin/levels/${editing.id}` : "/api/v1/admin/levels";
    const response = await fetch(url, {
      method: editing?.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { data?: Level; message: string; errors?: Array<{ message: string }> };
    setSaving(false);
    setMessage(response.ok ? result.message : (result.errors?.[0]?.message ?? result.message));
    if (!response.ok || !result.data) return;
    setLevels((current) =>
      editing?.id
        ? current.map((level) => (level.id === result.data!.id ? result.data! : level)).sort((a, b) => a.level - b.level)
        : [...current, result.data!].sort((a, b) => a.level - b.level),
    );
    setEditing(undefined);
  }

  async function remove(level: Level) {
    if (!confirm(`¿Eliminar el nivel ${level.level} (${level.title})?`)) return;
    const response = await fetch(`/api/v1/admin/levels/${level.id}`, { method: "DELETE" });
    const result = (await response.json()) as { message: string; errors?: Array<{ message: string }> };
    setMessage(response.ok ? result.message : (result.errors?.[0]?.message ?? result.message));
    if (response.ok) setLevels((current) => current.filter((row) => row.id !== level.id));
  }

  async function refreshLeaderboard() {
    setRefreshing(true);
    const response = await fetch("/api/v1/gamification/leaderboard?limit=25");
    const result = (await response.json()) as { data?: { rows: LeaderboardRow[] } };
    if (result.data) setLeaderboard(result.data.rows);
    setRefreshing(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-3 rounded-2xl border border-violet-400/20 bg-violet-400/[.06] p-4 text-sm text-violet-100">
        <Gem className="shrink-0 text-violet-300" />
        <div>
          <strong>La economía del juego</strong>
          <p className="mt-1 text-violet-100/70">
            Los umbrales deben crecer de forma estricta entre niveles consecutivos. Solo puedes eliminar el nivel más alto.
          </p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-3">
              <strong className="text-2xl">{levels.length}</strong>
              <span className="ml-2 text-xs muted">niveles</span>
            </article>
          </div>
          <button
            onClick={() => {
              const nextLevel = (levels.at(-1)?.level ?? 0) + 1;
              setEditing({ id: "", ...blank, level: nextLevel, createdAt: "", updatedAt: "" });
              setMessage("");
            }}
            className="btn gap-2"
          >
            <Plus size={18} />
            Crear nivel
          </button>
        </div>
        {message && (
          <p role="status" className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm font-bold text-violet-200">
            {message}
          </p>
        )}
        <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-800">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-900/70 text-left text-xs font-black uppercase text-slate-400">
              <tr>
                <th className="p-3">Nivel</th>
                <th className="p-3">Título</th>
                <th className="p-3">XP requerido</th>
                <th className="p-3">Color</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => (
                <tr key={level.id} className="border-t border-slate-800/80">
                  <td className="p-3 font-black">{level.level}</td>
                  <td className="p-3">{level.title}</td>
                  <td className="p-3 text-cyan-300">{level.xpThreshold.toLocaleString("es-CO")}</td>
                  <td className="p-3">
                    <span
                      className="inline-block h-5 w-10 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${level.colorFrom ?? "#a3e635"}, ${level.colorTo ?? "#22d3ee"})` }}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditing(level);
                          setMessage("");
                        }}
                        className="rounded-lg border border-slate-700 p-2 hover:border-violet-400"
                        aria-label="Editar nivel"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => void remove(level)}
                        className="rounded-lg border border-slate-700 p-2 hover:border-rose-400"
                        aria-label="Eliminar nivel"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black text-lime-300">TOP GLOBAL</p>
            <h2 className="mt-1 text-xl font-black">Ranking en vivo</h2>
          </div>
          <button
            onClick={() => void refreshLeaderboard()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold hover:border-lime-400"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Actualizando…" : "Refrescar"}
          </button>
        </div>
        <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-800">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-900/70 text-left text-xs font-black uppercase text-slate-400">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Nivel</th>
                <th className="p-3 text-right">XP total</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.userId} className="border-t border-slate-800/80">
                  <td className="p-3 font-black text-lime-300">{row.rank}</td>
                  <td className="p-3">
                    <strong className="block">{row.name}</strong>
                    <span className="text-xs muted">@{row.username}</span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold">
                      <Trophy size={12} className="text-orange-300" />
                      {row.level ? `${row.level.level} · ${row.level.title}` : "—"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-cyan-300">{row.totalXp.toLocaleString("es-CO")}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-sm muted">
                    Aún no hay usuarios con XP registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== undefined && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 p-3 backdrop-blur-lg sm:grid sm:place-items-center sm:p-6">
          <form onSubmit={submit} className="my-auto w-full max-w-lg overflow-hidden rounded-[30px] border border-slate-700 bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-800 bg-gradient-to-r from-violet-400/10 to-cyan-400/5 p-5">
              <div>
                <p className="text-xs font-black text-violet-300">CURVA DE XP</p>
                <h2 className="mt-1 text-2xl font-black">{editing.id ? "Editar nivel" : "Nuevo nivel"}</h2>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setEditing(undefined)} className="rounded-full bg-slate-950 p-2">
                <X />
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Nivel
                <input name="level" type="number" min={1} defaultValue={editing.level} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" />
              </label>
              <label className="text-sm font-bold">
                XP requerido
                <input name="xpThreshold" type="number" min={0} defaultValue={editing.xpThreshold} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Título
                <input name="title" defaultValue={editing.title} required placeholder="Guerrero" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" />
              </label>
              <label className="text-sm font-bold">
                Icono (lucide)
                <input name="icon" defaultValue={editing.icon ?? ""} placeholder="Flame" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm font-bold">
                  Color inicial
                  <input name="colorFrom" type="color" defaultValue={editing.colorFrom ?? "#a3e635"} className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-1" />
                </label>
                <label className="text-sm font-bold">
                  Color final
                  <input name="colorTo" type="color" defaultValue={editing.colorTo ?? "#22d3ee"} className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 p-1" />
                </label>
              </div>
              <button type="button" onClick={() => setEditing(undefined)} className="rounded-xl border border-slate-700 p-3 font-bold">
                Cancelar
              </button>
              <button disabled={saving} className="btn">
                {saving ? "Guardando…" : "Guardar nivel"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
