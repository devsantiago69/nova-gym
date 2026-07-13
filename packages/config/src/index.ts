import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("GymChallenge"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  DEFAULT_TIMEZONE: z.string().default("America/Bogota"),
  DEFAULT_CURRENCY: z.string().length(3).default("COP"),
});

export const appConfig = {
  name: process.env.APP_NAME ?? "GymChallenge",
  timezone: process.env.DEFAULT_TIMEZONE ?? "America/Bogota",
  currency: process.env.DEFAULT_CURRENCY ?? "COP",
} as const;

export function validateServerEnv() { return envSchema.parse(process.env); }
