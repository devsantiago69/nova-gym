import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExerciseLibrary } from "@/components/routines/exercise-library";
export default function ExerciseLibraryPage(){return <div className="pb-10"><Link href="/rutinas" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400"><ArrowLeft size={17}/> Volver a rutinas</Link><ExerciseLibrary licensed={process.env.EXERCISE_MEDIA_LICENSED==="1"}/></div>}
