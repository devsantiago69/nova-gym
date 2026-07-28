import { prisma } from "@gymchallenge/database";

type ConfigMap = Record<string, number>;

let configCache: { value: ConfigMap; expiresAt: number } | undefined;

async function loadConfig(): Promise<ConfigMap> {
  const now = Date.now();
  if (configCache && configCache.expiresAt > now) return configCache.value;
  const rows = await prisma.gamificationConfig.findMany({
    select: { key: true, value: true },
  });
  const map: ConfigMap = {};
  for (const row of rows) map[row.key] = row.value;
  configCache = { value: map, expiresAt: now + 120_000 };
  return map;
}

export async function xpValue(key: string, fallback: number): Promise<number> {
  try {
    const config = await loadConfig();
    return config[key] ?? fallback;
  } catch {
    return fallback;
  }
}

export function invalidateConfigCache() {
  configCache = undefined;
}

// Synchronous fallbacks for backward compatibility in non-async contexts
export const XP_ATTENDANCE_DEFAULT = 25;
export const XP_CHALLENGE_COMPLETED_DEFAULT = 150;
export const XP_STREAK_CLAIM_DEFAULT = 40;
export const XP_AD_WATCH_DEFAULT = 20;
export const XP_DAILY_USAGE_DEFAULT = 10;
export const AD_MIN_WATCH_SECONDS_DEFAULT = 15;
export const AD_XP_DAILY_LIMIT_DEFAULT = 6;
