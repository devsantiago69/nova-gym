import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

const preferenceSchema = z.object({ enabled: z.boolean() });

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);

  const parsed = preferenceSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return fail("VALIDATION_ERROR", "Selecciona una preferencia válida", 422);

  await prisma.$transaction([
    prisma.userProfile.update({
      where: { userId: session.user.id },
      data: { attendanceLocationEnabled: parsed.data.enabled },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "ATTENDANCE_LOCATION_PREFERENCE_UPDATED",
        entityType: "UserProfile",
        entityId: session.user.id,
        correlationId: crypto.randomUUID(),
        newValues: { enabled: parsed.data.enabled },
      },
    }),
  ]);

  return ok(
    { enabled: parsed.data.enabled },
    parsed.data.enabled
      ? "Ubicación activada para tus próximas asistencias"
      : "Tus próximas asistencias se registrarán sin ubicación",
  );
}
