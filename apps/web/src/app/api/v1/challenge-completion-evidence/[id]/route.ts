import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getPrivateObject } from "@/lib/private-storage";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const session=await getServerSession(authOptions);if(!session)return fail("UNAUTHORIZED","Debes iniciar sesión",401);const evidence=await prisma.challengeCompletionEvidence.findUnique({where:{id:(await params).id},include:{completion:{select:{userId:true}}}});if(!evidence)return fail("NOT_FOUND","Evidencia no encontrada",404);if(evidence.completion.userId!==session.user.id&&session.user.role!=="ADMIN")return fail("PRIVATE_EVIDENCE","Esta evidencia es privada",403);try{const object=await getPrivateObject(evidence.objectKey);return new Response(Buffer.from(object.body),{headers:{"content-type":object.contentType,"cache-control":"private, no-store","content-disposition":"inline","x-content-type-options":"nosniff"}})}catch{return fail("STORAGE_UNAVAILABLE","No fue posible abrir la evidencia",503)}}
