import { z } from "zod";

const envSchema = z.object({
  APP_NAME: z.string().min(1).default("GymChallenge"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  WHATSAPP_DEFAULT_COUNTRY_CODE: z.string().regex(/^\d{1,4}$/).default("57"),
  EVOLUTION_API_ENABLED: z.enum(["true", "false", "1", "0"]).default("false"),
  EVOLUTION_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  EVOLUTION_API_INSTANCE_NAME: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().optional(),
  EVOLUTION_FAKE_MODE: z.enum(["true", "false", "1", "0"]).default("true"),
  DEFAULT_TIMEZONE: z.string().default("America/Bogota"),
  DEFAULT_CURRENCY: z.string().length(3).default("COP"),
});

export const appConfig = {
  name: process.env.APP_NAME ?? "GymChallenge",
  timezone: process.env.DEFAULT_TIMEZONE ?? "America/Bogota",
  currency: process.env.DEFAULT_CURRENCY ?? "COP",
} as const;

export function validateServerEnv() { return envSchema.parse(process.env); }
