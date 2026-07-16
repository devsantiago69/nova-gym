import { describe, expect, it } from "vitest";
import { calculateChallengeOutcomes } from "./challenge-finalizer";

const date = (value: string) => new Date(value);
describe("challenge final outcomes", () => {
  it("cierra un reto individual como completado o fallido", () => {
    expect(
      calculateChallengeOutcomes("SOLO", "REACH_TARGET", [
        {
          userId: "a",
          metric: 10,
          targetReached: true,
          firstReachedAt: date("2026-01-01"),
        },
      ])[0]?.result,
    ).toBe("COMPLETED");
    expect(
      calculateChallengeOutcomes("SOLO", "REACH_TARGET", [
        { userId: "a", metric: 2, targetReached: false, firstReachedAt: null },
      ])[0]?.result,
    ).toBe("FAILED");
  });
  it("declara ganador por mayor acumulado", () =>
    expect(
      calculateChallengeOutcomes("HEAD_TO_HEAD", "MOST_ATTENDANCES", [
        { userId: "a", metric: 8, targetReached: false, firstReachedAt: null },
        { userId: "b", metric: 5, targetReached: false, firstReachedAt: null },
      ]).map((item) => item.result),
    ).toEqual(["WIN", "LOSS"]));
  it("mantiene empate cuando las métricas son iguales", () =>
    expect(
      calculateChallengeOutcomes("HEAD_TO_HEAD", "STREAK", [
        { userId: "a", metric: 7, targetReached: true, firstReachedAt: null },
        { userId: "b", metric: 7, targetReached: true, firstReachedAt: null },
      ]).map((item) => item.result),
    ).toEqual(["DRAW", "DRAW"]));
  it("elige al primero que alcanza la meta", () =>
    expect(
      calculateChallengeOutcomes("HEAD_TO_HEAD", "FIRST_TO_TARGET", [
        {
          userId: "a",
          metric: 20,
          targetReached: true,
          firstReachedAt: date("2026-01-03"),
        },
        {
          userId: "b",
          metric: 20,
          targetReached: true,
          firstReachedAt: date("2026-01-02"),
        },
      ]).map((item) => item.result),
    ).toEqual(["LOSS", "WIN"]));
});
