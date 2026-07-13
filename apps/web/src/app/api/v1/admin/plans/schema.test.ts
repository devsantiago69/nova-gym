import { describe, expect, it } from "vitest";
import { planSchema } from "./schema";

const validPlan = {
  name: "Gratis",
  code: "free",
  description: "Plan inicial",
  monthlyPrice: "0",
  currency: "cop",
  status: "ACTIVE",
  trialDays: "7",
  storageLimitMb: "250",
  activeChallengeLimit: "2",
  friendLimit: "20",
  historyMonths: "3",
};

describe("planSchema", () => {
  it("normaliza y acepta los límites configurables del plan", () => {
    const result = planSchema.parse(validPlan);
    expect(result).toMatchObject({ code: "FREE", currency: "COP", activeChallengeLimit: 2, storageLimitMb: 250, friendLimit: 20, historyMonths: 3 });
  });

  it("permite historial ilimitado dejando el campo vacío", () => {
    expect(planSchema.parse({ ...validPlan, historyMonths: "" }).historyMonths).toBeNull();
  });

  it("rechaza límites negativos", () => {
    expect(planSchema.safeParse({ ...validPlan, activeChallengeLimit: -1 }).success).toBe(false);
  });
});
