import { describe, expect, it } from "vitest";
import { createEvidenceViewToken, evidenceTokenMatches, EVIDENCE_VIEW_SECONDS } from "./evidence-access";

describe("private challenge evidence access", () => {
  it("genera tokens aleatorios y valida únicamente el token original", () => {
    const first = createEvidenceViewToken();
    const second = createEvidenceViewToken();
    expect(first.token).not.toBe(second.token);
    expect(evidenceTokenMatches(first.token, first.tokenHash)).toBe(true);
    expect(evidenceTokenMatches(second.token, first.tokenHash)).toBe(false);
  });

  it("mantiene la ventana privada en diez segundos", () => {
    expect(EVIDENCE_VIEW_SECONDS).toBe(10);
  });
});
