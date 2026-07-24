import { DomainError } from "@gymchallenge/domain";

export type AttendanceCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export function attendanceCoordinates(
  form: FormData,
  enabled: boolean,
): AttendanceCoordinates | null {
  if (!enabled) return null;

  const latitudeValue = form.get("latitude");
  const longitudeValue = form.get("longitude");
  const accuracyValue = form.get("accuracy");
  const latitude =
    typeof latitudeValue === "string" && latitudeValue.trim()
      ? Number(latitudeValue)
      : Number.NaN;
  const longitude =
    typeof longitudeValue === "string" && longitudeValue.trim()
      ? Number(longitudeValue)
      : Number.NaN;
  const accuracy =
    typeof accuracyValue === "string" && accuracyValue.trim()
      ? Number(accuracyValue)
      : Number.NaN;

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw new DomainError(
      "LOCATION_REQUIRED",
      "Activa la ubicación o cambia tu preferencia de privacidad para continuar sin ella",
    );

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
  };
}
