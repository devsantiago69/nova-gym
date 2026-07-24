import { z } from "zod";
import { strongPasswordSchema } from "../../auth/password-policy";

export const createUserSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/),
  email: z.string().trim().toLowerCase().email(),
  password: strongPasswordSchema,
  whatsappNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/)
    .optional(),
  countryCode: z
    .string()
    .regex(/^\+\d{1,3}$/)
    .optional(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: strongPasswordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "La nueva contraseña debe ser diferente",
  });
