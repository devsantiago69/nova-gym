import Redis from "ioredis";
const redis=new Redis(process.env.REDIS_URL??"redis://localhost:6379",{maxRetriesPerRequest:null});
async function start(){await redis.set("gymchallenge:worker:heartbeat",new Date().toISOString(),"EX",60);console.log(JSON.stringify({level:"info",message:"worker_started",timestamp:new Date().toISOString()}));setInterval(()=>void redis.set("gymchallenge:worker:heartbeat",new Date().toISOString(),"EX",60),30_000);}
start().catch(error=>{console.error(JSON.stringify({level:"error",message:"worker_failed",error:error instanceof Error?error.message:"unknown"}));process.exit(1);});
