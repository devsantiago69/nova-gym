import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { profileSettingsSchema } from "./schema";
import { resolveAppLocale } from "@/lib/i18n/locale";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = profileSettingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Revisa tus datos",
      422,
    );
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          username: parsed.data.username,
          email: parsed.data.email,
          whatsappNumber: parsed.data.whatsappNumber,
        },
      });
      const profile = await tx.userProfile.update({
        where: { userId: session.user.id },
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          bio: parsed.data.bio,
          locale: parsed.data.locale,
          localeAuto: parsed.data.localeAuto,
          fontFamily: parsed.data.fontFamily,
          storyDurationSeconds: parsed.data.storyDurationSeconds,
          timezone: parsed.data.timezone,
          showActiveChallenges: parsed.data.showActiveChallenges,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "PROFILE_SETTINGS_UPDATED",
          entityType: "User",
          entityId: session.user.id,
          correlationId: crypto.randomUUID(),
          newValues: {
            username: parsed.data.username,
            locale: parsed.data.locale,
            localeAuto: parsed.data.localeAuto,
            fontFamily: parsed.data.fontFamily,
            storyDurationSeconds: parsed.data.storyDurationSeconds,
            timezone: parsed.data.timezone,
            showActiveChallenges: parsed.data.showActiveChallenges,
          },
        },
      });
      return profile;
    });
    const resolvedLocale = resolveAppLocale(updated);
    const response = ok(
      {
        locale: resolvedLocale,
        localeAuto: updated.localeAuto,
        timezone: updated.timezone,
      },
      "Tu perfil quedó actualizado",
    );
    response.cookies.set("nova_locale", resolvedLocale, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return fail(
        "PROFILE_VALUE_IN_USE",
        "El usuario, correo o WhatsApp ya pertenece a otra cuenta",
        409,
      );
    console.error("profile.settings.update.failed", {
      userId: session.user.id,
      error,
    });
    return fail("INTERNAL_ERROR", "No pudimos actualizar tu perfil", 500);
  }
}
