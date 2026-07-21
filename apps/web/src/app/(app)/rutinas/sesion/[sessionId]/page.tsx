import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { WorkoutRunner } from "@/components/routines/workout-runner";
import { routineInclude } from "@/modules/routines/queries";

export default async function WorkoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const auth=await getServerSession(authOptions); const {sessionId}=await params;
  if(!auth)redirect("/login");
  const workout=await prisma.workoutSession.findFirst({where:{id:sessionId,userId:auth.user.id},include:{routine:{include:routineInclude},setLogs:{select:{routineExerciseId:true,setNumber:true}}}});
  if(!workout)notFound(); if(["COMPLETED","ABANDONED"].includes(workout.status))redirect("/rutinas");
  return <WorkoutRunner licensed={process.env.EXERCISE_MEDIA_LICENSED==="1"} initialWorkout={JSON.parse(JSON.stringify(workout))}/>;
}
