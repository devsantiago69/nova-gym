import {z} from "zod";

export const challengeDraftDataSchema=z.object({
  mode:z.enum(["SOLO","SOCIAL"]).default("SOLO"),
  targetIds:z.array(z.string().uuid()).max(3).default([]),
  categoryId:z.union([z.string().uuid(),z.literal("")]).default(""),
  name:z.string().trim().max(160).default(""),
  description:z.string().trim().max(1000).default(""),
  challengeType:z.enum(["MOST_ATTENDANCES","FIRST_TO_TARGET","REACH_TARGET","STREAK","ACCUMULATED_AMOUNT"]).default("REACH_TARGET"),
  durationDays:z.coerce.number().int().min(1).max(365).default(30),
  restDaysAllowed:z.coerce.number().int().min(0).max(14).default(2),
  targetValue:z.coerce.number().int().min(1).max(10000).default(20),
  targetUnit:z.string().trim().max(50).default("sesiones"),
  evidenceType:z.enum(["NONE","CHECK_IN","ONE_PHOTO","TWO_PHOTOS","TEXT","CHECKLIST","NUMERIC_VALUE","PHOTO_AND_VALUE"]).default("TEXT"),
  numericMinimum:z.coerce.number().min(0).max(1_000_000_000_000).default(0),
  numericMaximum:z.coerce.number().positive().max(1_000_000_000_000).default(10000),
  allowDecimals:z.boolean().default(false),
  pointsPerCompletion:z.coerce.number().int().min(0).max(1000).default(2),
  completionBonus:z.coerce.number().int().min(0).max(100000).default(10),
  winnerBonus:z.coerce.number().int().min(0).max(100000).default(0),
  maxDailyCompletions:z.coerce.number().int().min(1).max(20).default(1),
  validWeekdays:z.array(z.coerce.number().int().min(1).max(7)).min(1).max(7).default([1,2,3,4,5,6,7]),
  checklistItems:z.array(z.object({label:z.string().trim().min(1).max(200),required:z.boolean().default(true),points:z.coerce.number().int().min(0).max(1000).default(0)})).max(30).default([]),
  saveAsPersonalTemplate:z.boolean().default(false),
}).strict().superRefine((value,context)=>{if(value.numericMaximum<value.numericMinimum)context.addIssue({code:"custom",path:["numericMaximum"],message:"El máximo debe ser mayor o igual al mínimo"});if(value.restDaysAllowed>=value.durationDays)context.addIssue({code:"custom",path:["restDaysAllowed"],message:"Los descansos deben ser menores que la duración del reto"});});

export const challengeDraftRequestSchema=z.object({
  currentStep:z.coerce.number().int().min(1).max(5),
  data:challengeDraftDataSchema,
});

export type ChallengeDraftData=z.infer<typeof challengeDraftDataSchema>;
