import { prisma } from "@gymchallenge/database";

export async function socialAccessContext(userId: string) {
  const [friendships, memberships, clubMemberships] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    }),
    prisma.challengeParticipant.findMany({
      where: { userId, acceptedAt: { not: null } },
      select: { challengeId: true },
    }),
    prisma.clubMembership.findMany({
      where: { userId, status: "ACTIVE" },
      select: { clubId: true },
    }),
  ]);
  return {
    friendIds: friendships.map((row) =>
      row.requesterId === userId ? row.addresseeId : row.requesterId,
    ),
    challengeIds: memberships.map((row) => row.challengeId),
    clubIds: clubMemberships.map((row) => row.clubId),
  };
}

export async function canViewSocialPost(userId: string, postId: string) {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      audience: true,
      challengeId: true,
      clubId: true,
    },
  });
  if (!post) return null;
  if (post.userId === userId) return post;
  const access = await socialAccessContext(userId);
  if (post.audience === "FRIENDS" && access.friendIds.includes(post.userId))
    return post;
  if (
    post.audience === "CHALLENGE_TEAM" &&
    post.challengeId &&
    access.challengeIds.includes(post.challengeId)
  )
    return post;
  if (
    post.audience === "CLUB" &&
    post.clubId &&
    access.clubIds.includes(post.clubId)
  )
    return post;
  return null;
}

export async function socialFeed(userId: string, take = 20, onlyClubId?: string) {
  const access = await socialAccessContext(userId);
  if (onlyClubId && !access.clubIds.includes(onlyClubId)) return [];
  const posts = await prisma.socialPost.findMany({
    where: onlyClubId
      ? { clubId: onlyClubId, audience: "CLUB" }
      : {
          OR: [
        { userId },
        ...(access.friendIds.length
          ? [{ audience: "FRIENDS" as const, userId: { in: access.friendIds } }]
          : []),
        ...(access.challengeIds.length
          ? [
              {
                audience: "CHALLENGE_TEAM" as const,
                challengeId: { in: access.challengeIds },
              },
            ]
          : []),
        ...(access.clubIds.length
          ? [{ audience: "CLUB" as const, clubId: { in: access.clubIds } }]
          : []),
          ],
        },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          profile: {
            select: { firstName: true, lastName: true, avatarKey: true },
          },
        },
      },
      attendance: {
        select: {
          id: true,
          localDate: true,
          durationMinutes: true,
          photos: {
            select: { id: true, type: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      challenge: { select: { id: true, name: true } },
      club: { select: { id: true, name: true, slug: true } },
      reactions: { select: { userId: true, type: true } },
      comments: {
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: { firstName: true, lastName: true, avatarKey: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  return posts.map((post) => ({
    id: post.id,
    type: post.type,
    audience: post.audience,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    isOwn: post.userId === userId,
    author: {
      id: post.user.id,
      username: post.user.username,
      name:
        `${post.user.profile?.firstName ?? ""} ${post.user.profile?.lastName ?? ""}`.trim() ||
        post.user.username,
      avatarUrl: post.user.profile?.avatarKey
        ? `/api/v1/profile/avatar/${post.user.id}`
        : null,
    },
    attendance: post.attendance
      ? {
          id: post.attendance.id,
          localDate: post.attendance.localDate.toISOString(),
          durationMinutes: post.attendance.durationMinutes,
          photos: post.attendance.photos.map((photo) => ({
            ...photo,
            url: `/api/v1/social/posts/${post.id}/photos/${photo.id}`,
          })),
        }
      : null,
    challenge: post.challenge,
    club: post.club,
    reactions: post.reactions.reduce<Record<string, number>>(
      (counts, reaction) => {
        counts[reaction.type] = (counts[reaction.type] ?? 0) + 1;
        return counts;
      },
      {},
    ),
    myReaction:
      post.reactions.find((reaction) => reaction.userId === userId)?.type ??
      null,
    comments: post.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      isOwn: comment.userId === userId,
      author: {
        id: comment.user.id,
        username: comment.user.username,
        name:
          `${comment.user.profile?.firstName ?? ""} ${comment.user.profile?.lastName ?? ""}`.trim() ||
          comment.user.username,
        avatarUrl: comment.user.profile?.avatarKey
          ? `/api/v1/profile/avatar/${comment.user.id}`
          : null,
      },
    })),
  }));
}

export type SocialFeedItem = Awaited<ReturnType<typeof socialFeed>>[number];
