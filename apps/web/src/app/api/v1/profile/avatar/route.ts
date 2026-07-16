import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { DomainError } from "@gymchallenge/domain";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { deletePrivateObject, putPrivateObject } from "@/lib/private-storage";
import { normalizeAvatarImage } from "@/modules/profile/avatar-image";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File))
      return fail("AVATAR_REQUIRED", "Selecciona una fotografía", 422);
    const image = await normalizeAvatarImage(file);
    const profile = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: session.user.id },
      select: { avatarKey: true },
    });
    const key = `profiles/${session.user.id}/avatar-${crypto.randomUUID()}.webp`;
    await putPrivateObject(key, image.body, image.contentType);
    await prisma.$transaction([
      prisma.userProfile.update({
        where: { userId: session.user.id },
        data: { avatarKey: key },
      }),
      prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "PROFILE_AVATAR_UPDATED",
          entityType: "UserProfile",
          entityId: session.user.id,
          correlationId: crypto.randomUUID(),
        },
      }),
    ]);
    if (profile.avatarKey)
      await deletePrivateObject(profile.avatarKey).catch(() => undefined);
    return ok(
      {
        avatarUrl: `/api/v1/profile/avatar/${session.user.id}?v=${Date.now()}`,
      },
      "Tu foto de perfil quedó actualizada",
    );
  } catch (error) {
    if (error instanceof DomainError)
      return fail(error.code, error.message, 422);
    console.error("profile.avatar.upload.failed", {
      userId: session.user.id,
      error,
    });
    return fail(
      "INTERNAL_ERROR",
      "No pudimos actualizar tu foto de perfil",
      500,
    );
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { avatarKey: true },
  });
  if (!profile?.avatarKey) return ok(null, "Tu perfil ya no tiene fotografía");
  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { avatarKey: null },
  });
  await deletePrivateObject(profile.avatarKey).catch(() => undefined);
  return ok(null, "Foto de perfil eliminada");
}
