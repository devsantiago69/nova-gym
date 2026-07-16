import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft, Dumbbell, LayoutDashboard, ShieldCheck, Sparkles, UsersRound, WalletCards } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/auth/logout-button";

const links = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuarios", icon: UsersRound },
  { href: "/admin/planes", label: "Planes", icon: WalletCards },
  { href: "/admin/asistencias", label: "Asistencias", icon: Activity },
  { href: "/admin/categorias-retos", label: "Retos", icon: Dumbbell },
  { href: "/admin/plantillas-retos", label: "Plantillas", icon: Sparkles },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/inicio");
  if (session.user.status === "PENDING_PASSWORD_CHANGE") redirect("/cambiar-contrasena");

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,.08),transparent_25%),radial-gradient(circle_at_top_right,rgba(34,211,238,.06),transparent_28%)] md:grid md:grid-cols-[280px_1fr]">
    <aside className="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 p-4 md:block md:p-6">
        <Link href="/admin" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-400 text-slate-950 shadow-[0_0_28px_rgba(163,230,53,.18)]"><ShieldCheck size={23}/></span><span><strong className="block text-lg font-black">Nova Control</strong><small className="text-lime-300">Administración SaaS</small></span></Link>
        <div className="hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:mt-7 md:block"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-lime-400 font-black text-slate-950">A</span><div className="min-w-0"><strong className="block truncate text-sm">{session.user.name ?? "Administrador"}</strong><span className="text-[10px] font-bold text-cyan-300">CONTROL TOTAL</span></div></div></div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:gap-2 md:px-5">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="group flex shrink-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm font-bold transition hover:border-lime-400/50 hover:bg-lime-400/5 hover:text-lime-300 md:w-full"><Icon size={19} className="text-slate-500 transition group-hover:text-lime-300"/>{label}</Link>)}</nav>
      <div className="hidden px-5 md:absolute md:inset-x-0 md:bottom-6 md:block"><Link href="/inicio" className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-400 hover:text-white"><ArrowLeft size={17}/>Vista de usuario</Link><LogoutButton/></div>
    </aside>
    <main className="min-w-0 p-4 pb-24 sm:p-6 md:p-8 md:pb-10 xl:p-10">
      <div className="mx-auto max-w-[1500px]">{children}</div>
    </main>
    <div className="fixed bottom-4 right-4 z-40 flex gap-2 md:hidden"><Link href="/inicio" aria-label="Vista de usuario" className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-700 bg-slate-900 shadow-xl"><ArrowLeft size={19}/></Link><div className="[&_button]:h-12 [&_button]:rounded-2xl [&_button]:px-4"><LogoutButton/></div></div>
  </div>;
}
