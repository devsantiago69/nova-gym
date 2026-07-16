import { describe, expect, it } from "vitest";
import { clubPostSchema, clubSessionActionSchema, createClubSessionSchema } from "./session-schema";

const validSession = {
  title: "Pierna con el equipo",
  startsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  durationMinutes: 60,
  placeName: "Recepción Nova",
  capacity: 8,
};

describe("club session rules", () => {
  it("accepts a complete future training session", () => {
    expect(createClubSessionSchema.safeParse(validSession).success).toBe(true);
  });

  it("rejects invalid capacity and past schedules", () => {
    expect(createClubSessionSchema.safeParse({ ...validSession, capacity: 1 }).success).toBe(false);
    expect(createClubSessionSchema.safeParse({ ...validSession, startsAt: new Date(0).toISOString() }).success).toBe(false);
  });

  it("only allows supported participation actions", () => {
    expect(clubSessionActionSchema.safeParse({ action: "join" }).success).toBe(true);
    expect(clubSessionActionSchema.safeParse({ action: "delete" }).success).toBe(false);
  });

  it("requires useful club posts", () => {
    expect(clubPostSchema.safeParse({ content: "Nos vemos a las seis" }).success).toBe(true);
    expect(clubPostSchema.safeParse({ content: " " }).success).toBe(false);
  });
});
