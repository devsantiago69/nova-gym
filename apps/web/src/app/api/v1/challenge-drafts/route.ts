import {getServerSession} from "next-auth";
import {prisma} from "@gymchallenge/database";
import {authOptions} from "@/lib/auth";
import {fail,ok} from "@/lib/api-response";
import {challengeDraftRequestSchema} from "@/modules/challenges/draft-schema";

export async function GET(){
  const session=await getServerSession(authOptions);if(!session)return fail("UNAUTHORIZED","Debes iniciar sesión",401);
  await prisma.challengeDraft.deleteMany({where:{ownerId:session.user.id,expiresAt:{lt:new Date()}}});
  const drafts=await prisma.challengeDraft.findMany({where:{ownerId:session.user.id},orderBy:{updatedAt:"desc"},take:20});
  return ok(drafts);
}

export async function POST(request:Request){
  const session=await getServerSession(authOptions);if(!session)return fail("UNAUTHORIZED","Debes iniciar sesión",401);
  const parsed=challengeDraftRequestSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail("VALIDATION_ERROR",parsed.error.issues[0]?.message??"Borrador inválido",422,parsed.error.issues[0]?.path.join(".")??null);
  const {currentStep,data}=parsed.data;const expiresAt=new Date(Date.now()+30*86_400_000);
  const draft=await prisma.challengeDraft.create({data:{ownerId:session.user.id,title:data.name||"Nuevo reto",currentStep,data,expiresAt}});
  return ok(draft,"Borrador guardado",201);
}
