import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { activeClubMembership } from "@/modules/clubs/access";
import { clubPostSchema } from "@/modules/clubs/session-schema";
import { createNotifications, userDisplayName } from "@/modules/notifications/service";

export async function POST(request: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const auth = await getServerSession(authOptions);
  if (!auth) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { clubId } = await params;
  const membership = await activeClubMembership(clubId, auth.user.id);
  if (!membership) return fail("FORBIDDEN", "Solo los integrantes pueden publicar", 403);
  const parsed = clubPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Publicación no válida", 422);
  const post = await prisma.socialPost.create({
    data: { userId: auth.user.id, clubId, audience: "CLUB", type: "STATUS", content: parsed.data.content },
  });
  const [members, actorName] = await Promise.all([
    prisma.clubMembership.findMany({ where: { clubId, status: "ACTIVE", userId: { not: auth.user.id } }, select: { userId: true } }),
    userDisplayName(auth.user.id),
  ]);
  await createNotifications(members.map(({ userId }) => ({
    userId,
    actorId: auth.user.id,
    type: "CLUB_SESSION" as const,
    title: `Nueva actividad en ${membership.club.name}`,
    body: `${actorName}: ${parsed.data.content.slice(0, 100)}`,
    href: `/clubes/${membership.club.slug}`,
    data: { clubId, postId: post.id },
  })));
  return ok({ id: post.id }, "Publicado en el club", 201);
}
