import { describe, expect, it } from "vitest";
import { translateSpanishText } from "./catalog";
import { resolveAppLocale } from "./locale";

describe("app locale", () => {
  it("deriva el idioma de la zona horaria en modo automático", () => {
    expect(resolveAppLocale({ locale: "es", localeAuto: true, timezone: "America/New_York" })).toBe("en");
    expect(resolveAppLocale({ locale: "en", localeAuto: true, timezone: "America/Bogota" })).toBe("es");
  });
  it("respeta la selección manual", () => expect(resolveAppLocale({ locale: "en", localeAuto: false, timezone: "America/Bogota" })).toBe("en"));
  it("traduce frases y valores dinámicos", () => {
    expect(translateSpanishText("Hoy ya ganaste.", "en")).toBe("You already won today.");
    expect(translateSpanishText("3 días", "en")).toBe("3 days");
    expect(translateSpanishText("Hoy ya ganaste.", "es")).toBe("Hoy ya ganaste.");
  });
});
