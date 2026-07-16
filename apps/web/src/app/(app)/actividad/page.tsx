import { getServerSession } from "next-auth";
import { Activity, ShieldCheck } from "lucide-react";
import { SocialFeed } from "@/components/social/social-feed";
import { authOptions } from "@/lib/auth";
import { socialFeed } from "@/modules/social/feed";

export default async function ActivityPage() {
  const session = await getServerSession(authOptions);
  const posts = await socialFeed(session!.user.id, 30);
  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-10">
      <header className="relative overflow-hidden rounded-[30px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/10 via-slate-900 to-violet-400/10 p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
            <Activity />
          </span>
          <div>
            <p className="text-[10px] font-black tracking-[.16em] text-cyan-300">
              PULSO NOVA
            </p>
            <h1 className="mt-1 text-3xl font-black">
              Tu equipo en movimiento
            </h1>
            <p className="mt-2 text-sm muted">
              Entrenamientos, reacciones y motivación dentro de tu círculo.
            </p>
          </div>
        </div>
        <p className="mt-5 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-lime-300" />
          Cada publicación respeta la audiencia elegida por su autor.
        </p>
      </header>
      <SocialFeed initial={posts} />
    </main>
  );
}
