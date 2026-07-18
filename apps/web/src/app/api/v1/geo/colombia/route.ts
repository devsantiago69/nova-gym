import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

const COLOMBIA_API = "https://api-colombia.com/api/v1";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");
  try {
    if (resource === "departments") {
      const response = await fetch(`${COLOMBIA_API}/Department`, { next: { revalidate: 86_400 } });
      if (!response.ok) throw new Error("Departments unavailable");
      const rows = (await response.json()) as Array<{ id: number; name: string }>;
      return ok(rows.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "es")));
    }
    if (resource === "cities") {
      const departmentId = Number(url.searchParams.get("departmentId"));
      if (!Number.isInteger(departmentId) || departmentId <= 0) return fail("DEPARTMENT_REQUIRED", "Selecciona un departamento", 422);
      const response = await fetch(`${COLOMBIA_API}/Department/${departmentId}/cities`, { next: { revalidate: 86_400 } });
      if (!response.ok) throw new Error("Cities unavailable");
      const rows = (await response.json()) as Array<{ id: number; name: string }>;
      return ok(rows.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "es")));
    }
    if (resource === "reverse") {
      const latitude = Number(url.searchParams.get("latitude"));
      const longitude = Number(url.searchParams.get("longitude"));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return fail("COORDINATES_REQUIRED", "Coordenadas no válidas", 422);
      const endpoint = new URL("https://nominatim.openstreetmap.org/reverse");
      endpoint.searchParams.set("format", "jsonv2");
      endpoint.searchParams.set("lat", String(latitude));
      endpoint.searchParams.set("lon", String(longitude));
      endpoint.searchParams.set("addressdetails", "1");
      endpoint.searchParams.set("accept-language", "es");
      const response = await fetch(endpoint, { headers: { "user-agent": "NovaGym/1.0 (https://gym.dotaly.io)" }, cache: "no-store" });
      if (!response.ok) throw new Error("Reverse geocoder unavailable");
      const row = (await response.json()) as { display_name?: string; address?: Record<string, string> };
      const address = row.address ?? {};
      if (address.country_code && address.country_code.toLowerCase() !== "co") return fail("OUTSIDE_COLOMBIA", "Por ahora los clubes con ubicación automática están disponibles en Colombia", 422);
      return ok({
        country: address.country ?? "Colombia",
        department: address.state ?? address.region ?? "",
        city: address.city ?? address.town ?? address.municipality ?? address.village ?? address.county ?? "",
        address: row.display_name ?? "",
        latitude,
        longitude,
      });
    }
    if (resource === "search") {
      const city = url.searchParams.get("city")?.trim();
      const department = url.searchParams.get("department")?.trim();
      if (!city || !department)
        return fail(
          "LOCATION_REQUIRED",
          "Selecciona departamento y ciudad",
          422,
        );
      const endpoint = new URL("https://nominatim.openstreetmap.org/search");
      endpoint.searchParams.set("format", "jsonv2");
      endpoint.searchParams.set("city", city);
      endpoint.searchParams.set("state", department);
      endpoint.searchParams.set("country", "Colombia");
      endpoint.searchParams.set("countrycodes", "co");
      endpoint.searchParams.set("limit", "1");
      endpoint.searchParams.set("accept-language", "es");
      const response = await fetch(endpoint, {
        headers: {
          "user-agent": "NovaGym/1.0 (https://gym.dotaly.io)",
        },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Forward geocoder unavailable");
      const rows = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name?: string;
      }>;
      if (!rows[0])
        return fail(
          "LOCATION_NOT_FOUND",
          "No pudimos ubicar esa ciudad en el mapa",
          404,
        );
      return ok({
        city,
        department,
        latitude: Number(rows[0].lat),
        longitude: Number(rows[0].lon),
        address: rows[0].display_name ?? `${city}, ${department}, Colombia`,
      });
    }
    return fail("INVALID_RESOURCE", "Consulta geográfica no válida", 422);
  } catch (error) {
    console.error("geo.colombia.failed", { resource, error });
    return fail("GEO_UNAVAILABLE", "No pudimos consultar ubicaciones en este momento", 503);
  }
}
