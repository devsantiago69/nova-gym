import { getServerSession } from "next-auth";
import { Prisma, prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { challengeCategorySchema } from "../schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = challengeCategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);
  const { id } = await context.params;
  const previous = await prisma.challengeCategory.findUnique({ where: { id } });
  if (!previous) return fail("CATEGORY_NOT_FOUND", "El reto no existe", 404);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentTemplate = await tx.challengeTemplate.findFirst({
        where: { categoryId: id },
        include: { versions: { orderBy: { version: "desc" }, take: 1, include: { fields: true } } },
      });
      const category = await tx.challengeCategory.update({ where: { id }, data: parsed.data });
      let publishedVersion: number | null = null;
      const currentVersion = currentTemplate?.versions[0];
      if (currentTemplate && currentVersion) {
        const next = await tx.challengeTemplateVersion.create({
          data: {
            templateId: currentTemplate.id,
            createdById: session.user.id,
            version: currentVersion.version + 1,
            fullDescription: parsed.data.description,
            challengeType: parsed.data.type,
            allowedModalities: currentVersion.allowedModalities,
            defaultDurationDays: parsed.data.durationDays,
            minimumDurationDays: parsed.data.durationDays,
            maximumDurationDays: parsed.data.durationDays,
            validWeekdays: currentVersion.validWeekdays,
            defaultTargetValue: parsed.data.targetAttendances,
            targetUnit: currentVersion.targetUnit,
            evidenceType: currentVersion.evidenceType,
            requiredPhotoCount: currentVersion.requiredPhotoCount,
            pointsPerCompletion: parsed.data.pointsPerAttendance,
            completionBonus: parsed.data.completionBonus,
            winnerBonus: parsed.data.winnerBonus,
            maxDailyCompletions: currentVersion.maxDailyCompletions,
            scoringRules: { pointsPerCompletion: parsed.data.pointsPerAttendance, completionBonus: parsed.data.completionBonus, winnerBonus: parsed.data.winnerBonus },
            winningRule: { type: parsed.data.type, target: parsed.data.targetAttendances },
            tieRule: currentVersion.tieRule as Prisma.InputJsonValue,
            instructions: currentVersion.instructions,
            recommendations: currentVersion.recommendations,
            terms: currentVersion.terms,
            publishedAt: parsed.data.status === "ACTIVE" ? new Date() : null,
            fields: {
              create: currentVersion.fields.map((field) => ({
                fieldKey: field.fieldKey,
                policy: field.policy,
                minimumValue: field.fieldKey === "durationDays" ? parsed.data.durationDays : field.fieldKey === "targetValue" ? parsed.data.targetAttendances : field.minimumValue,
                maximumValue: field.fieldKey === "durationDays" ? parsed.data.durationDays : field.fieldKey === "targetValue" ? parsed.data.targetAttendances : field.maximumValue,
                allowedValues: field.allowedValues === null ? Prisma.JsonNull : field.allowedValues as Prisma.InputJsonValue,
              })),
            },
          },
        });
        publishedVersion = next.version;
        await tx.challengeTemplate.update({
          where: { id: currentTemplate.id },
          data: {
            name: parsed.data.name,
            slug: parsed.data.slug,
            shortDescription: parsed.data.description,
            status: parsed.data.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
          },
        });
      }
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_TEMPLATE_VERSION_CREATED", entityType: "ChallengeCategory", entityId: id, correlationId: crypto.randomUUID(), previousValues: { name: previous.name, slug: previous.slug, status: previous.status }, newValues: { ...parsed.data, publishedVersion } } });
      return { category, publishedVersion };
    });
    return ok(result, result.publishedVersion ? `Reto actualizado como versión ${result.publishedVersion}. Los retos iniciados conservan sus reglas.` : "Reto actualizado");
  } catch { return fail("CATEGORY_EXISTS", "Ya existe otra categoría con ese slug", 409); }
}
