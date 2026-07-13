import { PrismaUserRepository } from "@/modules/users/repositories/prisma-user-repository";
import { UserManager } from "@/components/admin/user-manager";
export default async function Users(){const users=await new PrismaUserRepository().list();return <section><h1 className="text-3xl font-black">Usuarios</h1><p className="mb-6 muted">Crea cuentas y administra sus accesos.</p><UserManager initialUsers={users}/></section>}
