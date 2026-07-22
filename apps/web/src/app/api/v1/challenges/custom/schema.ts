import { z } from "zod";

export const customChallengeSchema=z.object({
  draftId:z.string().uuid().optional(),
  categoryId:z.string().uuid(),
  name:z.string().trim().min(3).max(160),
  description:z.string().trim().min(10).max(1000),
  mode:z.enum(["SOLO","SOCIAL"]),
  targetIds:z.array(z.string().uuid()).max(3).default([]),
  challengeType:z.enum(["MOST_ATTENDANCES","FIRST_TO_TARGET","REACH_TARGET","STREAK","ACCUMULATED_AMOUNT"]).default("REACH_TARGET"),
  durationDays:z.coerce.number().int().min(1).max(365),
  restDaysAllowed:z.coerce.number().int().min(0).max(14).default(2),
  targetValue:z.coerce.number().int().min(1).max(10000),
  targetUnit:z.string().trim().toLowerCase().regex(/^[a-z0-9áéíóúüñ _-]{2,50}$/i),
  evidenceType:z.enum(["NONE","CHECK_IN","ONE_PHOTO","TWO_PHOTOS","TEXT","CHECKLIST","NUMERIC_VALUE","PHOTO_AND_VALUE"]),
  numericMinimum:z.coerce.number().min(0).max(1_000_000_000_000).default(0),
  numericMaximum:z.coerce.number().positive().max(1_000_000_000_000).default(10000),
  allowDecimals:z.boolean().default(false),
  pointsPerCompletion:z.coerce.number().int().min(0).max(1000),
  completionBonus:z.coerce.number().int().min(0).max(100000).default(0),
  winnerBonus:z.coerce.number().int().min(0).max(100000).default(0),
  maxDailyCompletions:z.coerce.number().int().min(1).max(20),
  validWeekdays:z.array(z.coerce.number().int().min(1).max(7)).min(1).max(7),
  checklistItems:z.array(z.object({label:z.string().trim().min(2).max(200),required:z.boolean().default(true),points:z.coerce.number().int().min(0).max(1000).default(0)})).max(30).default([]),
  saveAsPersonalTemplate:z.boolean().default(false),
  termsAccepted:z.literal(true),
}).superRefine((value,context)=>{
  const uniqueTargets=new Set(value.targetIds);
  if(uniqueTargets.size!==value.targetIds.length)context.addIssue({code:"custom",path:["targetIds"],message:"No repitas participantes"});
  if(value.mode==="SOLO"&&value.targetIds.length>0)context.addIssue({code:"custom",path:["targetIds"],message:"El reto individual no admite invitados"});
  if(value.mode==="SOCIAL"&&value.targetIds.length===0)context.addIssue({code:"custom",path:["targetIds"],message:"Selecciona al menos un amigo"});
  if(value.evidenceType==="CHECKLIST"&&value.checklistItems.length===0)context.addIssue({code:"custom",path:["checklistItems"],message:"Agrega al menos una actividad"});
  if(value.numericMaximum<value.numericMinimum)context.addIssue({code:"custom",path:["numericMaximum"],message:"El máximo debe ser mayor o igual al mínimo"});
  if(value.restDaysAllowed>=value.durationDays)context.addIssue({code:"custom",path:["restDaysAllowed"],message:"Los descansos deben ser menores que la duración del reto"});
});

export type CustomChallengeInput=z.infer<typeof customChallengeSchema>;
