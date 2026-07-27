import { z } from "zod";

export const levelSchema = z.object({
  level: z.coerce.number().int().min(1).max(999),
  title: z.string().trim().min(2).max(60),
  xpThreshold: z.coerce.number().int().min(0),
  icon: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().max(60).nullable()),
  colorFrom: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().max(20).nullable()),
  colorTo: z.preprocess((value) => (value === "" || value === undefined ? null : value), z.string().trim().max(20).nullable()),
});
