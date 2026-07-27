import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const levels = [
  { level: 1, title: "Principiante", xpThreshold: 0, icon: "Sparkle", colorFrom: "#a3e635", colorTo: "#4ade80" },
  { level: 2, title: "Iniciado", xpThreshold: 100, icon: "Sparkle", colorFrom: "#a3e635", colorTo: "#4ade80" },
  { level: 3, title: "Constante", xpThreshold: 250, icon: "Flame", colorFrom: "#a3e635", colorTo: "#22d3ee" },
  { level: 4, title: "Comprometido", xpThreshold: 450, icon: "Flame", colorFrom: "#a3e635", colorTo: "#22d3ee" },
  { level: 5, title: "Disciplinado", xpThreshold: 700, icon: "Flame", colorFrom: "#22d3ee", colorTo: "#38bdf8" },
  { level: 6, title: "Guerrero", xpThreshold: 1_000, icon: "Sword", colorFrom: "#22d3ee", colorTo: "#38bdf8" },
  { level: 7, title: "Atleta", xpThreshold: 1_400, icon: "Sword", colorFrom: "#38bdf8", colorTo: "#818cf8" },
  { level: 8, title: "Imparable", xpThreshold: 1_900, icon: "Zap", colorFrom: "#38bdf8", colorTo: "#818cf8" },
  { level: 9, title: "Fuerza Bruta", xpThreshold: 2_500, icon: "Zap", colorFrom: "#818cf8", colorTo: "#c084fc" },
  { level: 10, title: "Veterano", xpThreshold: 3_200, icon: "Shield", colorFrom: "#818cf8", colorTo: "#c084fc" },
  { level: 11, title: "Élite", xpThreshold: 4_000, icon: "Shield", colorFrom: "#c084fc", colorTo: "#e879f9" },
  { level: 12, title: "Máquina", xpThreshold: 4_900, icon: "Cog", colorFrom: "#c084fc", colorTo: "#e879f9" },
  { level: 13, title: "Titán", xpThreshold: 5_900, icon: "Mountain", colorFrom: "#e879f9", colorTo: "#fb7185" },
  { level: 14, title: "Campeón", xpThreshold: 7_000, icon: "Trophy", colorFrom: "#e879f9", colorTo: "#fb7185" },
  { level: 15, title: "Leyenda", xpThreshold: 8_200, icon: "Trophy", colorFrom: "#fb7185", colorTo: "#fb923c" },
  { level: 16, title: "Invencible", xpThreshold: 9_500, icon: "ShieldCheck", colorFrom: "#fb7185", colorTo: "#fb923c" },
  { level: 17, title: "Fenómeno", xpThreshold: 11_000, icon: "Rocket", colorFrom: "#fb923c", colorTo: "#facc15" },
  { level: 18, title: "Élite Nova", xpThreshold: 12_600, icon: "Rocket", colorFrom: "#fb923c", colorTo: "#facc15" },
  { level: 19, title: "Maestro", xpThreshold: 14_300, icon: "Crown", colorFrom: "#facc15", colorTo: "#a3e635" },
  { level: 20, title: "Gran Maestro", xpThreshold: 16_100, icon: "Crown", colorFrom: "#facc15", colorTo: "#a3e635" },
  { level: 21, title: "Ícono", xpThreshold: 18_000, icon: "Star", colorFrom: "#facc15", colorTo: "#fde047" },
  { level: 22, title: "Inmortal", xpThreshold: 20_500, icon: "Star", colorFrom: "#fde047", colorTo: "#fef08a" },
  { level: 23, title: "Mítico", xpThreshold: 23_500, icon: "Gem", colorFrom: "#fde047", colorTo: "#fef9c3" },
  { level: 24, title: "Supremo", xpThreshold: 27_000, icon: "Gem", colorFrom: "#fef9c3", colorTo: "#ffffff" },
  { level: 25, title: "Nova Legend", xpThreshold: 31_000, icon: "Gem", colorFrom: "#ffffff", colorTo: "#a3e635" },
];

async function main() {
  for (const level of levels) {
    await prisma.levelDefinition.upsert({
      where: { level: level.level },
      update: level,
      create: level,
    });
  }
  console.log(`Seeded ${levels.length} level definitions`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
