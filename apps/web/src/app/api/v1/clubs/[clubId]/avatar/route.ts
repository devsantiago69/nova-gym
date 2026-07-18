import { getServerSession } from "next-auth";
import { DomainError } from "@gymchallenge/domain";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { deletePrivateObject, getPrivateObject, putPrivateObject } from "@/lib/private-storage";
import { normalizeAvatarImage } from "@/modules/profile/avatar-image";

export async function GET(_: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId } = await params;
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { avatarKey: true, visibility: true, memberships: { where: { userId: auth.user.id, status: "ACTIVE" }, select: { id: true }, take: 1 } },
  });
  if (!club?.avatarKey) return fail("NOT_FOUND", "Foto del club no encontrada", 404);
  if (club.visibility === "PRIVATE" && !club.memberships.length) return fail("FORBIDDEN", "No puedes ver este club", 403);
  try {
    const object = await getPrivateObject(club.avatarKey);
    return new Response(Buffer.from(object.body), { headers: { "content-type": object.contentType, "cache-control": "private, max-age=300", "content-disposition": "inline", "x-content-type-options": "nosniff" } });
  } catch {
    return fail("STORAGE_UNAVAILABLE", "No pudimos abrir la foto", 503);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId } = await params;
  const membership = await prisma.clubMembership.findFirst({ where: { clubId, userId: auth.user.id, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } }, include: { club: { select: { avatarKey: true } } } });
  if (!membership) return fail("FORBIDDEN", "No puedes cambiar la identidad del club", 403);
  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) return fail("AVATAR_REQUIRED", "Selecciona una fotografía", 422);
    const image = await normalizeAvatarImage(file);
    const key = `clubs/${clubId}/avatar-${crypto.randomUUID()}.webp`;
    await putPrivateObject(key, image.body, image.contentType);
    await prisma.club.update({ where: { id: clubId }, data: { avatarKey: key } });
    if (membership.club.avatarKey) await deletePrivateObject(membership.club.avatarKey).catch(() => undefined);
    return ok({ avatarUrl: `/api/v1/clubs/${clubId}/avatar?v=${Date.now()}` }, "Foto del club actualizada");
  } catch (error) {
    if (error instanceof DomainError) return fail(error.code, error.message, 422);
    console.error("club.avatar.failed", { clubId, error });
    return fail("INTERNAL_ERROR", "No pudimos guardar la foto del club", 500);
  }
}
