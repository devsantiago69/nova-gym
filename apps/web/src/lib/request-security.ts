const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredOrigins() {
  return [
    process.env.APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.CORS_ORIGIN,
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function isTrustedMutation(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false;

  const allowed = new Set(configuredOrigins());
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return allowed.has(new URL(origin).origin);
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Non-browser clients do not necessarily send browser origin metadata.
  return fetchSite === undefined || fetchSite === "none";
}
