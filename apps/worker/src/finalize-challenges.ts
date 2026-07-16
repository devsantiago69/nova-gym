import {finalizeExpiredChallenges,prisma} from "@gymchallenge/database";

const result=await finalizeExpiredChallenges(prisma);
console.log(JSON.stringify({level:"info",message:"expired_challenges_finalized",...result,timestamp:new Date().toISOString()}));
await prisma.$disconnect();
