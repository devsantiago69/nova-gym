import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const placements = [
  {
    key: "perfil-recompensa",
    label: "Perfil — anuncio con recompensa de XP",
    page: "perfil",
    format: "REWARDED" as const,
    frequency: 1,
  },
  {
    key: "inicio-resumen",
    label: "Inicio — debajo del resumen",
    page: "inicio",
    format: "DISPLAY" as const,
    frequency: 1,
  },
  {
    key: "comunidad-feed",
    label: "Actividad — dentro del feed",
    page: "actividad",
    format: "NATIVE_FEED" as const,
    frequency: 6,
  },
  {
    key: "retos-final",
    label: "Retos — final del listado",
    page: "retos",
    format: "DISPLAY" as const,
    frequency: 1,
  },
];

async function main() {
  for (const placement of placements) {
    await prisma.adPlacement.upsert({
      where: { key: placement.key },
      update: { label: placement.label, page: placement.page, format: placement.format },
      create: { ...placement, enabled: false, slotId: null },
    });
  }
  console.log(`Seeded ${placements.length} ad placements (all disabled by default)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
