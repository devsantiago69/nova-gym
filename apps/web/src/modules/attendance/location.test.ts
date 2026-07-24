import { describe, expect, it } from "vitest";
import { attendanceCoordinates } from "./location";

describe("attendanceCoordinates", () => {
  it("permite registrar sin coordenadas cuando el usuario desactiva la ubicación", () => {
    expect(attendanceCoordinates(new FormData(), false)).toBeNull();
  });

  it("valida y normaliza coordenadas cuando la ubicación está activa", () => {
    const form = new FormData();
    form.set("latitude", "4.711");
    form.set("longitude", "-74.0721");
    form.set("accuracy", "18");
    expect(attendanceCoordinates(form, true)).toEqual({
      latitude: 4.711,
      longitude: -74.0721,
      accuracy: 18,
    });
  });

  it("no acepta campos ausentes como coordenadas cero", () => {
    expect(() => attendanceCoordinates(new FormData(), true)).toThrow(
      /preferencia de privacidad/i,
    );
  });
});
