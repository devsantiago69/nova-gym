import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authHandler: vi.fn(async () => new Response("ok", { status: 200 })),
  rateLimit: vi.fn(async () => ({
    allowed: true,
    limit: 15,
    remaining: 14,
    resetAt: Date.now() + 60_000,
  })),
}));

vi.mock("next-auth", () => ({
  default: () => mocks.authHandler,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  requestIp: () => "127.0.0.1",
  tooManyRequests: () => new Response("limited", { status: 429 }),
}));

import { POST } from "./route";

describe("NextAuth route wrapper", () => {
  it("forwards the dynamic route context after applying rate limiting", async () => {
    const request = new NextRequest(
      "https://gym.dotaly.io/api/auth/callback/credentials",
      { method: "POST" },
    );
    const context = {
      params: Promise.resolve({ nextauth: ["callback", "credentials"] }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "auth-credentials",
        limit: 15,
      }),
    );
    expect(mocks.authHandler).toHaveBeenCalledWith(request, context);
  });
});
