import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { challengeTemplateSchema } from "./schema";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = challengeTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);
  const input = parsed.data;
  try {
    const template = await prisma.$transaction(async (tx) => {
      const category = await tx.challengeCategory.findUnique({ where: { id: input.categoryId } });
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
      const row = await tx.challengeTemplate.create({ data: { categoryId: input.categoryId, name: input.name, slug: input.slug, shortDescription: input.shortDescription, icon: input.icon, tags: input.tags, difficulty: input.difficulty, status: input.status, featured: input.featured, sortOrder: input.sortOrder, official: true } });
      const version = await tx.challengeTemplateVersion.create({ data: {
        templateId: row.id, createdById: session.user.id, version: 1, fullDescription: input.fullDescription,
        challengeType: input.challengeType, allowedModalities: input.allowedModalities, defaultDurationDays: input.defaultDurationDays,
        minimumDurationDays: input.minimumDurationDays, maximumDurationDays: input.maximumDurationDays,
        defaultTargetValue: input.defaultTargetValue, targetUnit: input.targetUnit, evidenceType: input.evidenceType,
        requiredPhotoCount: input.requiredPhotoCount, pointsPerCompletion: input.pointsPerCompletion,
        completionBonus: input.completionBonus, winnerBonus: input.winnerBonus, maxDailyCompletions: input.maxDailyCompletions,
        scoringRules: { pointsPerCompletion: input.pointsPerCompletion, completionBonus: input.completionBonus, winnerBonus: input.winnerBonus, checklistItems:input.checklistItems },
        winningRule: { type: input.challengeType, target: input.defaultTargetValue }, tieRule: { allowed: true },
        instructions: input.instructions, recommendations: input.recommendations ?? null, terms: input.terms,
        publishedAt: input.status === "ACTIVE" ? new Date() : null,
        fields: { create: [
          { fieldKey: "durationDays", policy: input.minimumDurationDays === input.maximumDurationDays ? "LOCKED" : "EDITABLE_WITH_LIMITS", minimumValue: input.minimumDurationDays, maximumValue: input.maximumDurationDays },
          { fieldKey: "targetValue", policy: "LOCKED", minimumValue: input.defaultTargetValue, maximumValue: input.defaultTargetValue },
          { fieldKey: "modality", policy: "EDITABLE", allowedValues: input.allowedModalities },
        ] },
      } });
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_TEMPLATE_CREATED", entityType: "ChallengeTemplate", entityId: row.id, correlationId: crypto.randomUUID(), newValues: { templateId: row.id, version: version.version, name: row.name } } });
      return row;
    });
    return ok(template, "Plantilla creada con su versión 1", 201);
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") return fail("CATEGORY_NOT_FOUND", "La categoría no existe", 404);
    return fail("TEMPLATE_EXISTS", "Ya existe una plantilla con ese slug", 409);
  }
}
