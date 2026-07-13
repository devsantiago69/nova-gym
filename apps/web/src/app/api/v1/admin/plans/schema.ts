import { z } from "zod";

export const planSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/),
  description: z.preprocess((value) => value === "" || value === undefined ? null : value, z.string().trim().max(500).nullable()),
  monthlyPrice: z.coerce.number().min(0).max(100_000_000),
  currency: z.string().trim().toUpperCase().length(3).default("COP"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  trialDays: z.coerce.number().int().min(0).max(365),
  storageLimitMb: z.coerce.number().int().min(0).max(10_000_000),
  activeChallengeLimit: z.coerce.number().int().min(0).max(10_000),
  friendLimit: z.coerce.number().int().min(0).max(1_000_000),
  historyMonths: z.preprocess((value) => value === "" || value === null ? null : value, z.coerce.number().int().min(1).max(1200).nullable()),
  expensesEnabled: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
  advancedStatsEnabled: z.boolean().default(false),
  exportsEnabled: z.boolean().default(false),
});
