import Link from "next/link";
import { Activity, ArrowUpRight, Database, Dumbbell, HardDrive, Plus, Trophy, UserCheck, UsersRound, WalletCards } from "lucide-react";
import { prisma } from "@gymchallenge/database";

export default async function AdminDashboard() {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [users, activeUsers, monthAttendances, points, storage, plans, activeChallenges, recentUsers] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.attendance.count({ where: { status: "COMPLETED", localDate: { gte: month } } }),
    prisma.pointLedger.aggregate({ _sum: { amount: true } }),
    prisma.attendancePhoto.aggregate({ _sum: { sizeBytes: true } }),
    prisma.plan.count({ where: { status: "ACTIVE" } }),
    prisma.challenge.count({ where: { status: "ACTIVE" } }),
    prisma.user.findMany({ where: { deletedAt: null }, include: { profile: true, subscriptions: { where: { status: "ACTIVE" }, include: { plan: true }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const cards = [
    { label: "Usuarios", value: users, detail: `${activeUsers} activos`, icon: UsersRound, color: "text-lime-300", glow: "from-lime-400/15" },
    { label: "Asistencias del mes", value: monthAttendances, detail: "Entrenamientos completados", icon: Activity, color: "text-cyan-300", glow: "from-cyan-400/15" },
    { label: "Retos activos", value: activeChallenges, detail: "Competencias en curso", icon: Dumbbell, color: "text-orange-300", glow: "from-orange-400/15" },
    { label: "Planes disponibles", value: plans, detail: "Oferta comercial activa", icon: WalletCards, color: "text-violet-300", glow: "from-violet-400/15" },
  ];
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><span className="inline-flex items-center gap-2 rounded-full bg-lime-400/10 px-3 py-1.5 text-xs font-black text-lime-300"><Database size={14}/>PLATAFORMA EN VIVO</span><h1 className="mt-3 text-3xl font-black sm:text-4xl">Centro de operaciones</h1><p className="mt-2 muted">Usuarios, negocio y actividad deportiva desde un solo lugar.</p></div><Link href="/admin/usuarios" className="btn gap-2"><Plus size={18}/>Nuevo usuario</Link></div>

    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon, color, glow }) => <article key={label} className={`relative overflow-hidden rounded-[26px] border border-slate-800 bg-gradient-to-br ${glow} via-slate-900 to-slate-950 p-5 shadow-[0_18px_60px_rgba(0,0,0,.16)]`}><div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-2xl bg-slate-950/70 ${color}`}><Icon size={22}/></span><ArrowUpRight size={18} className="text-slate-600"/></div><p className="mt-5 text-3xl font-black">{value}</p><p className="mt-1 font-bold">{label}</p><p className="mt-1 text-xs muted">{detail}</p></article>)}</div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-800 p-5"><div><p className="text-xs font-black text-cyan-300">CRECIMIENTO</p><h2 className="mt-1 text-xl font-black">Usuarios recientes</h2></div><Link href="/admin/usuarios" className="text-sm font-bold text-lime-300">Administrar</Link></div><div className="divide-y divide-slate-800">{recentUsers.map((user) => <div key={user.id} className="flex items-center gap-3 p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-400 to-cyan-400 font-black text-slate-950">{(user.profile?.firstName ?? user.username).charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><strong className="block truncate">{user.profile?.firstName} {user.profile?.lastName}</strong><span className="text-xs muted">@{user.username}</span></div><div className="text-right"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${user.status === "ACTIVE" ? "bg-lime-400/10 text-lime-300" : "bg-slate-700 text-slate-300"}`}>{user.status === "ACTIVE" ? "ACTIVO" : user.status}</span><p className="mt-1 text-[10px] muted">{user.subscriptions[0]?.plan.name ?? "Sin plan"}</p></div></div>)}</div></section>
      <section className="space-y-4"><article className="rounded-[26px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-slate-900 p-6"><Trophy className="text-yellow-300"/><p className="mt-4 text-3xl font-black">{points._sum.amount ?? 0}</p><p className="font-bold">Puntos globales emitidos</p><p className="mt-1 text-sm muted">Movimientos de asistencia y ajustes administrativos.</p></article><article className="rounded-[26px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-slate-900 p-6"><HardDrive className="text-cyan-300"/><p className="mt-4 text-3xl font-black">{((storage._sum.sizeBytes ?? 0) / 1048576).toFixed(1)} MB</p><p className="font-bold">Evidencias almacenadas</p><p className="mt-1 text-sm muted">Fotografías privadas protegidas por autorización.</p></article></section>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Link href="/admin/usuarios" className="card flex items-center gap-3 p-4 transition hover:border-lime-400"><UserCheck className="text-lime-300"/><div><strong>Gestionar accesos</strong><p className="text-xs muted">Editar, suspender o restablecer</p></div></Link><Link href="/admin/planes" className="card flex items-center gap-3 p-4 transition hover:border-violet-400"><WalletCards className="text-violet-300"/><div><strong>Configurar planes</strong><p className="text-xs muted">Precios y límites del SaaS</p></div></Link><Link href="/admin/plantillas-retos" className="card flex items-center gap-3 p-4 transition hover:border-orange-400"><Dumbbell className="text-orange-300"/><div><strong>Diseñar plantillas</strong><p className="text-xs muted">Publicar versiones sin alterar retos</p></div></Link></div>
  </section>;
}
