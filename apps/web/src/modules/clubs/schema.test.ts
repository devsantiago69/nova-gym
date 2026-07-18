import { describe, expect, it } from "vitest";
import { clubCreateSchema, clubSlug } from "./schema";

const valid = {
  name: "Nova Runners Bogotá",
  description:
    "Un club para correr, compartir rutas y construir constancia juntos.",
  type: "DISCIPLINE",
  visibility: "REQUEST",
  city: "Bogotá",
  discipline: "Running",
  accentColor: "cyan",
};

describe("clubCreateSchema", () => {
  it("acepta una configuración social completa", () =>
    expect(clubCreateSchema.safeParse(valid).success).toBe(true));
  it("rechaza clubes sin propósito suficiente", () =>
    expect(
      clubCreateSchema.safeParse({ ...valid, description: "Correr" }).success,
    ).toBe(false));
  it("normaliza ubicación opcional y acepta coordenadas válidas", () => {
    const parsed = clubCreateSchema.safeParse({
      ...valid,
      department: "Cundinamarca",
      latitude: "4.711",
      longitude: "-74.0721",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.country).toBe("Colombia");
      expect(parsed.data.latitude).toBe(4.711);
    }
  });
  it("rechaza coordenadas fuera del planeta", () =>
    expect(
      clubCreateSchema.safeParse({ ...valid, latitude: 200 }).success,
    ).toBe(false));
  it("permite combinar varias disciplinas", () => {
    const parsed = clubCreateSchema.safeParse({
      ...valid,
      disciplines: ["Fuerza", "Running", "Yoga", "Baile"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.disciplines).toHaveLength(4);
  });
  it("genera slugs estables sin acentos", () =>
    expect(clubSlug("Fuerza Bogotá 24/7")).toBe("fuerza-bogota-24-7"));
});
