import { prisma } from "@gymchallenge/database";
import { ok, fail } from "@/lib/api-response";
import { checkPrivateStorage } from "@/lib/private-storage";

export async function GET() {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, checkPrivateStorage()]);
    return ok({ status: "ready", database: "available", storage: "available" }, "Servicio listo");
  } catch (error) {
    console.error("health.ready.failed", { error });
    return fail("SERVICE_UNAVAILABLE", "La base de datos o el almacenamiento privado no están disponibles", 503);
  }
}
