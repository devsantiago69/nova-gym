import { describe, expect, it } from "vitest";
import { challengeRulesChecksum } from "./rule-snapshot";

describe("challengeRulesChecksum", () => {
  it("genera el mismo checksum aunque cambie el orden de las propiedades", () => {
    const first = { durationDays: 30, target: { unit: "attendances", value: 20 }, weekdays: [1, 2, 3] };
    const second = { weekdays: [1, 2, 3], target: { value: 20, unit: "attendances" }, durationDays: 30 };
    expect(challengeRulesChecksum(first)).toBe(challengeRulesChecksum(second));
  });

  it("detecta cualquier modificación de una regla congelada", () => {
    const original = { durationDays: 30, pointsPerCompletion: 1, maxDailyCompletions: 1 };
    const edited = { durationDays: 45, pointsPerCompletion: 1, maxDailyCompletions: 1 };
    expect(challengeRulesChecksum(original)).not.toBe(challengeRulesChecksum(edited));
  });
});
