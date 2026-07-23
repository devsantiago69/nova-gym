import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { rateLimit, requestIp, tooManyRequests } from "@/lib/rate-limit";

const handler = NextAuth(authOptions);

type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

export const GET = handler;

export async function POST(request: NextRequest, context: AuthRouteContext) {
  const credentials = request.nextUrl.pathname.endsWith("/callback/credentials");
  const result = await rateLimit({
    scope: credentials ? "auth-credentials" : "auth-actions",
    identifier: requestIp(request),
    limit: credentials ? 15 : 40,
    windowSeconds: 15 * 60,
  });
  if (!result.allowed) return tooManyRequests(result);
  return handler(request, context);
}
