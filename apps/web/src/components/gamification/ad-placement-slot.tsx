import { AdSlot } from "@/components/gamification/ad-slot";
import { placementFor, placementIsActive } from "@/modules/gamification/ad-placements";

export async function AdPlacementSlot({ placementKey }: { placementKey: string }) {
  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) return null;
  const placement = await placementFor(placementKey);
  if (!placementIsActive(placement)) return null;

  return (
    <div className="min-h-[132px] rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="mb-3 text-[9px] font-black uppercase tracking-[.14em] text-slate-500">
        Publicidad
      </p>
      <AdSlot slotId={placement!.slotId!} />
    </div>
  );
}
