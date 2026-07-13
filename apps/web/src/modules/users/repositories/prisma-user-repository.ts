import { prisma } from "@gymchallenge/database";
export class PrismaUserRepository {
  findById(id:string){return prisma.user.findUnique({where:{id},include:{profile:true}});}
  list(){return prisma.user.findMany({where:{deletedAt:null},select:{id:true,email:true,username:true,role:true,status:true,createdAt:true,profile:{select:{firstName:true,lastName:true}}},orderBy:{createdAt:"desc"}});}
}
