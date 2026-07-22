export type AttendancePhotoSource = "camera" | "gallery";

export function isAttendancePhotoSource(
  value: unknown,
): value is AttendancePhotoSource {
  return value === "camera" || value === "gallery";
}

export function canChooseAttendancePhotoFromDevice(
  planCode: string | null | undefined,
) {
  return Boolean(planCode && planCode.trim().toUpperCase() !== "FREE");
}

export function canUseAttendancePhotoSource(
  planCode: string | null | undefined,
  source: AttendancePhotoSource,
) {
  return source === "camera" || canChooseAttendancePhotoFromDevice(planCode);
}
