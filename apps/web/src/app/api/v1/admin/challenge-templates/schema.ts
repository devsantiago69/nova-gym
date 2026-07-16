import { z } from "zod";

export const challengeTemplateSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(3).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,160}$/),
  shortDescription: z.string().trim().min(10).max(500),
  fullDescription: z.string().trim().min(20).max(5000),
  icon: z.string().trim().min(2).max(50).default("flame"),
  tags: z.array(z.string().trim().min(2).max(30)).max(10).default([]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  challengeType: z.enum(["MOST_ATTENDANCES", "FIRST_TO_TARGET", "REACH_TARGET", "STREAK"]),
  allowedModalities: z.array(z.enum(["SOLO", "HEAD_TO_HEAD", "GROUP"])).min(1),
  defaultDurationDays: z.coerce.number().int().min(1).max(365),
  minimumDurationDays: z.coerce.number().int().min(1).max(365),
  maximumDurationDays: z.coerce.number().int().min(1).max(365),
  defaultTargetValue: z.coerce.number().int().min(1).max(10000),
  targetUnit: z.string().trim().min(2).max(50).default("attendances"),
  evidenceType: z.enum(["NONE", "CHECK_IN", "ONE_PHOTO", "TWO_PHOTOS", "TEXT", "CHECKLIST"]),
  requiredPhotoCount: z.coerce.number().int().min(0).max(10),
  pointsPerCompletion: z.coerce.number().int().min(0).max(1000),
  completionBonus: z.coerce.number().int().min(0).max(100000),
  winnerBonus: z.coerce.number().int().min(0).max(100000),
  maxDailyCompletions: z.coerce.number().int().min(1).max(100),
  checklistItems: z.array(z.object({ label:z.string().trim().min(2).max(200), required:z.boolean().default(true), points:z.coerce.number().int().min(0).max(1000).default(0) })).max(30).default([]),
  instructions: z.string().trim().min(10).max(5000),
  recommendations: z.string().trim().max(5000).nullable().optional(),
  terms: z.string().trim().min(10).max(5000),
}).superRefine((value, context) => {
  if (value.minimumDurationDays > value.defaultDurationDays || value.defaultDurationDays > value.maximumDurationDays) {
    context.addIssue({ code: "custom", path: ["defaultDurationDays"], message: "La duración debe estar entre el mínimo y el máximo" });
  }
  if (value.evidenceType === "CHECKLIST" && value.checklistItems.length === 0) context.addIssue({ code:"custom",path:["checklistItems"],message:"Agrega al menos una actividad para la lista" });
});

export type ChallengeTemplateInput = z.infer<typeof challengeTemplateSchema>;
