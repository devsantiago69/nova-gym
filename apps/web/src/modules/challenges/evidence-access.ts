import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const EVIDENCE_VIEW_SECONDS = 10;

export function createEvidenceViewToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashEvidenceViewToken(token) };
}

export function hashEvidenceViewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function evidenceTokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashEvidenceViewToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
