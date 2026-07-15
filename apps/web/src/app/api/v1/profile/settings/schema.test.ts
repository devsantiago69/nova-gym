import { describe, expect, it } from "vitest";
import { profileSettingsSchema } from "./schema";

const valid = {
  firstName: "Santiago",
  lastName: "Torres",
  username: "santiago",
  email: "santiago@example.com",
  whatsappNumber: "+573001234567",
  bio: "Constancia diaria",
  locale: "es",
  localeAuto: false,
  storyDurationSeconds: 10,
  timezone: "America/Bogota",
  showActiveChallenges: true,
};

describe("profileSettingsSchema", () => {
  it("acepta los idiomas disponibles", () => {
    for (const locale of ["es", "en"])
      expect(
        profileSettingsSchema.safeParse({ ...valid, locale }).success,
      ).toBe(true);
  });
  it("normaliza usuario y correo", () => {
    const result = profileSettingsSchema.parse({
      ...valid,
      username: "SANTIAGO.FIT",
      email: "SANTI@EXAMPLE.COM",
    });
    expect(result.username).toBe("santiago.fit");
    expect(result.email).toBe("santi@example.com");
  });
  it("rechaza WhatsApp sin formato internacional", () =>
    expect(
      profileSettingsSchema.safeParse({
        ...valid,
        whatsappNumber: "3001234567",
      }).success,
    ).toBe(false));
  it("limita la duración de historias a opciones seguras", () => {
    expect(profileSettingsSchema.safeParse({ ...valid, storyDurationSeconds: 20 }).success).toBe(true);
    expect(profileSettingsSchema.safeParse({ ...valid, storyDurationSeconds: 60 }).success).toBe(false);
  });
});
