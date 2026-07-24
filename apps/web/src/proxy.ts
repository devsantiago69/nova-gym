import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requestIp, tooManyRequests } from "@/lib/rate-limit";
import { isTrustedMutation } from "@/lib/request-security";

const publicApiRoutes = new Set(["/api/v1/auth/register"]);
const blockedStatuses = new Set(["INACTIVE", "SUSPENDED"]);
const authSecret = process.env.AUTH_SECRET;

function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      errors: [{ code, field: null, message }],
      meta: {},
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (
    isApi &&
    request.headers.get("content-type")?.includes("application/json") &&
    Number.isFinite(contentLength) &&
    contentLength > 1_048_576
  ) {
    return apiError(
      "PAYLOAD_TOO_LARGE",
      "El contenido enviado supera el límite permitido",
      413,
    );
  }

  if (isApi && !isTrustedMutation(request)) {
    return apiError(
      "CROSS_SITE_REQUEST_BLOCKED",
      "La solicitud no proviene de Nova Gym",
      403,
    );
  }

  if (isApi) {
    const limit = await rateLimit({
      scope: path.startsWith("/api/v1/admin/") ? "admin-api" : "user-api",
      identifier: requestIp(request),
      limit: path.startsWith("/api/v1/admin/") ? 180 : 600,
      windowSeconds: 60,
    });
    if (!limit.allowed) return tooManyRequests(limit);
  }

  if (publicApiRoutes.has(path)) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: authSecret ?? "development-only-secret-not-for-production",
    secureCookie: process.env.NODE_ENV === "production",
  });

  const authenticated =
    Boolean(token?.id) && !blockedStatuses.has(String(token?.status));
  if (!authenticated) {
    if (isApi)
      return apiError(
        "UNAUTHORIZED",
        "Tu sesión no está activa. Inicia sesión nuevamente.",
        401,
      );
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (
    (path.startsWith("/admin") || path.startsWith("/api/v1/admin/")) &&
    token?.role !== "ADMIN"
  ) {
    if (isApi)
      return apiError("FORBIDDEN", "No tienes permisos de administrador", 403);
    return NextResponse.redirect(new URL("/inicio", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/inicio/:path*",
    "/actividad/:path*",
    "/asistencia/:path*",
    "/rutinas/:path*",
    "/retos/:path*",
    "/clubes/:path*",
    "/comunidad/:path*",
    "/conectar/:path*",
    "/perfil/:path*",
    "/planes/:path*",
    "/admin/:path*",
    "/api/v1/:path*",
  ],
};
