import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { postId } = await params;
  const body = (await request.json().catch(() => null)) as {
    audience?: string;
    content?: string | null;
  } | null;
  if (
    !body ||
    !["PRIVATE", "FRIENDS", "CHALLENGE_TEAM", "CLUB"].includes(body.audience ?? "")
  )
    return fail("VALIDATION_ERROR", "Selecciona una privacidad válida", 422);
  const post = await prisma.socialPost.findFirst({
    where: { id: postId, userId: session.user.id },
    select: { id: true, challengeId: true, clubId: true },
  });
  if (!post) return fail("NOT_FOUND", "Publicación no encontrada", 404);
  if (body.audience === "CHALLENGE_TEAM" && !post.challengeId)
    return fail(
      "CHALLENGE_REQUIRED",
      "Esta publicación no pertenece a un reto",
      422,
    );
  if (body.audience === "CLUB" && !post.clubId)
    return fail("CLUB_REQUIRED", "Esta publicación no pertenece a un club", 422);
  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      audience: body.audience as "PRIVATE" | "FRIENDS" | "CHALLENGE_TEAM" | "CLUB",
      content: body.content?.trim().slice(0, 800) || null,
    },
  });
  return ok(null, "Privacidad actualizada");
}
