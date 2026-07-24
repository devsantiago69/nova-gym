import { RoutineBuilder } from "@/components/routines/routine-builder";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateRoutinePage() {
  return (
    <div className="pb-10">
      <Link
        href="/rutinas"
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400"
      >
        <ArrowLeft size={17} /> Volver a rutinas
      </Link>
      <RoutineBuilder
        licensed={process.env.EXERCISE_MEDIA_LICENSED === "1"}
      />
    </div>
  );
}
