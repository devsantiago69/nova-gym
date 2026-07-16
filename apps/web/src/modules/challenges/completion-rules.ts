import { DomainError } from "@gymchallenge/domain";

export function logicalDateInTimezone(now: Date, timezone: string) {
  const value = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(`${value}T00:00:00.000Z`);
}

export function weekdayInTimezone(now: Date, timezone: string) {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(now);
  return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[short] ?? 1;
}

export function validateCompletionWindow(input: { now: Date; startsAt: Date; endsAt: Date; timezone: string; validWeekdays: number[] }) {
  if (input.now < input.startsAt) throw new DomainError("CHALLENGE_NOT_STARTED", "Este reto todavía no ha comenzado");
  if (input.now > input.endsAt) throw new DomainError("CHALLENGE_ENDED", "Este reto ya finalizó y no acepta nuevos cumplimientos");
  if (!input.validWeekdays.includes(weekdayInTimezone(input.now, input.timezone))) throw new DomainError("INVALID_CHALLENGE_DAY", "Hoy es un día de descanso para este reto");
}

export function requiredEvidenceFields(type: string) {
  if (type === "ONE_PHOTO" || type === "PHOTO_AND_VALUE") return ["photo"] as const;
  if (type === "TWO_PHOTOS") return ["startPhoto", "endPhoto"] as const;
  return [] as const;
}

export function validateNumericEvidence(type:string,raw:string|null,rules:{minimum?:number;maximum?:number;allowDecimals?:boolean}={}){
  if(type!=="NUMERIC_VALUE"&&type!=="PHOTO_AND_VALUE")return null;
  const normalized=(raw??"").trim().replace(",",".");
  if(!/^\d+(?:\.\d{1,3})?$/.test(normalized))throw new DomainError("NUMERIC_VALUE_REQUIRED","Ingresa una cantidad válida con máximo 3 decimales");
  const value=Number(normalized);if(!Number.isFinite(value))throw new DomainError("NUMERIC_VALUE_INVALID","La cantidad no es válida");
  if(!rules.allowDecimals&&!Number.isInteger(value))throw new DomainError("DECIMALS_NOT_ALLOWED","Este reto solo permite números enteros");
  if(rules.minimum!==undefined&&value<rules.minimum)throw new DomainError("NUMERIC_VALUE_TOO_LOW",`La cantidad mínima por registro es ${rules.minimum}`);
  if(rules.maximum!==undefined&&value>rules.maximum)throw new DomainError("NUMERIC_VALUE_TOO_HIGH",`La cantidad máxima por registro es ${rules.maximum}`);
  return value;
}

export function validateTextEvidence(type: string, text: string | null) {
  if (type !== "TEXT") return;
  if (!text || text.trim().length < 3) throw new DomainError("TEXT_REQUIRED", "Escribe al menos 3 caracteres sobre tu cumplimiento");
  if (text.trim().length > 2000) throw new DomainError("TEXT_TOO_LONG", "El texto puede tener máximo 2000 caracteres");
}
