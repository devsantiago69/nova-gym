import { z } from "zod";
import { strongPasswordSchema } from "../password-policy";

export const registerSchema = z.object({
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
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresa un correo válido"),
  password: strongPasswordSchema,
});
