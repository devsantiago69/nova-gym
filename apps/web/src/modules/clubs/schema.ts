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
  country: z.string().trim().min(2).max(100).default("Colombia"),
  department: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(120).nullable(),
  ),
  discipline: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(120).nullable(),
  ),
  disciplines: z
    .array(z.string().trim().min(2).max(60))
    .max(20)
    .default([]),
  accentColor: z.enum(["lime", "cyan", "orange", "violet"]),
  latitude: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().min(-90).max(90).nullable(),
  ),
  longitude: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().min(-180).max(180).nullable(),
  ),
});

export const clubUpdateSchema = clubCreateSchema.extend({
  memberLimit: z.coerce.number().int().min(2).max(5000),
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
