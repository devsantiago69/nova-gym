import {getServerSession} from "next-auth";
import {prisma} from "@gymchallenge/database";
import {authOptions} from "@/lib/auth";
import {fail,ok} from "@/lib/api-response";

export async function PATCH(_:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getServerSession(authOptions);if(!session)return fail("UNAUTHORIZED","Debes iniciar sesión",401);
  const {id}=await params;
  const result=await prisma.userChallengeTemplate.updateMany({where:{id,ownerId:session.user.id,archivedAt:null},data:{usageCount:{increment:1}}});
  if(result.count===0)return fail("TEMPLATE_NOT_FOUND","La plantilla personal no existe",404);
  return ok({id},"Uso registrado");
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getServerSession(authOptions);if(!session)return fail("UNAUTHORIZED","Debes iniciar sesión",401);
  const {id}=await params;const archivedAt=new Date();
  const result=await prisma.userChallengeTemplate.updateMany({where:{id,ownerId:session.user.id,archivedAt:null},data:{archivedAt}});
  if(result.count===0)return fail("TEMPLATE_NOT_FOUND","La plantilla personal no existe o ya fue archivada",404);
  await prisma.auditLog.create({data:{actorId:session.user.id,action:"PERSONAL_CHALLENGE_TEMPLATE_ARCHIVED",entityType:"UserChallengeTemplate",entityId:id,correlationId:crypto.randomUUID(),newValues:{archivedAt:archivedAt.toISOString()}}});
  return ok({id},"Plantilla archivada");
}
