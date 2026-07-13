export type AppLocale = "es" | "en";

export function localeForTimezone(timezone: string): AppLocale {
  if (timezone === "America/New_York") return "en";
  return "es";
}

export function resolveAppLocale(profile: { locale?: string | null; localeAuto?: boolean | null; timezone?: string | null }): AppLocale {
  if (profile.localeAuto !== false) return localeForTimezone(profile.timezone ?? "America/Bogota");
  return profile.locale === "en" ? "en" : "es";
}
