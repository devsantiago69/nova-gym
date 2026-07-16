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
  it("genera slugs estables sin acentos", () =>
    expect(clubSlug("Fuerza Bogotá 24/7")).toBe("fuerza-bogota-24-7"));
});
