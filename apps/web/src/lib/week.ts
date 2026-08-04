export function localDateInTimezone(timezone: string, reference: Date = new Date()): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function mondayStart(date: Date): Date {
  const day = date.getUTCDay() || 7;
  return addDays(date, -(day - 1));
}

export function weekRange(timezone: string, reference: Date = new Date()): { start: Date; end: Date } {
  const start = mondayStart(localDateInTimezone(timezone, reference));
  return { start, end: addDays(start, 7) };
}
