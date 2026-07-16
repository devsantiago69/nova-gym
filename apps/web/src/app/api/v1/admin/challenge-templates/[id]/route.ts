import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { challengeTemplateSchema } from "../schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return fail("FORBIDDEN", "No tienes permisos", 403);
  const parsed = challengeTemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Datos inválidos", 422, parsed.error.issues[0]?.path.join(".") ?? null);
  const { id } = await params; const input = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.challengeTemplate.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
      if (!current) throw new Error("NOT_FOUND");
      const nextVersion = (current.versions[0]?.version ?? 0) + 1;
      const template = await tx.challengeTemplate.update({ where: { id }, data: { categoryId: input.categoryId, name: input.name, slug: input.slug, shortDescription: input.shortDescription, icon: input.icon, tags: input.tags, difficulty: input.difficulty, status: input.status, featured: input.featured, sortOrder: input.sortOrder } });
      await tx.challengeTemplateVersion.create({ data: {
        templateId: id, createdById: session.user.id, version: nextVersion, fullDescription: input.fullDescription,
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
      await tx.auditLog.create({ data: { actorId: session.user.id, action: "CHALLENGE_TEMPLATE_VERSION_CREATED", entityType: "ChallengeTemplate", entityId: id, correlationId: crypto.randomUUID(), newValues: { version: nextVersion, status: input.status } } });
      return { template, version: nextVersion };
    });
    return ok(result, `Versión ${result.version} creada. Los retos anteriores no cambian.`);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return fail("NOT_FOUND", "Plantilla no encontrada", 404);
    return fail("TEMPLATE_EXISTS", "No fue posible publicar la versión; verifica el slug", 409);
  }
}
