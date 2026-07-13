import { PrismaUserRepository } from "@/modules/users/repositories/prisma-user-repository";
import { UserManager } from "@/components/admin/user-manager";
import { prisma } from "@gymchallenge/database";
export default async function Users(){const [users,plans]=await Promise.all([new PrismaUserRepository().list(),prisma.plan.findMany({where:{status:"ACTIVE"},select:{id:true,name:true,code:true},orderBy:{monthlyPrice:"asc"}})]);return <section><p className="text-xs font-black text-lime-300">CLIENTES Y ACCESOS</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Usuarios</h1><p className="mb-7 mt-2 muted">Crea cuentas, administra sus planes y controla el acceso a la plataforma.</p><UserManager initialUsers={users} plans={plans}/></section>}
