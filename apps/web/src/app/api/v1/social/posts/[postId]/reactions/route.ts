import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { canViewSocialPost } from "@/modules/social/feed";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { postId } = await params;
  const body = (await request.json().catch(() => null)) as {
    type?: string;
  } | null;
  if (
    !body?.type ||
    !["FIRE", "STRONG", "APPLAUSE", "INSPIRE"].includes(body.type)
  )
    return fail("VALIDATION_ERROR", "Reacción no válida", 422);
  const post = await canViewSocialPost(session.user.id, postId);
  if (!post)
    return fail("FORBIDDEN", "No puedes reaccionar a esta publicación", 403);
  const existing = await prisma.socialReaction.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  });
  if (existing?.type === body.type)
    await prisma.socialReaction.delete({ where: { id: existing.id } });
  else
    await prisma.socialReaction.upsert({
      where: { postId_userId: { postId, userId: session.user.id } },
      update: { type: body.type as "FIRE" | "STRONG" | "APPLAUSE" | "INSPIRE" },
      create: {
        postId,
        userId: session.user.id,
        type: body.type as "FIRE" | "STRONG" | "APPLAUSE" | "INSPIRE",
      },
    });
  if (post.userId !== session.user.id && existing?.type !== body.type)
    await prisma.notification
      .create({
        data: {
          userId: post.userId,
          actorId: session.user.id,
          type: "SYSTEM",
          title: "Reaccionaron a tu progreso",
          body: "Un amigo celebró tu entrenamiento.",
          href: "/actividad",
          dedupeKey: `social-reaction:${postId}:${session.user.id}`,
        },
      })
      .catch(() => undefined);
  return ok({ active: existing?.type !== body.type, type: body.type });
}
