import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const templates = await prisma.challengeTemplate.findMany({
    where: { status: "ACTIVE", versions: { some: { publishedAt: { not: null } } } },
    include: { category: { select: { name: true, slug: true } }, minimumPlan: { select: { name: true, code: true } }, versions: { where: { publishedAt: { not: null } }, orderBy: { version: "desc" }, take: 1 } },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return ok(templates);
}
