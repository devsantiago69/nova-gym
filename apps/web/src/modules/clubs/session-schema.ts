import { z } from "zod";

export const createClubSessionSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(600).optional().default(""),
  startsAt: z.coerce.date().refine((date) => date.getTime() > Date.now() + 5 * 60_000, {
    message: "La sesión debe comenzar al menos 5 minutos en el futuro",
  }),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  placeName: z.string().trim().min(2).max(160),
  address: z.string().trim().max(240).optional().default(""),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  capacity: z.coerce.number().int().min(2).max(100),
});

export const clubSessionActionSchema = z.object({
  action: z.enum(["join", "leave", "cancel", "complete"]),
});

export const clubPostSchema = z.object({
  content: z.string().trim().min(2).max(800),
});
