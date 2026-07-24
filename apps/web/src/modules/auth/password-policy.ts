import { z } from "zod";

const blockedPasswords = new Set([
  "123456789012",
  "administrator",
  "admin12345678",
  "contraseña123",
  "password1234",
  "qwerty123456",
  "novagym12345",
]);

export const strongPasswordSchema = z
  .string()
  .min(12, "La contraseña debe tener mínimo 12 caracteres")
  .max(128, "La contraseña debe tener máximo 128 caracteres")
  .refine(
    (value) => !blockedPasswords.has(value.toLowerCase()),
    "Elige una contraseña menos común",
  );
