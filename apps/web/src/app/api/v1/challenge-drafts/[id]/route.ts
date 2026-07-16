import {getServerSession} from "next-auth";
import {prisma} from "@gymchallenge/database";
import {authOptions} from "@/lib/auth";
import {fail,ok} from "@/lib/api-response";
import {challengeDraftRequestSchema} from "@/modules/challenges/draft-schema";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getServerSession(authOptions);if(!session)return fail("UNAUTHORIZED","Debes iniciar sesión",401);
  const parsed=challengeDraftRequestSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail("VALIDATION_ERROR",parsed.error.issues[0]?.message??"Borrador inválido",422,parsed.error.issues[0]?.path.join(".")??null);
  const {id}=await params;const {currentStep,data}=parsed.data;
  const result=await prisma.challengeDraft.updateMany({where:{id,ownerId:session.user.id,expiresAt:{gte:new Date()}},data:{title:data.name||"Nuevo reto",currentStep,data,expiresAt:new Date(Date.now()+30*86_400_000)}});
  if(result.count===0)return fail("DRAFT_NOT_FOUND","El borrador no existe o ya venció",404);
  return ok({id},"Borrador actualizado");
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getServerSession(authOptions);if(!session)return fail("UNAUTHORIZED","Debes iniciar sesión",401);const {id}=await params;
  const result=await prisma.challengeDraft.deleteMany({where:{id,ownerId:session.user.id}});if(result.count===0)return fail("DRAFT_NOT_FOUND","El borrador no existe",404);
  return ok({id},"Borrador eliminado");
}
