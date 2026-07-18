import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";
import { canAdministerClub, canRemoveClubMember } from "@/modules/clubs/permissions";

type Body = { action?: string; membershipId?: string; userId?: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId } = await params;
  const body = (await request.json().catch(() => null)) as Body | null;
  const action = body?.action;
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      memberships: { where: { userId: auth.user.id }, take: 1 },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!club) return fail("NOT_FOUND", "Club no encontrado", 404);
  const mine = club.memberships[0];
  const isManager = canAdministerClub(mine?.status, mine?.role);
  const isOwner = mine?.status === "ACTIVE" && mine.role === "OWNER";

  if (action === "join") {
    if (club.visibility === "PRIVATE")
      return fail("PRIVATE_CLUB", "Este club funciona solo con invitación", 403);
    if (club._count.memberships >= club.memberLimit)
      return fail("CLUB_FULL", "El club alcanzó su capacidad", 409);
    const status = club.visibility === "PUBLIC" ? "ACTIVE" : "PENDING";
    const membership = await prisma.clubMembership.upsert({
      where: { clubId_userId: { clubId, userId: auth.user.id } },
      update: { status, role: "MEMBER", joinedAt: status === "ACTIVE" ? new Date() : null },
      create: { clubId, userId: auth.user.id, status, role: "MEMBER", joinedAt: status === "ACTIVE" ? new Date() : null },
    });
    if (status === "PENDING") {
      const managers = await prisma.clubMembership.findMany({ where: { clubId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } }, select: { userId: true } });
      const actorName = await userDisplayName(auth.user.id);
      await createNotifications(managers.map(({ userId }) => ({ userId, actorId: auth.user.id, type: "SYSTEM" as const, title: "Nueva solicitud para tu club", body: `${actorName} quiere entrar a ${club.name}.`, href: `/clubes/${club.slug}`, dedupeKey: `club-request:${membership.id}:${membership.updatedAt.toISOString()}` })));
    }
    return ok({ status }, status === "ACTIVE" ? "Ya eres parte del club" : "Solicitud enviada");
  }

  if (action === "accept_invite" || action === "decline_invite") {
    if (!mine || mine.status !== "INVITED")
      return fail("INVITE_NOT_FOUND", "La invitación ya no está disponible", 404);
    if (action === "accept_invite" && club._count.memberships >= club.memberLimit)
      return fail("CLUB_FULL", "El club alcanzó su capacidad", 409);
    const status = action === "accept_invite" ? "ACTIVE" : "REJECTED";
    await prisma.clubMembership.update({ where: { id: mine.id }, data: { status, joinedAt: status === "ACTIVE" ? new Date() : null } });
    await createNotifications([{ userId: club.ownerId, actorId: auth.user.id, type: "SYSTEM", title: action === "accept_invite" ? "Invitación aceptada" : "Invitación actualizada", body: action === "accept_invite" ? `${await userDisplayName(auth.user.id)} ya es parte de ${club.name}.` : "La invitación al club fue rechazada.", href: `/clubes/${club.slug}` }]);
    return ok({ status }, action === "accept_invite" ? "Bienvenido al club" : "Invitación rechazada");
  }

  if (action === "leave") {
    if (!mine || mine.status !== "ACTIVE") return fail("NOT_MEMBER", "No perteneces a este club", 409);
    if (mine.role === "OWNER") return fail("OWNER_CANNOT_LEAVE", "Primero cede el club a otro integrante", 409);
    await prisma.clubMembership.update({ where: { id: mine.id }, data: { status: "LEFT", role: "MEMBER", joinedAt: null } });
    return ok(null, "Saliste del club");
  }

  if (action === "invite") {
    if (!isManager) return fail("FORBIDDEN", "No puedes invitar integrantes", 403);
    if (!body?.userId) return fail("USER_REQUIRED", "Selecciona un amigo", 422);
    if (club._count.memberships >= club.memberLimit) return fail("CLUB_FULL", "El club alcanzó su capacidad", 409);
    const friendship = await prisma.friendship.findFirst({ where: { status: "ACCEPTED", OR: [{ requesterId: auth.user.id, addresseeId: body.userId }, { requesterId: body.userId, addresseeId: auth.user.id }] } });
    if (!friendship) return fail("FRIEND_REQUIRED", "Solo puedes invitar amigos aceptados", 403);
    const existing = await prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId, userId: body.userId } } });
    if (existing?.status === "ACTIVE") return fail("ALREADY_MEMBER", "Esta persona ya pertenece al club", 409);
    const invited = await prisma.clubMembership.upsert({ where: { clubId_userId: { clubId, userId: body.userId } }, update: { status: "INVITED", role: "MEMBER", joinedAt: null }, create: { clubId, userId: body.userId, status: "INVITED", role: "MEMBER" } });
    await createNotifications([{ userId: body.userId, actorId: auth.user.id, type: "SYSTEM", title: `Te invitaron a ${club.name}`, body: `${await userDisplayName(auth.user.id)} quiere que seas parte del club.`, href: `/clubes/${club.slug}`, data: { clubId, membershipId: invited.id }, dedupeKey: `club-invite:${invited.id}:${invited.updatedAt.toISOString()}` }]);
    return ok({ membershipId: invited.id }, "Invitación enviada");
  }

  if (action === "approve" || action === "reject") {
    if (!isManager) return fail("FORBIDDEN", "No puedes administrar solicitudes", 403);
    if (!body?.membershipId) return fail("MEMBERSHIP_REQUIRED", "Selecciona una solicitud", 422);
    const target = await prisma.clubMembership.findFirst({ where: { id: body.membershipId, clubId, status: "PENDING" } });
    if (!target) return fail("NOT_FOUND", "Solicitud no encontrada", 404);
    const status = action === "approve" ? "ACTIVE" : "REJECTED";
    await prisma.clubMembership.update({ where: { id: target.id }, data: { status, joinedAt: status === "ACTIVE" ? new Date() : null } });
    await createNotifications([{ userId: target.userId, actorId: auth.user.id, type: "SYSTEM", title: action === "approve" ? "Bienvenido al club" : "Solicitud actualizada", body: action === "approve" ? `Ya haces parte de ${club.name}.` : `Tu solicitud para ${club.name} no fue aprobada.`, href: action === "approve" ? `/clubes/${club.slug}` : "/clubes" }]);
    return ok({ status }, action === "approve" ? "Miembro aprobado" : "Solicitud rechazada");
  }

  if (["promote", "demote", "remove", "transfer"].includes(action ?? "")) {
    if (!body?.membershipId) return fail("MEMBERSHIP_REQUIRED", "Selecciona un integrante", 422);
    const target = await prisma.clubMembership.findFirst({ where: { id: body.membershipId, clubId, status: "ACTIVE" }, include: { user: { select: { username: true } } } });
    if (!target) return fail("NOT_FOUND", "Integrante no encontrado", 404);
    if (target.role === "OWNER") return fail("OWNER_PROTECTED", "La propiedad del club está protegida", 409);

    if (action === "transfer") {
      if (!isOwner) return fail("OWNER_REQUIRED", "Solo el propietario puede ceder el club", 403);
      await prisma.$transaction([
        prisma.club.update({ where: { id: clubId }, data: { ownerId: target.userId } }),
        prisma.clubMembership.update({ where: { id: target.id }, data: { role: "OWNER" } }),
        prisma.clubMembership.update({ where: { id: mine!.id }, data: { role: "ADMIN" } }),
        prisma.auditLog.create({ data: { actorId: auth.user.id, action: "CLUB_OWNERSHIP_TRANSFERRED", entityType: "Club", entityId: clubId, correlationId: crypto.randomUUID(), newValues: { newOwnerId: target.userId } } }),
      ]);
      await createNotifications([{ userId: target.userId, actorId: auth.user.id, type: "SYSTEM", title: `Ahora lideras ${club.name}`, body: "Te cedieron la propiedad del club. Ya tienes control completo.", href: `/clubes/${club.slug}` }]);
      return ok(null, "Propiedad transferida. Ahora eres administrador");
    }

    if (action === "promote" || action === "demote") {
      if (!isOwner) return fail("OWNER_REQUIRED", "Solo el propietario gestiona administradores", 403);
      const role = action === "promote" ? "ADMIN" : "MEMBER";
      await prisma.clubMembership.update({ where: { id: target.id }, data: { role } });
      await createNotifications([{ userId: target.userId, actorId: auth.user.id, type: "SYSTEM", title: role === "ADMIN" ? `Ahora administras ${club.name}` : "Rol del club actualizado", body: role === "ADMIN" ? "Puedes gestionar integrantes, solicitudes y sesiones." : "Tu rol cambió a integrante.", href: `/clubes/${club.slug}` }]);
      return ok({ role }, role === "ADMIN" ? "Administrador nombrado" : "Rol actualizado");
    }

    if (!isManager || !canRemoveClubMember(mine!.role, target.role)) return fail("FORBIDDEN", "No puedes retirar a este integrante", 403);
    await prisma.clubMembership.update({ where: { id: target.id }, data: { status: "LEFT", role: "MEMBER", joinedAt: null } });
    await createNotifications([{ userId: target.userId, actorId: auth.user.id, type: "SYSTEM", title: `Ya no perteneces a ${club.name}`, body: "El equipo administrador actualizó tu membresía.", href: "/clubes" }]);
    return ok(null, "Integrante retirado del club");
  }

  return fail("INVALID_ACTION", "Acción no válida", 422);
}
