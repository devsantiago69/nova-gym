import { prisma } from "@gymchallenge/database";
import { AdPlacementManager } from "@/components/admin/ad-placement-manager";

export default async function AdPlacementsPage() {
  const placements = await prisma.adPlacement.findMany({ orderBy: { page: "asc" } });
  return (
    <section>
      <p className="text-xs font-black text-violet-300">MONETIZACIÓN</p>
      <h1 className="mt-1 text-3xl font-black sm:text-4xl">Publicidad</h1>
      <p className="mb-7 mt-2 muted">
        Controla en qué espacios curados de la app aparecen anuncios, sin arriesgar la experiencia premium.
      </p>
      <AdPlacementManager
        initial={placements.map((placement) => ({
          ...placement,
          createdAt: placement.createdAt.toISOString(),
          updatedAt: placement.updatedAt.toISOString(),
        }))}
      />
    </section>
  );
}
