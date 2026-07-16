import { prisma } from "@gymchallenge/database";
import { ChallengeTemplateManager } from "@/components/admin/challenge-template-manager";

function checklistItems(value: unknown) {
  if (!value || typeof value !== "object" || !("checklistItems" in value) || !Array.isArray(value.checklistItems)) return [];
  return value.checklistItems.flatMap((item) => item && typeof item === "object" && "label" in item && typeof item.label === "string" ? [{ label:item.label, required:!("required" in item)||item.required!==false, points:"points" in item&&typeof item.points==="number"?item.points:0 }] : []);
}

export default async function Page(){
  const [rows,categories]=await Promise.all([
    prisma.challengeTemplate.findMany({include:{versions:{orderBy:{version:"desc"},take:1}},orderBy:[{status:"asc"},{sortOrder:"asc"},{createdAt:"desc"}]}),
    prisma.challengeCategory.findMany({orderBy:{name:"asc"}}),
  ]);
  const initial=rows.flatMap(row=>{const version=row.versions[0];if(!version)return [];return [{
    id:row.id,categoryId:row.categoryId,name:row.name,slug:row.slug,shortDescription:row.shortDescription,icon:row.icon,tags:row.tags,difficulty:row.difficulty,status:row.status,featured:row.featured,sortOrder:row.sortOrder,usageCount:row.usageCount,
    latest:{version:version.version,fullDescription:version.fullDescription,challengeType:version.challengeType,allowedModalities:version.allowedModalities,defaultDurationDays:version.defaultDurationDays,minimumDurationDays:version.minimumDurationDays,maximumDurationDays:version.maximumDurationDays,defaultTargetValue:version.defaultTargetValue,targetUnit:version.targetUnit,evidenceType:version.evidenceType,requiredPhotoCount:version.requiredPhotoCount,pointsPerCompletion:version.pointsPerCompletion,completionBonus:version.completionBonus,winnerBonus:version.winnerBonus,maxDailyCompletions:version.maxDailyCompletions,checklistItems:checklistItems(version.scoringRules),instructions:version.instructions,recommendations:version.recommendations,terms:version.terms},
  }]});
  return <section><p className="text-xs font-black text-lime-300">MOTOR DE EXPERIENCIAS</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Plantillas de retos</h1><p className="mb-7 mt-2 max-w-3xl muted">Publica, versiona y archiva retos sin cambiar las reglas de quienes ya comenzaron.</p><ChallengeTemplateManager initial={initial} categories={categories.map(({id,name})=>({id,name}))}/></section>;
}
