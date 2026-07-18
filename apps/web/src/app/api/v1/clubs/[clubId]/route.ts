import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { clubUpdateSchema } from "@/modules/clubs/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId } = await params;
  const membership = await prisma.clubMembership.findFirst({
    where: {
      clubId,
      userId: auth.user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!membership)
    return fail("FORBIDDEN", "No puedes editar este club", 403);
  const parsed = clubUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Revisa la configuración",
      422,
    );
  const updated = await prisma.$transaction(async (tx) => {
    const club = await tx.club.update({
      where: { id: clubId },
      data: parsed.data,
      select: { id: true, slug: true, name: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: auth.user.id,
        action: "CLUB_UPDATED",
        entityType: "Club",
        entityId: clubId,
        correlationId: crypto.randomUUID(),
        newValues: parsed.data,
      },
    });
    return club;
  });
  return ok(updated, "Cambios del club guardados");
}
