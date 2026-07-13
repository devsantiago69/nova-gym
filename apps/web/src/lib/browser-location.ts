export type BrowserLocation = { latitude: number; longitude: number; accuracy: number; capturedAt: number };

const storageKey = "nova-gym:last-location";

export function saveBrowserLocation(position: GeolocationPosition): BrowserLocation {
  const value = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: Date.now() };
  try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Coordinates remain usable even when storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent("nova-gym:location", { detail: value }));
  return value;
}

export function recentBrowserLocation(maxAgeMs = 120_000): BrowserLocation | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as BrowserLocation | null;
    if (value && Date.now() - value.capturedAt <= maxAgeMs && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) return value;
  } catch { return undefined; }
  return undefined;
}

export async function requestBrowserLocation(force = false): Promise<BrowserLocation> {
  const recent = force ? undefined : recentBrowserLocation();
  if (recent) return recent;
  if (!("geolocation" in navigator)) throw new Error("GEOLOCATION_UNSUPPORTED");
  const locate = (options: PositionOptions) => new Promise<GeolocationPosition>((resolve, reject) => {
    const hardTimeout = window.setTimeout(() => {
      const error = new Error("GEOLOCATION_TIMEOUT") as Error & { code: number };
      error.name = "TimeoutError";
      error.code = 3;
      reject(error);
    }, (options.timeout ?? 20_000) + 2_000);
    navigator.geolocation.getCurrentPosition(
      (position) => { window.clearTimeout(hardTimeout); resolve(position); },
      (error) => { window.clearTimeout(hardTimeout); reject(error); },
      options,
    );
  });
  try { return saveBrowserLocation(await locate({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 })); }
  catch (firstError) {
    const code = Number((firstError as { code?: unknown })?.code);
    if (code === 1) throw firstError;
    try { return saveBrowserLocation(await locate({ enableHighAccuracy: false, timeout: 20_000, maximumAge: 300_000 })); }
    catch (secondError) { throw secondError; }
  }
}

export function locationErrorMessage(error: unknown) {
  if (location.protocol !== "https:") return "La ubicación requiere HTTPS.";
  if (typeof error === "object" && error) {
    const code = Number((error as { code?: unknown }).code);
    if (code === 1) return "Permiso bloqueado. Abre los permisos del sitio y selecciona Permitir ubicación.";
    if (code === 2) return "El dispositivo no pudo calcular la ubicación. Activa la ubicación de Windows/Android/iOS y desactiva temporalmente la VPN.";
    if (code === 3) return "El GPS tardó demasiado. Acércate a una ventana o prueba desde el teléfono y vuelve a intentarlo.";
    const name = String((error as { name?: unknown }).name ?? "");
    if (name === "NotAllowedError") return "El navegador bloqueó el permiso de ubicación.";
    if (name === "PositionUnavailableError") return "El dispositivo permitió el acceso, pero no entregó coordenadas.";
    if (name === "TimeoutError") return "El dispositivo no respondió a tiempo al solicitar la ubicación.";
  }
  if (error instanceof Error && error.message === "GEOLOCATION_UNSUPPORTED") return "Este navegador o dispositivo no ofrece servicio de ubicación.";
  return "No fue posible obtener coordenadas. Verifica el GPS del dispositivo e intenta nuevamente.";
}
