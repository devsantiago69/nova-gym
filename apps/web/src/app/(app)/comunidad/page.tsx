import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { CommunityManager } from "@/components/social/community-manager";

const personSelect = {
  id: true,
  username: true,
  profile: { select: { firstName: true, lastName: true, avatarKey: true } },
} as const;

export default async function Page() {
  const session = await getServerSession(authOptions);
  const [people, accepted, incoming, outgoing] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { not: session!.user.id },
        status: "ACTIVE",
        deletedAt: null,
      },
      select: personSelect,
      orderBy: { username: "asc" },
      take: 100,
    }),
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: session!.user.id },
          { addresseeId: session!.user.id },
        ],
      },
      select: {
        id: true,
        requesterId: true,
        requester: { select: personSelect },
        addressee: { select: personSelect },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: session!.user.id, status: "PENDING" },
      select: { id: true, requester: { select: personSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { requesterId: session!.user.id, status: "PENDING" },
      select: { id: true, addressee: { select: personSelect } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const friends = accepted.map((row) => ({
    friendshipId: row.id,
    person:
      row.requesterId === session!.user.id ? row.addressee : row.requester,
  }));
  return (
    <section className="relative pb-8">
      <div className="pointer-events-none absolute -left-40 top-10 -z-10 h-96 w-96 rounded-full bg-cyan-300/[.06] blur-3xl" />
      <header className="relative overflow-hidden rounded-[34px] border border-white/[.09] bg-[radial-gradient(circle_at_88%_8%,rgba(34,211,238,.18),transparent_32%),radial-gradient(circle_at_5%_100%,rgba(163,230,53,.1),transparent_34%),rgba(10,18,32,.8)] p-6 shadow-[0_28px_90px_rgba(0,0,0,.22)] backdrop-blur-xl sm:p-9">
        <p className="text-[11px] font-black tracking-[.18em] text-cyan-300">
          COMUNIDAD NOVA
        </p>
        <h1 className="mt-2 max-w-2xl text-4xl font-black leading-tight sm:text-6xl">
          Tu equipo empieza con una conexión.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Encuentra personas, organiza tus solicitudes y crea retos con quienes
          comparten tu energía.
        </p>
      </header>
      <Link
        href="/clubes"
        className="group mb-6 mt-4 flex items-center gap-4 overflow-hidden rounded-[26px] border border-cyan-400/20 bg-[radial-gradient(circle_at_right,rgba(163,230,53,.12),transparent_32%),rgba(15,23,42,.72)] p-5 shadow-[0_18px_50px_rgba(0,0,0,.16)] backdrop-blur-xl transition hover:border-cyan-300/40"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950">
          <Building2 />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-black tracking-[.14em] text-cyan-300">
            CLUBES NOVA
          </span>
          <strong className="mt-0.5 block text-lg">
            Encuentra tu tribu deportiva
          </strong>
          <small className="text-slate-400">
            Gimnasios, ciudades y disciplinas.
          </small>
        </span>
        <ArrowRight className="text-cyan-300 transition group-hover:translate-x-1" />
      </Link>
      <CommunityManager
        people={people}
        friends={friends}
        incoming={incoming.map((row) => ({
          friendshipId: row.id,
          person: row.requester,
        }))}
        outgoing={outgoing.map((row) => ({
          friendshipId: row.id,
          person: row.addressee,
        }))}
      />
    </section>
  );
}
