import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { AttendanceManager } from "@/components/attendance/attendance-manager";
import { authOptions } from "@/lib/auth";
export default async function Page(){const session=await getServerSession(authOptions);const rows=await prisma.attendance.findMany({where:{userId:session!.user.id},include:{photos:{select:{id:true,type:true}},pointMovements:{select:{amount:true}}},orderBy:{localDate:"desc"},take:60});return <section><h1 className="text-3xl font-black">Asistencia</h1><p className="mb-6 muted">Registra tu entrenamiento con evidencia privada y gana puntos.</p><AttendanceManager initial={rows.map(row=>({...row,localDate:row.localDate.toISOString(),startedAt:row.startedAt.toISOString(),finishedAt:row.finishedAt?.toISOString()??null}))}/></section>}
