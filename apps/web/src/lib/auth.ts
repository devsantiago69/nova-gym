import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import argon2 from "argon2";
import { prisma } from "@gymchallenge/database";
import { loginSchema } from "@/modules/auth/validators/login";

export const authOptions: NextAuthOptions = {
  session:{strategy:"jwt",maxAge:60*60*12}, pages:{signIn:"/login"},
  providers:[CredentialsProvider({name:"Credenciales",credentials:{identifier:{label:"Usuario",type:"text"},password:{label:"Contraseña",type:"password"}},async authorize(raw){
    const parsed=loginSchema.safeParse(raw); if(!parsed.success)return null;
    const identifier=parsed.data.identifier;
    const user=await prisma.user.findFirst({where:{deletedAt:null,username:identifier},include:{profile:true}});
    if(!user){await argon2.hash(parsed.data.password);return null;}
    if(user.lockedUntil&&user.lockedUntil>new Date())return null;
    if(user.status==="INACTIVE"||user.status==="SUSPENDED")return null;
    const valid=await argon2.verify(user.passwordHash,parsed.data.password);
    if(!valid){const attempts=user.failedLoginAttempts+1;await prisma.user.update({where:{id:user.id},data:{failedLoginAttempts:attempts,lockedUntil:attempts>=5?new Date(Date.now()+15*60_000):null}});return null;}
    await prisma.user.update({where:{id:user.id},data:{failedLoginAttempts:0,lockedUntil:null,lastLoginAt:new Date()}});
    return {id:user.id,email:user.email,name:`${user.profile?.firstName??""} ${user.profile?.lastName??""}`.trim(),role:user.role,status:user.status};
  }})],
  callbacks:{async jwt({token,user}){if(user){token.id=user.id;token.role=user.role;token.status=user.status;}else if(token.id){const current=await prisma.user.findUnique({where:{id:String(token.id)},select:{role:true,status:true}});if(current){token.role=current.role;token.status=current.status;}}return token;},async session({session,token}){if(session.user){session.user.id=String(token.id);session.user.role=token.role;session.user.status=token.status;}return session;}},
  secret:process.env.AUTH_SECRET??"development-secret-must-be-replaced"
};
