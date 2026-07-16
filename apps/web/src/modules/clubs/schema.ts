import { z } from "zod";

export const clubCreateSchema = z.object({
  name: z.string().trim().min(3, "Escribe al menos 3 caracteres").max(120),
  description: z
    .string()
    .trim()
    .min(20, "Describe el propósito del club")
    .max(600),
  type: z.enum(["GYM", "CITY", "DISCIPLINE", "COMMUNITY"]),
  visibility: z.enum(["PUBLIC", "REQUEST", "PRIVATE"]),
  city: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(120).nullable(),
  ),
  discipline: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(120).nullable(),
  ),
  accentColor: z.enum(["lime", "cyan", "orange", "violet"]),
});

export function clubSlug(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 110) || "club-nova"
  );
}
