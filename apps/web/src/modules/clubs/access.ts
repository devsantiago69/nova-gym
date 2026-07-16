import { prisma } from "@gymchallenge/database";

export async function activeClubMembership(clubId: string, userId: string) {
  return prisma.clubMembership.findFirst({
    where: { clubId, userId, status: "ACTIVE" },
    include: { club: true },
  });
}
