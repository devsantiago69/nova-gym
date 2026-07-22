import { createHash } from "node:crypto";
import { ChallengeEvidenceType, ChallengeModality, Prisma } from "@gymchallenge/database";

type Transaction = Prisma.TransactionClient;

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function challengeRulesChecksum(rules: Prisma.InputJsonValue) {
  return createHash("sha256").update(canonicalize(rules)).digest("hex");
}

export async function resolveChallengeRules(
  tx: Transaction,
  input: { categoryId?: string; templateId?: string; creatorId: string; participantCount: number },
) {
  const requestedTemplate = input.templateId ? await tx.challengeTemplate.findFirst({ where: { id: input.templateId, status: "ACTIVE" }, select: { categoryId: true } }) : null;
  const categoryId = requestedTemplate?.categoryId ?? input.categoryId;
  if (!categoryId) return null;
  const category = await tx.challengeCategory.findFirst({
    where: { id: categoryId, status: "ACTIVE" },
    include: {
      templates: {
        where: { status: "ACTIVE", ...(input.templateId ? { id: input.templateId } : {}) },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
        take: 1,
        include: {
          versions: {
            where: { publishedAt: { not: null } },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!category) return null;

  const template = category.templates[0] ?? null;
  const version = template?.versions[0] ?? null;
  const modality: ChallengeModality = input.participantCount === 1 ? "SOLO" : input.participantCount === 2 ? "HEAD_TO_HEAD" : "GROUP";
  if (version && !version.allowedModalities.includes(modality)) throw new Error("MODALITY_NOT_ALLOWED");

  const profile = await tx.userProfile.findUnique({ where: { userId: input.creatorId }, select: { timezone: true } });
  const durationDays = version?.defaultDurationDays ?? category.durationDays;
  const targetValue = version?.defaultTargetValue ?? category.targetAttendances;
  const evidenceType: ChallengeEvidenceType = version?.evidenceType ?? "TWO_PHOTOS";
  const pointsPerCompletion = version?.pointsPerCompletion ?? category.pointsPerAttendance;
  const maxDailyCompletions = version?.maxDailyCompletions ?? 1;
  const scoringRules = (version?.scoringRules ?? {}) as { checklistItems?: Array<{label:string;required?:boolean;points?:number}> };
  const checklistItems = Array.isArray(scoringRules.checklistItems) ? scoringRules.checklistItems.filter(item=>item&&typeof item.label==="string").slice(0,30).map((item,index)=>({label:item.label.slice(0,200),required:item.required!==false,points:Number.isInteger(item.points)&&item.points!>=0?item.points!:0,sortOrder:index})) : [];
  const name = template?.name ?? category.name;
  const description = (version?.fullDescription ?? category.description).slice(0, 1000);

  const rules = {
    schemaVersion: 1,
    templateId: template?.id ?? null,
    templateVersionId: version?.id ?? null,
    templateVersion: version?.version ?? null,
    name,
    description,
    challengeType: version?.challengeType ?? category.type,
    modality,
    durationDays,
    restDaysAllowed: 2,
    timezone: profile?.timezone ?? "America/Bogota",
    targetValue,
    targetUnit: version?.targetUnit ?? "attendances",
    evidenceType,
    requiredPhotoCount: version?.requiredPhotoCount ?? 2,
    pointsPerCompletion,
    completionBonus: version?.completionBonus ?? category.completionBonus,
    winnerBonus: version?.winnerBonus ?? category.winnerBonus,
    maxDailyCompletions,
    validWeekdays: version?.validWeekdays ?? [1, 2, 3, 4, 5, 6, 7],
    scoringRules: version?.scoringRules ?? { pointsPerCompletion },
    winningRule: version?.winningRule ?? { type: category.type, target: targetValue },
    tieRule: version?.tieRule ?? { allowed: true },
    instructions: version?.instructions ?? "Registra una foto al iniciar y otra al finalizar.",
    recommendations: version?.recommendations ?? null,
    terms: version?.terms ?? "Solo cuentan asistencias válidas, únicas y verificables.",
  } satisfies Prisma.InputJsonObject;

  return {
    category,
    template,
    version,
    rules,
    checksum: challengeRulesChecksum(rules),
    challengeData: {
      categoryId: category.id,
      templateId: template?.id ?? null,
      templateVersionId: version?.id ?? null,
      name,
      description,
      modality,
      durationDays,
      restDaysAllowed: 2,
      timezone: rules.timezone,
      targetValue,
      targetUnit: rules.targetUnit,
      evidenceType,
      pointsPerCompletion,
      maxDailyCompletions,
    },
    checklistItems,
  };
}
