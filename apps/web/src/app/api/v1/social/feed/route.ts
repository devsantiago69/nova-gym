import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { socialFeed } from "@/modules/social/feed";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  return ok(await socialFeed(session.user.id, 30));
}
