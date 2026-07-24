import { describe, expect, it } from "vitest";
import { isTrustedMutation } from "./request-security";

function request(method: string, headers: Record<string, string> = {}) {
  return new Request("https://gym.dotaly.io/api/v1/profile", {
    method,
    headers,
  });
}

describe("isTrustedMutation", () => {
  it("allows safe methods", () => {
    expect(
      isTrustedMutation(
        request("GET", { origin: "https://attacker.example" }),
      ),
    ).toBe(true);
  });

  it("allows same-origin mutations", () => {
    expect(
      isTrustedMutation(
        request("POST", {
          origin: "https://gym.dotaly.io",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
  });

  it("rejects cross-site and sibling-subdomain mutations", () => {
    expect(
      isTrustedMutation(
        request("POST", {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
    expect(
      isTrustedMutation(
        request("DELETE", {
          origin: "https://shop.dotaly.io",
          "sec-fetch-site": "same-site",
        }),
      ),
    ).toBe(false);
  });

  it("accepts authenticated non-browser clients without browser metadata", () => {
    expect(isTrustedMutation(request("PATCH"))).toBe(true);
  });
});
