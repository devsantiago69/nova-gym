import {getServerSession} from "next-auth";
import {prisma} from "@gymchallenge/database";
import {ChallengeCreator} from "@/components/challenges/challenge-creator";
import {authOptions} from "@/lib/auth";
import {challengeDraftDataSchema,type ChallengeDraftData} from "@/modules/challenges/draft-schema";
import {activePlanEntitlements} from "@/modules/plans/entitlements";

export default async function Page({searchParams}:{searchParams:Promise<{draft?:string}>}){
  const session=await getServerSession(authOptions);const userId=session!.user.id;const {draft:draftId}=await searchParams;const now=new Date();
  await prisma.challengeDraft.deleteMany({where:{ownerId:userId,expiresAt:{lt:now}}});
  const [categories,friendships,draftRows,plan]=await Promise.all([
    prisma.challengeCategory.findMany({where:{status:"ACTIVE"},select:{id:true,name:true,description:true},orderBy:{name:"asc"}}),
    prisma.friendship.findMany({where:{status:"ACCEPTED",OR:[{requesterId:userId},{addresseeId:userId}]},include:{requester:{include:{profile:true}},addressee:{include:{profile:true}}}}),
    prisma.challengeDraft.findMany({where:{ownerId:userId,expiresAt:{gte:now}},orderBy:{updatedAt:"desc"},take:20}),
    activePlanEntitlements(userId),
  ]);
  const friends=friendships.map(row=>row.requesterId===userId?row.addressee:row.requester).map(user=>({id:user.id,username:user.username,name:`${user.profile?.firstName??""} ${user.profile?.lastName??""}`.trim()||user.username}));
  const drafts=draftRows.flatMap(row=>{const parsed=challengeDraftDataSchema.safeParse(row.data);return parsed.success?[{id:row.id,title:row.title,currentStep:row.currentStep,updatedAt:row.updatedAt.toISOString(),data:parsed.data as ChallengeDraftData}]:[]});
  const initialDraft=drafts.find(item=>item.id===draftId)??null;
  return <section className="pb-10"><ChallengeCreator key={initialDraft?.id??"new"} categories={categories} friends={friends} drafts={drafts} initialDraft={initialDraft} plan={plan?{name:plan.name,activeChallengeLimit:plan.activeChallengeLimit}:null}/></section>;
}
