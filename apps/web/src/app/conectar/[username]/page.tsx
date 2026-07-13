import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { CalendarCheck, Flame, Trophy, UsersRound } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { AutoFriendRequest } from "@/components/profile/auto-friend-request";
import { authOptions } from "@/lib/auth";
import { publicFitnessStats } from "@/modules/profile/public-stats";

export const metadata: Metadata = { title: "Conectar", description: "Conecta y entrena con amigos en Nova Gym" };

export default async function ConnectPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const target = await prisma.user.findFirst({ where: { username: decodeURIComponent(username).toLowerCase(), status: "ACTIVE", deletedAt: null }, include: { profile: true } });
  if (!target) notFound();
  const [session, stats] = await Promise.all([getServerSession(authOptions), publicFitnessStats(target.id)]);
  const name = `${target.profile?.firstName ?? ""} ${target.profile?.lastName ?? ""}`.trim() || target.username;
  const callbackUrl = `/conectar/${encodeURIComponent(target.username)}`;
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const ownProfile = session?.user.id === target.id;
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#05080d] px-4 py-8"><div className="pointer-events-none absolute -left-28 -top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"/><div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl"/><section className="relative w-full max-w-lg overflow-hidden rounded-[34px] border border-slate-700 bg-slate-900/90 shadow-2xl"><div className="bg-gradient-to-br from-lime-400 via-emerald-400 to-cyan-400 p-7 text-slate-950"><div className="flex items-center justify-between"><span className="text-sm font-black">NOVA GYM</span><span className="rounded-full bg-slate-950/15 px-3 py-1 text-[9px] font-black">PERFIL VERIFICADO</span></div><div className="mt-12 grid h-24 w-24 place-items-center rounded-[28px] bg-slate-950 text-4xl font-black text-lime-300 shadow-xl">{name.charAt(0).toUpperCase()}</div><h1 className="mt-5 text-4xl font-black">{name}</h1><p className="mt-1 font-bold text-slate-800">@{target.username}</p></div><div className="p-6 sm:p-7"><p className="text-xs font-black tracking-[.16em] text-lime-300">SU ENERGÍA EN NÚMEROS</p><div className="mt-4 grid grid-cols-2 gap-3"><span className="rounded-2xl bg-slate-950 p-4"><CalendarCheck className="text-lime-300"/><strong className="mt-3 block text-2xl">{stats.attendances}</strong><small className="muted">asistencias</small></span><span className="rounded-2xl bg-slate-950 p-4"><Flame className="text-orange-300"/><strong className="mt-3 block text-2xl">{stats.streak} días</strong><small className="muted">racha actual</small></span><span className="rounded-2xl bg-slate-950 p-4"><Trophy className="text-cyan-300"/><strong className="mt-3 block text-2xl">{stats.challengePoints}</strong><small className="muted">puntos en retos</small></span><span className="rounded-2xl bg-slate-950 p-4"><UsersRound className="text-violet-300"/><strong className="mt-3 block text-2xl">{stats.friends}</strong><small className="muted">amigos</small></span></div>{ownProfile ? <Link href="/perfil" className="btn mt-6 w-full py-4">Volver a mi perfil</Link> : <AutoFriendRequest {...(session ? { targetId: target.id } : {})} loginUrl={loginUrl}/>}<p className="mt-5 text-center text-[11px] muted">Las evidencias y ubicaciones de {name} permanecen privadas.</p></div></section></main>;
}
