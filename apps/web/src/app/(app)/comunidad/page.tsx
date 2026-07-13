import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { CommunityManager } from "@/components/social/community-manager";

const personSelect = { id: true, username: true, profile: { select: { firstName: true, lastName: true } } } as const;

export default async function Page() {
  const session = await getServerSession(authOptions);
  const [people, accepted, incoming, outgoing] = await Promise.all([
    prisma.user.findMany({ where: { id: { not: session!.user.id }, status: "ACTIVE", deletedAt: null }, select: personSelect, orderBy: { username: "asc" }, take: 100 }),
    prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: session!.user.id }, { addresseeId: session!.user.id }] }, select: { id: true, requesterId: true, requester: { select: personSelect }, addressee: { select: personSelect } }, orderBy: { updatedAt: "desc" } }),
    prisma.friendship.findMany({ where: { addresseeId: session!.user.id, status: "PENDING" }, select: { id: true, requester: { select: personSelect } }, orderBy: { createdAt: "desc" } }),
    prisma.friendship.findMany({ where: { requesterId: session!.user.id, status: "PENDING" }, select: { id: true, addressee: { select: personSelect } }, orderBy: { createdAt: "desc" } }),
  ]);
  const friends = accepted.map((row) => ({ friendshipId: row.id, person: row.requesterId === session!.user.id ? row.addressee : row.requester }));
  return <section>
    <p className="text-sm font-bold text-lime-400">COMUNIDAD</p>
    <h1 className="mt-1 text-3xl font-black sm:text-4xl">Tu círculo deportivo</h1>
    <p className="mb-7 mt-2 muted">Conecta con personas, forma tu equipo y conviertan la constancia en algo social.</p>
    <CommunityManager people={people} friends={friends} incoming={incoming.map((row) => ({ friendshipId: row.id, person: row.requester }))} outgoing={outgoing.map((row) => ({ friendshipId: row.id, person: row.addressee }))}/>
  </section>;
}
