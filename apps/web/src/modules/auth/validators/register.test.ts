import { describe, expect, it } from "vitest";
import { registerSchema } from "./register";

const valid = { firstName: "Ana", lastName: "Pérez", username: "@ana.fit", email: "", whatsappNumber: "+573001234567", password: "Segura2026!Demo" };
describe("registerSchema", () => {
  it("acepta registro sin correo y normaliza usuario", () => expect(registerSchema.parse(valid).username).toBe("ana.fit"));
  it("rechaza WhatsApp sin prefijo internacional", () => expect(registerSchema.safeParse({ ...valid, whatsappNumber: "3001234567" }).success).toBe(false));
  it("rechaza una contraseña corta", () => expect(registerSchema.safeParse({ ...valid, password: "corta" }).success).toBe(false));
});
