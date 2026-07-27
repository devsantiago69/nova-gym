import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { gamificationSummary } from "@/modules/gamification/summary";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  return ok(await gamificationSummary(session.user.id));
}
