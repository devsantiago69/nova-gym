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
    content?: string;
  } | null;
  const content = body?.content?.trim();
  if (!content || content.length > 500)
    return fail(
      "VALIDATION_ERROR",
      "Escribe un comentario de máximo 500 caracteres",
      422,
    );
  const post = await canViewSocialPost(session.user.id, postId);
  if (!post)
    return fail("FORBIDDEN", "No puedes comentar esta publicación", 403);
  const comment = await prisma.socialComment.create({
    data: { postId, userId: session.user.id, content },
    include: {
      user: {
        select: {
          username: true,
          profile: {
            select: { firstName: true, lastName: true, avatarKey: true },
          },
        },
      },
    },
  });
  if (post.userId !== session.user.id)
    await prisma.notification.create({
      data: {
        userId: post.userId,
        actorId: session.user.id,
        type: "SYSTEM",
        title: "Nuevo comentario",
        body: content.slice(0, 120),
        href: "/actividad",
      },
    });
  const name =
    `${comment.user.profile?.firstName ?? ""} ${comment.user.profile?.lastName ?? ""}`.trim() ||
    comment.user.username;
  return ok(
    {
      id: comment.id,
      content,
      createdAt: comment.createdAt.toISOString(),
      isOwn: true,
      author: {
        id: session.user.id,
        username: comment.user.username,
        name,
        avatarUrl: comment.user.profile?.avatarKey
          ? `/api/v1/profile/avatar/${session.user.id}`
          : null,
      },
    },
    "Comentario publicado",
    201,
  );
}
