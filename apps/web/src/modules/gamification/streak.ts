import { prisma } from "@gymchallenge/database";

export function computeStreak(dates: Date[]): { length: number; start: Date | null } {
  const days = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let length = 0;
  let start: Date | null = null;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    length += 1;
    start = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { length, start };
}

export async function attendanceStreak(userId: string) {
  const attendances = await prisma.attendance.findMany({
    where: { userId, status: "COMPLETED" },
    select: { localDate: true },
  });
  return computeStreak(attendances.map((row) => row.localDate));
}
