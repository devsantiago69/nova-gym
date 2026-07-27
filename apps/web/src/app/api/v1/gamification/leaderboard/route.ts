import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { topLeaderboard, rankOf } from "@/modules/gamification/leaderboard";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  const [rows, me] = await Promise.all([
    topLeaderboard(limit, 0),
    rankOf(session.user.id),
  ]);

  return ok({ rows, me });
}
