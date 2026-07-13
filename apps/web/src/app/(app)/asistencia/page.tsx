import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { authOptions } from "@/lib/auth";
export default async function Page(){const session=await getServerSession(authOptions);const rows=await prisma.attendance.findMany({where:{userId:session!.user.id},include:{photos:{select:{id:true,type:true}},pointMovements:{select:{amount:true}}},orderBy:{localDate:"desc"},take:370});return <section><p className="text-sm font-bold text-lime-400">MI ACTIVIDAD</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Asistencia</h1><p className="mb-7 mt-2 muted">Registra cada entrenamiento, construye tu constancia y consulta tu calendario.</p><AttendanceManager initial={rows.map(row=>({...row,localDate:row.localDate.toISOString(),startedAt:row.startedAt.toISOString(),finishedAt:row.finishedAt?.toISOString()??null}))}/></section>}
