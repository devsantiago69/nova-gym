import { prisma, type AdPlacement } from "@gymchallenge/database";

let placementsCache: { value: AdPlacement[]; expiresAt: number } | undefined;

export async function cachedPlacements() {
  const now = Date.now();
  if (placementsCache && placementsCache.expiresAt > now) return placementsCache.value;
  const value = await prisma.adPlacement.findMany({ orderBy: { page: "asc" } });
  placementsCache = { value, expiresAt: now + 60_000 };
  return value;
}

export function invalidatePlacementsCache() {
  placementsCache = undefined;
}

export async function placementFor(key: string) {
  const placements = await cachedPlacements();
  return placements.find((placement) => placement.key === key) ?? null;
}

export async function placementsForPage(page: string) {
  const placements = await cachedPlacements();
  return placements.filter((placement) => placement.page === page);
}

export function placementIsActive(placement: AdPlacement | null): boolean {
  return Boolean(placement?.enabled && placement.slotId);
}
