import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId } = await params;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    membershipId?: string;
  } | null;
  const action = body?.action;
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      memberships: { where: { userId: session.user.id }, take: 1 },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!club) return fail("NOT_FOUND", "Club no encontrado", 404);
  const mine = club.memberships[0];
  if (action === "join") {
    if (club.visibility === "PRIVATE")
      return fail(
        "PRIVATE_CLUB",
        "Este club funciona solo con invitación",
        403,
      );
    if (club._count.memberships >= club.memberLimit)
      return fail("CLUB_FULL", "El club alcanzó su capacidad", 409);
    const status = club.visibility === "PUBLIC" ? "ACTIVE" : "PENDING";
    await prisma.clubMembership.upsert({
      where: { clubId_userId: { clubId, userId: session.user.id } },
      update: {
        status,
        role: "MEMBER",
        joinedAt: status === "ACTIVE" ? new Date() : null,
      },
      create: {
        clubId,
        userId: session.user.id,
        status,
        role: "MEMBER",
        joinedAt: status === "ACTIVE" ? new Date() : null,
      },
    });
    if (status === "PENDING")
      await prisma.notification
        .create({
          data: {
            userId: club.ownerId,
            actorId: session.user.id,
            type: "SYSTEM",
            title: "Nueva solicitud para tu club",
            body: `Alguien quiere entrar a ${club.name}.`,
            href: `/clubes/${club.slug}`,
            dedupeKey: `club-request:${clubId}:${session.user.id}`,
          },
        })
        .catch(() => undefined);
    return ok(
      { status },
      status === "ACTIVE" ? "Ya eres parte del club" : "Solicitud enviada",
    );
  }
  if (action === "leave") {
    if (!mine || mine.status !== "ACTIVE")
      return fail("NOT_MEMBER", "No perteneces a este club", 409);
    if (mine.role === "OWNER")
      return fail(
        "OWNER_CANNOT_LEAVE",
        "Transfiere la administración antes de salir",
        409,
      );
    await prisma.clubMembership.update({
      where: { id: mine.id },
      data: { status: "LEFT", joinedAt: null },
    });
    return ok(null, "Saliste del club");
  }
  if (action === "approve" || action === "reject") {
    if (
      !mine ||
      mine.status !== "ACTIVE" ||
      !["OWNER", "ADMIN"].includes(mine.role)
    )
      return fail("FORBIDDEN", "No puedes administrar solicitudes", 403);
    if (!body?.membershipId)
      return fail("MEMBERSHIP_REQUIRED", "Selecciona una solicitud", 422);
    const target = await prisma.clubMembership.findFirst({
      where: { id: body.membershipId, clubId, status: "PENDING" },
    });
    if (!target) return fail("NOT_FOUND", "Solicitud no encontrada", 404);
    const status = action === "approve" ? "ACTIVE" : "REJECTED";
    await prisma.clubMembership.update({
      where: { id: target.id },
      data: { status, joinedAt: status === "ACTIVE" ? new Date() : null },
    });
    await prisma.notification.create({
      data: {
        userId: target.userId,
        actorId: session.user.id,
        type: "SYSTEM",
        title:
          action === "approve" ? "Bienvenido al club" : "Solicitud actualizada",
        body:
          action === "approve"
            ? `Ya haces parte de ${club.name}.`
            : `Tu solicitud para ${club.name} no fue aprobada.`,
        href: action === "approve" ? `/clubes/${club.slug}` : "/clubes",
      },
    });
    return ok(
      { status },
      action === "approve" ? "Miembro aprobado" : "Solicitud rechazada",
    );
  }
  return fail("INVALID_ACTION", "Acción no válida", 422);
}
