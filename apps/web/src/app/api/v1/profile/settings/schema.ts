import { z } from "zod";

export const profileSettingsSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(100),
  lastName: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, "Usa entre 3 y 40 letras, números, puntos o guiones"),
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  whatsappNumber: z.preprocess((value) => value === "" ? null : value, z.string().regex(/^\+[1-9]\d{7,14}$/, "Usa formato internacional, por ejemplo +573001234567").nullable()),
  bio: z.preprocess((value) => value === "" ? null : value, z.string().trim().max(280).nullable()),
  locale: z.enum(["es", "en"]),
  localeAuto: z.boolean(),
  timezone: z.enum(["America/Bogota", "America/Mexico_City", "America/Lima", "America/Santiago", "America/Argentina/Buenos_Aires", "America/New_York", "Europe/Madrid"]),
  showActiveChallenges: z.boolean(),
});
