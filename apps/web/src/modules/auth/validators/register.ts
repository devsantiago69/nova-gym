import { z } from "zod";
import { strongPasswordSchema } from "../password-policy";

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Ingresa tu nombre").max(100),
  lastName: z.string().trim().min(2, "Ingresa tus apellidos").max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value.startsWith("@") ? value.slice(1) : value))
    .pipe(
      z
        .string()
        .regex(
          /^[a-z0-9._-]{3,40}$/,
          "Usa de 3 a 40 letras, números, punto, guion o guion bajo",
        ),
    ),
  email: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Ingresa un correo válido")
      .optional(),
  ),
  whatsappNumber: z
    .string()
    .trim()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Usa formato internacional, por ejemplo +573001234567",
    ),
  password: strongPasswordSchema,
});
