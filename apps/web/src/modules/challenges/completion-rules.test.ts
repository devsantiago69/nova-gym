import { describe, expect, it } from "vitest";
import { validateCompletionWindow, validateNumericEvidence, validateTextEvidence } from "./completion-rules";

describe("generic challenge completion rules", () => {
  it("bloquea registros después de terminar el reto", () => expect(() => validateCompletionWindow({ now:new Date("2026-07-15T12:00:00Z"),startsAt:new Date("2026-07-01T00:00:00Z"),endsAt:new Date("2026-07-14T23:59:00Z"),timezone:"America/Bogota",validWeekdays:[1,2,3,4,5,6,7] })).toThrow("finalizó"));
  it("exige texto cuando la plantilla usa confirmación escrita", () => expect(() => validateTextEvidence("TEXT", " ")).toThrow("3 caracteres"));
  it("acepta un cumplimiento dentro del periodo y día permitido", () => expect(() => validateCompletionWindow({ now:new Date("2026-07-15T15:00:00Z"),startsAt:new Date("2026-07-01T00:00:00Z"),endsAt:new Date("2026-08-01T00:00:00Z"),timezone:"America/Bogota",validWeekdays:[3] })).not.toThrow());
  it("normaliza cantidades decimales con coma",()=>expect(validateNumericEvidence("NUMERIC_VALUE","2,5",{minimum:0,maximum:10,allowDecimals:true})).toBe(2.5));
  it("rechaza decimales cuando el reto exige enteros",()=>expect(()=>validateNumericEvidence("NUMERIC_VALUE","2.5",{allowDecimals:false})).toThrow("enteros"));
  it("aplica límites numéricos por registro",()=>expect(()=>validateNumericEvidence("PHOTO_AND_VALUE","101",{minimum:1,maximum:100,allowDecimals:false})).toThrow("máxima"));
});
