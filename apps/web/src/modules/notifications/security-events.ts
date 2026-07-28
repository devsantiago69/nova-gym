import { createNotification } from "@/modules/notifications/service";
import { describeUserAgent } from "@/lib/user-agent";

export async function notifyPasswordChanged(
  userId: string,
  input: { ipAddress: string; userAgent: string | null; changedAt: Date },
) {
  const device = describeUserAgent(input.userAgent);
  const formatted = input.changedAt.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  try {
    await createNotification({
      userId,
      type: "PASSWORD_CHANGED",
      title: "Cambiaste tu contraseña",
      body: device
        ? `Se actualizó el ${formatted} desde ${device}.`
        : `Se actualizó el ${formatted}.`,
      href: "/perfil?ajuste=seguridad#ajustes",
      data: {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        changedAt: input.changedAt.toISOString(),
      },
      dedupeKey: `password-changed:${userId}:${input.changedAt.toISOString()}`,
    });
  } catch (error) {
    console.error("[security] Could not create password-changed notification", error);
  }
}
