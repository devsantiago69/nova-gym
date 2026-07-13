"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";

type User = {
  id: string;
  email: string;
  username: string;
  role: "ADMIN" | "USER";
  status: string;
  profile: { firstName: string; lastName: string } | null;
};

export function UserManager({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string }>();

  function recommendPassword() {
    const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_+"];
    const random = (characters: string) => characters[crypto.getRandomValues(new Uint32Array(1))[0]! % characters.length]!;
    const required = groups.map(random);
    const all = groups.join("");
    const characters = [...required, ...Array.from({ length: 12 }, () => random(all))];
    for (let index = characters.length - 1; index > 0; index--) { const target = crypto.getRandomValues(new Uint32Array(1))[0]! % (index + 1); [characters[index], characters[target]] = [characters[target]!, characters[index]!]; }
    setPassword(characters.join(""));
    setShowPassword(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!data.whatsappNumber) delete data.whatsappNumber;
    const response = await fetch("/api/v1/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json() as { success: boolean; message: string; data?: User; errors?: Array<{ message: string }> };
    setSaving(false);
    if (!response.ok || !result.data) {
      setMessage(result.errors?.[0]?.message ?? result.message);
      return;
    }
    setUsers((current) => [result.data!, ...current]);
    setCreatedCredentials({ username: String(data.username), password: String(data.password) });
    setMessage("Usuario creado correctamente.");
    form.reset();
    setPassword("");
  }

  return <div className="space-y-8">
    <form onSubmit={submit} className="card grid gap-4 p-5 md:grid-cols-2">
      <div className="md:col-span-2"><h2 className="text-xl font-black">Crear usuario</h2><p className="muted">La cuenta se asignará automáticamente al plan FREE.</p></div>
      <label>Nombre<input name="firstName" required minLength={2} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label>
      <label>Apellidos<input name="lastName" required minLength={2} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label>
      <label>Usuario<input name="username" required minLength={3} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label>
      <label>Correo<input name="email" type="email" required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label>
      <label>WhatsApp E.164<input name="whatsappNumber" placeholder="+573001234567" pattern="\+[1-9][0-9]{7,14}" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label>
      <div><label htmlFor="temporary-password">Contraseña temporal</label><div className="mt-1 flex overflow-hidden rounded-xl border border-slate-700 bg-slate-950"><input id="temporary-password" name="password" type={showPassword?"text":"password"} value={password} onChange={event=>setPassword(event.target.value)} required minLength={12} className="min-w-0 flex-1 bg-transparent p-3 outline-none"/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?"Ocultar contraseña":"Mostrar contraseña"} className="px-3 text-slate-400">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div><button type="button" onClick={recommendPassword} className="mt-2 flex items-center gap-2 text-sm font-bold text-lime-400"><RefreshCw size={16}/> Recomendar contraseña segura</button></div>
      <label>Rol<select name="role" defaultValue="USER" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select></label>
      <input type="hidden" name="countryCode" value="+57" />
      <div className="flex items-end"><button className="btn w-full" disabled={saving}>{saving ? "Creando…" : "Crear usuario"}</button></div>
      {message && <p role="status" className="md:col-span-2 text-sm text-lime-300">{message}</p>}
    </form>
    {createdCredentials&&<aside className="card border-lime-500/50 p-5"><p className="text-sm font-bold text-lime-400">CUENTA CREADA</p><h3 className="mt-1 text-xl font-black">Entrega estas credenciales al usuario</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-950 p-4"><span className="text-xs muted">Usuario</span><p className="font-mono text-lg">@{createdCredentials.username}</p></div><div className="rounded-xl bg-slate-950 p-4"><span className="text-xs muted">Contraseña temporal</span><p className="break-all font-mono text-lg">{createdCredentials.password}</p></div></div><button type="button" onClick={()=>navigator.clipboard.writeText(`Usuario: @${createdCredentials.username}\nContraseña temporal: ${createdCredentials.password}`)} className="mt-4 flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 font-bold"><Copy size={17}/> Copiar credenciales</button><p className="mt-3 text-sm muted">La contraseña deberá cambiarse en el primer ingreso.</p></aside>}
    <div className="card overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-slate-700"><th className="p-4">Nombre</th><th>Usuario</th><th>Correo</th><th>Estado</th><th>Rol</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-slate-800"><td className="p-4">{user.profile?.firstName} {user.profile?.lastName}</td><td>@{user.username}</td><td>{user.email}</td><td>{user.status}</td><td>{user.role}</td></tr>)}</tbody></table></div>
  </div>;
}
