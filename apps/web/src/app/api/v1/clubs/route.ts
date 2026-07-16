import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { clubCreateSchema, clubSlug } from "@/modules/clubs/schema";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const parsed = clubCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Revisa los datos",
      422,
    );
  const base = clubSlug(parsed.data.name);
  let slug = base;
  let suffix = 1;
  while (
    await prisma.club.findUnique({ where: { slug }, select: { id: true } })
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  const club = await prisma.$transaction(async (tx) => {
    const created = await tx.club.create({
      data: { ownerId: session.user.id, slug, ...parsed.data },
    });
    await tx.clubMembership.create({
      data: {
        clubId: created.id,
        userId: session.user.id,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "CLUB_CREATED",
        entityType: "Club",
        entityId: created.id,
        correlationId: crypto.randomUUID(),
        newValues: {
          name: created.name,
          type: created.type,
          visibility: created.visibility,
        },
      },
    });
    return created;
  });
  return ok({ id: club.id, slug: club.slug }, "Tu club ya está listo", 201);
}
