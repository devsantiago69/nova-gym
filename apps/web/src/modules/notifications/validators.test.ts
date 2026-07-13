import { describe, expect, it } from "vitest";
import { notificationActionSchema } from "./validators";

describe("notificationActionSchema", () => {
  it("acepta marcar una notificación como leída", () => {
    expect(notificationActionSchema.safeParse({ action: "read", id: "11111111-1111-4111-8111-111111111111" }).success).toBe(true);
  });

  it("acepta marcar todas como leídas", () => {
    expect(notificationActionSchema.safeParse({ action: "read_all" }).success).toBe(true);
  });

  it("rechaza ids y acciones no permitidas", () => {
    expect(notificationActionSchema.safeParse({ action: "read", id: "invalido" }).success).toBe(false);
    expect(notificationActionSchema.safeParse({ action: "delete_all" }).success).toBe(false);
  });
});
