import argon2 from "argon2";
import { ChallengeType, PrismaClient, UserRole, UserStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function seedOfficialAttendanceTemplate(category: { id: string; name: string; slug: string; description: string; type: ChallengeType; durationDays: number; targetAttendances: number; pointsPerAttendance: number; completionBonus: number; winnerBonus: number; icon: string }) {
  const template = await prisma.challengeTemplate.upsert({
    where: { slug: category.slug },
    update: { categoryId: category.id, name: category.name, shortDescription: category.description, status: "ACTIVE" },
    create: {
      categoryId: category.id,
      name: category.name,
      slug: category.slug,
      shortDescription: category.description,
      icon: category.icon,
      tags: ["fitness", "asistencia"],
      difficulty: category.durationDays >= 30 ? "INTERMEDIATE" : "BEGINNER",
      status: "ACTIVE",
      featured: category.durationDays === 30,
      official: true,
    },
  });
  const version = await prisma.challengeTemplateVersion.upsert({
    where: { templateId_version: { templateId: template.id, version: 1 } },
    update: {},
    create: {
      templateId: template.id,
      version: 1,
      fullDescription: category.description,
      challengeType: category.type,
      allowedModalities: ["SOLO", "HEAD_TO_HEAD", "GROUP"],
      defaultDurationDays: category.durationDays,
      minimumDurationDays: category.durationDays,
      maximumDurationDays: category.durationDays,
      defaultTargetValue: category.targetAttendances,
      targetUnit: "attendances",
      evidenceType: "TWO_PHOTOS",
      requiredPhotoCount: 2,
      pointsPerCompletion: category.pointsPerAttendance,
      completionBonus: category.completionBonus,
      winnerBonus: category.winnerBonus,
      maxDailyCompletions: 1,
      scoringRules: { pointsPerCompletion: category.pointsPerAttendance, completionBonus: category.completionBonus, winnerBonus: category.winnerBonus },
      winningRule: { type: category.type, target: category.targetAttendances },
      tieRule: { allowed: true },
      instructions: "Registra una fotografía al iniciar y otra al finalizar tu entrenamiento.",
      recommendations: "Mantén una rutina constante y valida cada asistencia el mismo día.",
      terms: "Solo cuentan asistencias válidas, únicas y verificables.",
      publishedAt: new Date(),
    },
  });
  for (const field of [
    { fieldKey: "durationDays", policy: "LOCKED" as const, minimumValue: category.durationDays, maximumValue: category.durationDays },
    { fieldKey: "targetValue", policy: "LOCKED" as const, minimumValue: category.targetAttendances, maximumValue: category.targetAttendances },
    { fieldKey: "modality", policy: "EDITABLE" as const, minimumValue: null, maximumValue: null },
  ]) await prisma.challengeTemplateField.upsert({
    where: { templateVersionId_fieldKey: { templateVersionId: version.id, fieldKey: field.fieldKey } },
    update: {},
    create: { templateVersionId: version.id, ...field },
  });
}

async function seedReadingTemplate(categoryId: string) {
  const template=await prisma.challengeTemplate.upsert({where:{slug:"lectura-diaria-30-dias"},update:{categoryId,status:"ACTIVE"},create:{categoryId,name:"Lectura diaria · 30 días",slug:"lectura-diaria-30-dias",shortDescription:"Construye el hábito de leer y registra una reflexión breve cada día.",icon:"book-open",tags:["lectura","hábitos","bienestar"],difficulty:"BEGINNER",status:"ACTIVE",featured:true,official:true,sortOrder:30}});
  const version=await prisma.challengeTemplateVersion.upsert({where:{templateId_version:{templateId:template.id,version:1}},update:{},create:{templateId:template.id,version:1,fullDescription:"Lee durante el día y comparte una reflexión privada de lo aprendido. Tus compañeros solamente verán que cumpliste y los puntos obtenidos.",challengeType:"REACH_TARGET",allowedModalities:["SOLO","HEAD_TO_HEAD","GROUP"],defaultDurationDays:30,minimumDurationDays:15,maximumDurationDays:60,defaultTargetValue:20,targetUnit:"sessions",evidenceType:"TEXT",requiredPhotoCount:0,pointsPerCompletion:2,completionBonus:20,winnerBonus:10,maxDailyCompletions:1,scoringRules:{pointsPerCompletion:2,completionBonus:20},winningRule:{type:"REACH_TARGET",target:20},tieRule:{allowed:true},instructions:"Después de leer, escribe una reflexión breve de al menos tres caracteres.",recommendations:"Reserva un horario tranquilo y evita registrar información privada.",terms:"Máximo un cumplimiento diario. El texto es privado y depende de la honestidad del participante.",publishedAt:new Date()}});
  for(const field of [{fieldKey:"durationDays",policy:"EDITABLE_WITH_LIMITS" as const,minimumValue:15,maximumValue:60},{fieldKey:"targetValue",policy:"LOCKED" as const,minimumValue:20,maximumValue:20},{fieldKey:"modality",policy:"EDITABLE" as const,minimumValue:null,maximumValue:null}])await prisma.challengeTemplateField.upsert({where:{templateVersionId_fieldKey:{templateVersionId:version.id,fieldKey:field.fieldKey}},update:{},create:{templateVersionId:version.id,...field}});
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !username || !password || password.length < 12) throw new Error("Define las variables SEED_ADMIN_*; la contraseña debe tener al menos 12 caracteres");
  const free = await prisma.plan.upsert({ where:{code:"FREE"}, update:{trialDays:7,activeChallengeLimit:2}, create:{name:"Free",code:"FREE",description:"Plan inicial de 7 días",trialDays:7,storageLimitMb:250,activeChallengeLimit:2,friendLimit:20,historyMonths:3} });
  await prisma.plan.upsert({ where:{code:"PRO"}, update:{}, create:{name:"Pro",code:"PRO",description:"Funciones completas",monthlyPrice:29900,storageLimitMb:10240,activeChallengeLimit:10,friendLimit:500,historyMonths:null,expensesEnabled:true,whatsappEnabled:true,advancedStatsEnabled:true,exportsEnabled:true} });
  const category15 = await prisma.challengeCategory.upsert({where:{slug:"racha-15-dias"},update:{},create:{name:"Racha de 15 días",slug:"racha-15-dias",description:"Completa 15 asistencias válidas durante 15 días y mantén encendido tu fuego.",type:"REACH_TARGET",durationDays:15,targetAttendances:15,pointsPerAttendance:2,completionBonus:15,winnerBonus:10,icon:"flame"}});
  const category30 = await prisma.challengeCategory.upsert({where:{slug:"racha-30-dias"},update:{},create:{name:"Racha de 30 días",slug:"racha-30-dias",description:"Completa 30 asistencias válidas durante 30 días para obtener la recompensa máxima.",type:"REACH_TARGET",durationDays:30,targetAttendances:30,pointsPerAttendance:3,completionBonus:30,winnerBonus:20,icon:"flame"}});
  await seedOfficialAttendanceTemplate(category15);
  await seedOfficialAttendanceTemplate(category30);
  const readingCategory=await prisma.challengeCategory.upsert({where:{slug:"lectura-y-habitos"},update:{status:"ACTIVE"},create:{name:"Lectura y hábitos",slug:"lectura-y-habitos",description:"Retos diarios para leer, aprender y construir hábitos sostenibles.",type:"REACH_TARGET",durationDays:30,targetAttendances:20,pointsPerAttendance:2,completionBonus:20,winnerBonus:10,icon:"book-open"}});
  await seedReadingTemplate(readingCategory.id);
  const admin = await prisma.user.upsert({ where:{email:email.toLowerCase()}, update:{}, create:{email:email.toLowerCase(),username:username.toLowerCase(),passwordHash:await argon2.hash(password,{type:argon2.argon2id}),role:UserRole.ADMIN,status:UserStatus.PENDING_PASSWORD_CHANGE,profile:{create:{firstName:"Administrador",lastName:"GymChallenge"}}} });
  await prisma.subscription.upsert({ where:{id:admin.id}, update:{}, create:{id:admin.id,userId:admin.id,planId:free.id} });
  const testUsers=[
    {email:"prueba1@novagym.co",username:"prueba1",password:process.env.SEED_USER1_PASSWORD,firstName:"Usuario",lastName:"Prueba Uno",whatsappNumber:"+573000000001"},
    {email:"prueba2@novagym.co",username:"prueba2",password:process.env.SEED_USER2_PASSWORD,firstName:"Usuario",lastName:"Prueba Dos",whatsappNumber:"+573000000002"},
  ];
  for(const item of testUsers){if(!item.password||item.password.length<12)throw new Error("Define SEED_USER1_PASSWORD y SEED_USER2_PASSWORD con mínimo 12 caracteres");const user=await prisma.user.upsert({where:{email:item.email},update:{},create:{email:item.email,username:item.username,passwordHash:await argon2.hash(item.password,{type:argon2.argon2id}),status:UserStatus.PENDING_PASSWORD_CHANGE,whatsappNumber:item.whatsappNumber,countryCode:"+57",profile:{create:{firstName:item.firstName,lastName:item.lastName}}}});await prisma.subscription.upsert({where:{id:user.id},update:{},create:{id:user.id,userId:user.id,planId:free.id,endsAt:new Date(Date.now()+7*24*60*60_000)}});}
}
main().finally(() => prisma.$disconnect());
