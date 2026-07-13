"use client";

import { useMemo, useState } from "react";
import { Copy, Edit3, Eye, EyeOff, KeyRound, Plus, RefreshCw, Search, ShieldCheck, UserRoundCheck, UserRoundX, UsersRound, X } from "lucide-react";

type Plan = { id: string; name: string; code: string };
type User = {
  id: string;
  email: string;
  username: string;
  whatsappNumber?: string | null;
  role: "ADMIN" | "USER";
  status: string;
  createdAt?: Date | string;
  profile: { firstName: string; lastName: string } | null;
  subscriptions?: Array<{ plan: Plan }>;
};

const statusLabel: Record<string, string> = { ACTIVE: "Activo", INACTIVE: "Inactivo", SUSPENDED: "Suspendido", PENDING_PASSWORD_CHANGE: "Cambio pendiente" };

function securePassword() {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_+"];
  const random = (characters: string) => characters[crypto.getRandomValues(new Uint32Array(1))[0]! % characters.length]!;
  const characters = [...groups.map(random), ...Array.from({ length: 12 }, () => random(groups.join("")))];
  for (let index = characters.length - 1; index > 0; index--) { const target = crypto.getRandomValues(new Uint32Array(1))[0]! % (index + 1); [characters[index], characters[target]] = [characters[target]!, characters[index]!]; }
  return characters.join("");
}

export function UserManager({ initialUsers, plans }: { initialUsers: User[]; plans: Plan[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [editing, setEditing] = useState<User>();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string }>();
  const filtered = useMemo(() => users.filter((user) => `${user.profile?.firstName} ${user.profile?.lastName} ${user.username} ${user.email}`.toLowerCase().includes(query.toLowerCase().trim())), [users, query]);
  const active = users.filter((user) => user.status === "ACTIVE").length;

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    if (!data.whatsappNumber) delete data.whatsappNumber;
    const response = await fetch("/api/v1/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json() as { message: string; data?: User; errors?: Array<{ message: string }> };
    setSaving(false); setMessage(response.ok ? result.message : (result.errors?.[0]?.message ?? result.message));
    if (!response.ok || !result.data) return;
    setUsers((current) => [{ ...result.data!, subscriptions: plans[0] ? [{ plan: plans[0] }] : [] }, ...current]);
    setCreatedCredentials({ username: String(data.username), password: String(data.password) });
    form.reset(); setPassword(""); setMode("list");
  }

  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setSaving(true); setMessage("");
    const formData = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(formData);
    body.forcePasswordChange = formData.has("forcePasswordChange");
    const response = await fetch(`/api/v1/admin/users/${editing.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { message: string; data?: User; errors?: Array<{ message: string }> };
    setSaving(false); setMessage(response.ok ? result.message : (result.errors?.[0]?.message ?? result.message));
    if (!response.ok || !result.data) return;
    setUsers((current) => current.map((user) => user.id === result.data!.id ? result.data! : user));
    setEditing(undefined); setEditPassword("");
  }

  return <div className="space-y-6">
    <div className="grid grid-cols-3 gap-3"><article className="card p-4"><UsersRound className="text-cyan-300" size={20}/><p className="mt-3 text-2xl font-black">{users.length}</p><p className="text-xs muted">Total</p></article><article className="card p-4"><UserRoundCheck className="text-lime-300" size={20}/><p className="mt-3 text-2xl font-black">{active}</p><p className="text-xs muted">Activos</p></article><article className="card p-4"><UserRoundX className="text-orange-300" size={20}/><p className="mt-3 text-2xl font-black">{users.length - active}</p><p className="text-xs muted">Restringidos</p></article></div>

    <div className="flex flex-wrap gap-3"><button onClick={() => setMode("list")} className={`rounded-2xl px-5 py-3 text-sm font-black ${mode === "list" ? "bg-white text-slate-950" : "border border-slate-700 bg-slate-900"}`}>Directorio</button><button onClick={() => setMode("create")} className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${mode === "create" ? "bg-lime-400 text-slate-950" : "border border-lime-400/30 bg-lime-400/5 text-lime-300"}`}><Plus size={17}/>Crear usuario</button></div>

    {mode === "create" && <form onSubmit={create} className="overflow-hidden rounded-[28px] border border-lime-400/20 bg-gradient-to-br from-lime-400/10 via-slate-900 to-slate-950"><div className="border-b border-slate-800 p-5 sm:p-7"><p className="text-xs font-black text-lime-300">NUEVA CUENTA</p><h2 className="mt-1 text-2xl font-black">Incorpora un usuario</h2><p className="mt-1 text-sm muted">Se asignará al plan inicial y deberá asegurar su contraseña al ingresar.</p></div><div className="grid gap-4 p-5 sm:p-7 md:grid-cols-2">
      <label className="text-sm font-bold">Nombre<input name="firstName" required minLength={2} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400" /></label><label className="text-sm font-bold">Apellidos<input name="lastName" required minLength={2} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400" /></label><label className="text-sm font-bold">Usuario<input name="username" required minLength={3} placeholder="@usuario" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400" /></label><label className="text-sm font-bold">Correo<input name="email" type="email" required className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400" /></label><label className="text-sm font-bold">WhatsApp<input name="whatsappNumber" placeholder="+573001234567" pattern="\+[1-9][0-9]{7,14}" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5 outline-none focus:border-lime-400" /></label><label className="text-sm font-bold">Rol<select name="role" defaultValue="USER" className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3.5"><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select></label>
      <div className="md:col-span-2"><label className="text-sm font-bold" htmlFor="temporary-password">Contraseña temporal</label><div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 focus-within:border-lime-400"><input id="temporary-password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} className="min-w-0 flex-1 bg-transparent p-3.5 outline-none"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="px-4 text-slate-400">{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div><button type="button" onClick={() => { setPassword(securePassword()); setShowPassword(true); }} className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-lime-300"><RefreshCw size={15}/>Generar contraseña segura</button></div><input type="hidden" name="countryCode" value="+57"/><button className="btn py-4 md:col-span-2" disabled={saving}>{saving ? "Creando cuenta…" : "Crear y asignar plan inicial"}</button>
    </div></form>}

    {createdCredentials && <aside className="rounded-[26px] border border-lime-400/30 bg-lime-400/5 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-lime-300">CUENTA LISTA</p><h3 className="mt-1 text-xl font-black">Credenciales para entregar</h3></div><button aria-label="Cerrar credenciales" onClick={() => setCreatedCredentials(undefined)}><X/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-950 p-4"><span className="text-xs muted">Usuario</span><p className="font-mono text-lg">@{createdCredentials.username}</p></div><div className="rounded-2xl bg-slate-950 p-4"><span className="text-xs muted">Contraseña temporal</span><p className="break-all font-mono">{createdCredentials.password}</p></div></div><button type="button" onClick={() => navigator.clipboard.writeText(`Usuario: @${createdCredentials.username}\nContraseña temporal: ${createdCredentials.password}`)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 font-bold"><Copy size={17}/>Copiar acceso</button></aside>}

    {message && <p role="status" className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm font-bold text-cyan-200">{message}</p>}

    {mode === "list" && <section className="card overflow-hidden"><div className="border-b border-slate-800 p-4 sm:p-5"><label className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-lime-400"><Search size={18} className="text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, usuario o correo" className="w-full bg-transparent py-3.5 outline-none"/></label></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((user) => <article key={user.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 transition hover:border-slate-600"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-400 to-cyan-400 font-black text-slate-950">{(user.profile?.firstName ?? user.username).charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><strong className="block truncate">{user.profile?.firstName} {user.profile?.lastName}</strong><p className="truncate text-xs muted">@{user.username} · {user.email}</p></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${user.status === "ACTIVE" ? "bg-lime-400 shadow-[0_0_12px_#a3e635]" : "bg-orange-400"}`}/></div><div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black"><span className="rounded-full bg-slate-800 px-2 py-1">{statusLabel[user.status] ?? user.status}</span><span className="rounded-full bg-violet-400/10 px-2 py-1 text-violet-300">{user.subscriptions?.[0]?.plan.name ?? "Sin plan"}</span>{user.role === "ADMIN" && <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-cyan-300">ADMIN</span>}</div><button onClick={() => { setEditing(user); setEditPassword(""); setMessage(""); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 py-2.5 text-sm font-bold transition hover:border-lime-400 hover:text-lime-300"><Edit3 size={16}/>Editar usuario</button></article>)}</div>{filtered.length === 0 && <p className="p-8 text-center muted">No encontramos usuarios con esa búsqueda.</p>}</section>}

    {editing && <div className="fixed inset-0 z-[80] grid overflow-y-auto bg-black/80 p-3 backdrop-blur-lg sm:place-items-center sm:p-6"><form onSubmit={update} className="my-auto w-full max-w-2xl overflow-hidden rounded-[30px] border border-slate-700 bg-slate-900 shadow-2xl"><div className="flex items-start justify-between border-b border-slate-800 bg-gradient-to-r from-cyan-400/10 to-lime-400/5 p-5"><div><p className="text-xs font-black text-cyan-300">CONTROL DE CUENTA</p><h2 className="mt-1 text-2xl font-black">Editar a {editing.profile?.firstName ?? editing.username}</h2></div><button type="button" onClick={() => setEditing(undefined)} aria-label="Cerrar edición" className="rounded-full bg-slate-950 p-2"><X/></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">
      <label className="text-sm font-bold">Nombre<input name="firstName" defaultValue={editing.profile?.firstName} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"/></label><label className="text-sm font-bold">Apellidos<input name="lastName" defaultValue={editing.profile?.lastName} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"/></label><label className="text-sm font-bold">Usuario<input name="username" defaultValue={editing.username} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"/></label><label className="text-sm font-bold">Correo<input name="email" type="email" defaultValue={editing.email} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"/></label><label className="text-sm font-bold">WhatsApp<input name="whatsappNumber" defaultValue={editing.whatsappNumber ?? ""} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"/></label><label className="text-sm font-bold">Plan<select name="planId" defaultValue={editing.subscriptions?.[0]?.plan.id} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="text-sm font-bold">Estado<select name="status" defaultValue={editing.status} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"><option value="ACTIVE">Activo</option><option value="INACTIVE">Desactivado</option><option value="SUSPENDED">Suspendido</option><option value="PENDING_PASSWORD_CHANGE">Debe cambiar contraseña</option></select></label><label className="text-sm font-bold">Rol<select name="role" defaultValue={editing.role} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select></label>
      <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4 sm:col-span-2"><div className="flex items-center gap-2 font-black"><KeyRound size={18} className="text-orange-300"/>Restablecer contraseña</div><p className="mt-1 text-xs muted">Déjala vacía para conservar la contraseña actual.</p><div className="mt-3 flex gap-2"><input name="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} minLength={12} placeholder="Nueva contraseña segura" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 p-3"/><button type="button" onClick={() => setEditPassword(securePassword())} className="rounded-xl border border-slate-700 px-3" aria-label="Generar contraseña"><RefreshCw size={18}/></button></div><label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" name="forcePasswordChange" defaultChecked/>Solicitar cambio al próximo ingreso</label></div>
      <button type="button" onClick={() => setEditing(undefined)} className="rounded-xl border border-slate-700 p-3 font-bold">Cancelar</button><button disabled={saving} className="btn gap-2"><ShieldCheck size={17}/>{saving ? "Guardando…" : "Guardar cambios"}</button>
    </div></form></div>}
  </div>;
}
