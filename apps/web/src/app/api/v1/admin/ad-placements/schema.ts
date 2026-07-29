import { z } from "zod";

export const VALID_PAGES = ["inicio", "actividad", "retos", "perfil"] as const;

export const adPlacementSchema = z.object({
  key: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  label: z.string().trim().min(2).max(120),
  page: z.enum(VALID_PAGES),
  format: z.enum(["DISPLAY", "NATIVE_FEED", "REWARDED"]),
  slotId: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(60).nullable(),
  ),
  enabled: z.boolean().default(false),
  frequency: z.coerce.number().int().min(1).max(50).default(6),
});

export const adPlacementToggleSchema = z.object({
  enabled: z.boolean(),
});
