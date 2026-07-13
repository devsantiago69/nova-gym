import { z } from "zod";
export const loginSchema=z.object({identifier:z.string().trim().toLowerCase().transform(value=>value.startsWith("@")?value.slice(1):value).pipe(z.string().regex(/^[a-z0-9._-]{3,40}$/, "Ingresa un nombre de usuario válido")),password:z.string().min(8).max(128)});
