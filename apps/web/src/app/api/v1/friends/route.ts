import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { acceptedFriendCount, activePlanEntitlements } from "@/modules/plans/entitlements";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const body = await request.json().catch(() => null) as { action?: string; targetId?: string; friendshipId?: string } | null;

  if (body?.action === "send" && body.targetId) {
    if (body.targetId === session.user.id) return fail("INVALID_FRIEND", "No puedes agregarte a ti mismo", 422);
    const target = await prisma.user.findFirst({ where: { id: body.targetId, status: "ACTIVE", deletedAt: null }, select: { id: true } });
    if (!target) return fail("USER_NOT_FOUND", "La persona no está disponible", 404);
    const plan = await activePlanEntitlements(session.user.id);
    if (!plan) return fail("PLAN_REQUIRED", "Necesitas un plan activo para agregar amigos", 403);
    if (await acceptedFriendCount(session.user.id) >= plan.friendLimit) return fail("FRIEND_LIMIT_REACHED", `Tu plan permite hasta ${plan.friendLimit} amigos`, 409);
    const existing = await prisma.friendship.findFirst({ where: { OR: [{ requesterId: session.user.id, addresseeId: body.targetId }, { requesterId: body.targetId, addresseeId: session.user.id }] } });
    if (existing?.status === "PENDING") return fail("FRIENDSHIP_PENDING", "Ya existe una solicitud pendiente", 409);
    if (existing?.status === "ACCEPTED") return fail("FRIENDSHIP_EXISTS", "Ya son amigos", 409);
    if (existing?.status === "BLOCKED") return fail("FRIENDSHIP_BLOCKED", "No puedes enviar esta solicitud", 403);
    const friendship = existing
      ? await prisma.friendship.update({ where: { id: existing.id }, data: { requesterId: session.user.id, addresseeId: body.targetId, status: "PENDING" } })
      : await prisma.friendship.create({ data: { requesterId: session.user.id, addresseeId: body.targetId } });
    const actorName = await userDisplayName(session.user.id);
    await createNotifications([{
      userId: body.targetId,
      actorId: session.user.id,
      type: "FRIEND_REQUEST",
      title: "Nueva solicitud de amistad",
      body: `${actorName} quiere entrenar y compartir retos contigo.`,
      href: "/comunidad",
      dedupeKey: `friend-request:${friendship.id}:${friendship.updatedAt.toISOString()}`,
    }]);
    return ok(friendship, "Solicitud enviada", 201);
  }

  if (body?.action === "accept" && body.friendshipId) {
    const row = await prisma.friendship.findFirst({ where: { id: body.friendshipId, addresseeId: session.user.id, status: "PENDING" } });
    if (!row) return fail("NOT_FOUND", "Solicitud no encontrada", 404);
    const [myPlan, requesterPlan, myFriends, requesterFriends] = await Promise.all([
      activePlanEntitlements(session.user.id),
      activePlanEntitlements(row.requesterId),
      acceptedFriendCount(session.user.id),
      acceptedFriendCount(row.requesterId),
    ]);
    if (!myPlan || !requesterPlan) return fail("PLAN_REQUIRED", "Ambos usuarios necesitan un plan activo", 403);
    if (myFriends >= myPlan.friendLimit) return fail("FRIEND_LIMIT_REACHED", `Tu plan permite hasta ${myPlan.friendLimit} amigos`, 409);
    if (requesterFriends >= requesterPlan.friendLimit) return fail("REQUESTER_FRIEND_LIMIT_REACHED", "Tu amigo alcanzó el límite de su plan", 409);
    const friendship = await prisma.friendship.update({ where: { id: row.id }, data: { status: "ACCEPTED" } });
    const actorName = await userDisplayName(session.user.id);
    await createNotifications([{
      userId: row.requesterId,
      actorId: session.user.id,
      type: "FRIEND_ACCEPTED",
      title: "¡Ya son equipo!",
      body: `${actorName} aceptó tu solicitud. Ya pueden crear retos juntos.`,
      href: "/comunidad",
      dedupeKey: `friend-accepted:${row.id}`,
    }]);
    return ok(friendship, "Ahora son amigos");
  }

  if (body?.action === "reject" && body.friendshipId) {
    const row = await prisma.friendship.findFirst({ where: { id: body.friendshipId, addresseeId: session.user.id, status: "PENDING" } });
    if (!row) return fail("NOT_FOUND", "Solicitud no encontrada", 404);
    return ok(await prisma.friendship.update({ where: { id: row.id }, data: { status: "REJECTED" } }), "Solicitud rechazada");
  }

  if (body?.action === "cancel" && body.friendshipId) {
    const row = await prisma.friendship.findFirst({ where: { id: body.friendshipId, requesterId: session.user.id, status: "PENDING" } });
    if (!row) return fail("NOT_FOUND", "Solicitud no encontrada", 404);
    return ok(await prisma.friendship.update({ where: { id: row.id }, data: { status: "CANCELED" } }), "Solicitud cancelada");
  }

  return fail("VALIDATION_ERROR", "Acción inválida", 422);
}
