import { z } from "zod";
import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

const onboardingSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe tu nombre").max(100),
  lastName: z.string().trim().min(2, "Escribe tus apellidos").max(100),
  whatsappNumber: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^\+[1-9]\d{7,14}$/.test(v),
      "Usa formato internacional, por ejemplo +573001234567",
    ),
});

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);

  const parsed = onboardingSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Revisa tus datos",
      422,
      parsed.error.issues[0]?.path.join(".") ?? null,
    );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userProfile.update({
        where: { userId: session.user.id },
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
        },
      });
      if (parsed.data.whatsappNumber) {
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            whatsappNumber: parsed.data.whatsappNumber,
            countryCode: "+57",
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "PROFILE_ONBOARDED",
          entityType: "User",
          entityId: session.user.id,
          correlationId: crypto.randomUUID(),
          newValues: {
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
          },
        },
      });
    });
    return ok(null, "Tu perfil fue completado");
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    )
      return fail(
        "WHATSAPP_IN_USE",
        "Ese número de WhatsApp ya pertenece a otra cuenta",
        409,
      );
    console.error("profile.onboarding.failed", error);
    return fail("INTERNAL_ERROR", "No pudimos guardar tu información", 500);
  }
}
