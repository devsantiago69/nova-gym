import { z } from "zod";

export const challengeCategorySchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,120}$/),
  description: z.string().trim().min(10).max(500),
  type: z.enum(["MOST_ATTENDANCES", "FIRST_TO_TARGET", "REACH_TARGET", "STREAK"]),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  durationDays: z.coerce.number().int().min(1).max(365),
  targetAttendances: z.coerce.number().int().min(1).max(365),
  pointsPerAttendance: z.coerce.number().int().min(0).max(100),
  completionBonus: z.coerce.number().int().min(0).max(10000),
  winnerBonus: z.coerce.number().int().min(0).max(10000),
});
