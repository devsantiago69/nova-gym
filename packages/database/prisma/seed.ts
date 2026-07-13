import argon2 from "argon2";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !username || !password || password.length < 12) throw new Error("Define las variables SEED_ADMIN_*; la contraseña debe tener al menos 12 caracteres");
  const free = await prisma.plan.upsert({ where:{code:"FREE"}, update:{trialDays:7}, create:{name:"Free",code:"FREE",description:"Plan inicial de 7 días",trialDays:7,storageLimitMb:250,activeChallengeLimit:1,friendLimit:20,historyMonths:3} });
  await prisma.plan.upsert({ where:{code:"PRO"}, update:{}, create:{name:"Pro",code:"PRO",description:"Funciones completas",monthlyPrice:29900,storageLimitMb:10240,activeChallengeLimit:10,friendLimit:500,historyMonths:null,expensesEnabled:true,whatsappEnabled:true,advancedStatsEnabled:true,exportsEnabled:true} });
  const admin = await prisma.user.upsert({ where:{email:email.toLowerCase()}, update:{}, create:{email:email.toLowerCase(),username:username.toLowerCase(),passwordHash:await argon2.hash(password,{type:argon2.argon2id}),role:UserRole.ADMIN,status:UserStatus.PENDING_PASSWORD_CHANGE,profile:{create:{firstName:"Administrador",lastName:"GymChallenge"}}} });
  await prisma.subscription.upsert({ where:{id:admin.id}, update:{}, create:{id:admin.id,userId:admin.id,planId:free.id} });
  const testUsers=[
    {email:"prueba1@novagym.co",username:"prueba1",password:process.env.SEED_USER1_PASSWORD,firstName:"Usuario",lastName:"Prueba Uno",whatsappNumber:"+573000000001"},
    {email:"prueba2@novagym.co",username:"prueba2",password:process.env.SEED_USER2_PASSWORD,firstName:"Usuario",lastName:"Prueba Dos",whatsappNumber:"+573000000002"},
  ];
  for(const item of testUsers){if(!item.password||item.password.length<12)throw new Error("Define SEED_USER1_PASSWORD y SEED_USER2_PASSWORD con mínimo 12 caracteres");const user=await prisma.user.upsert({where:{email:item.email},update:{},create:{email:item.email,username:item.username,passwordHash:await argon2.hash(item.password,{type:argon2.argon2id}),status:UserStatus.PENDING_PASSWORD_CHANGE,whatsappNumber:item.whatsappNumber,countryCode:"+57",profile:{create:{firstName:item.firstName,lastName:item.lastName}}}});await prisma.subscription.upsert({where:{id:user.id},update:{},create:{id:user.id,userId:user.id,planId:free.id,endsAt:new Date(Date.now()+7*24*60*60_000)}});}
}
main().finally(() => prisma.$disconnect());
