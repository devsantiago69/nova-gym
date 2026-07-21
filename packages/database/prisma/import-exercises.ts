import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, RoutineDifficulty } from "@prisma/client";

type DatasetExercise = {
  id: string;
  name: string;
  category?: string;
  body_part?: string;
  equipment?: string;
  target?: string;
  muscle_group?: string;
  secondary_muscles?: string[];
  instructions?: Record<string, string>;
  instruction_steps?: Record<string, string[]>;
  image?: string;
  gif_url?: string;
  attribution?: string;
};

const prisma = new PrismaClient();
const datasetPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../vendor/exercises-dataset/data/exercises.json");

const spanishNames: Record<string, string> = {
  "0025": "Press de banca con barra",
  "0032": "Peso muerto con barra",
  "0043": "Sentadilla completa con barra",
  "0630": "Escaladores",
  "0652": "Dominadas",
  "0662": "Flexiones",
  "1460": "Zancada caminando",
  "0464": "Plancha frontal con giro",
};

const curated = [
  {
    slug: "nova-full-body-45",
    name: "Full Body Nova",
    description: "Una sesión completa para ganar fuerza y activar todo el cuerpo.",
    goal: "Fuerza total",
    difficulty: RoutineDifficulty.INTERMEDIATE,
    estimatedMinutes: 45,
    exercises: [
      ["0043", 4, 10, null, 90], ["0025", 4, 10, null, 90],
      ["0032", 3, 8, null, 120], ["0652", 3, 8, null, 75],
      ["0630", 3, null, 40, 45],
    ],
  },
  {
    slug: "nova-casa-sin-excusas",
    name: "Casa sin excusas",
    description: "Entrenamiento dinámico sin máquinas, perfecto para comenzar hoy.",
    goal: "Acondicionamiento",
    difficulty: RoutineDifficulty.BEGINNER,
    estimatedMinutes: 25,
    exercises: [
      ["0662", 3, 12, null, 45], ["1460", 3, 12, null, 45],
      ["0630", 3, null, 35, 40], ["0464", 3, null, 30, 40],
    ],
  },
  {
    slug: "nova-fuerza-base",
    name: "Fuerza base",
    description: "Los grandes movimientos para construir una base sólida y medible.",
    goal: "Ganar fuerza",
    difficulty: RoutineDifficulty.ADVANCED,
    estimatedMinutes: 55,
    exercises: [
      ["0043", 5, 5, null, 150], ["0025", 5, 5, null, 150],
      ["0032", 5, 5, null, 180], ["0652", 4, 6, null, 90],
    ],
  },
] as const;

async function main() {
  const exercises = JSON.parse(await readFile(datasetPath, "utf8")) as DatasetExercise[];
  for (let offset = 0; offset < exercises.length; offset += 100) {
    const batch = exercises.slice(offset, offset + 100);
    await prisma.$transaction(batch.map((exercise) => prisma.exerciseCatalog.upsert({
      where: { id: exercise.id },
      create: {
        id: exercise.id,
        name: exercise.name,
        nameEs: spanishNames[exercise.id] ?? null,
        category: exercise.category ?? exercise.body_part ?? "general",
        bodyPart: exercise.body_part ?? exercise.category ?? "general",
        equipment: exercise.equipment ?? "sin equipo",
        target: exercise.target ?? "general",
        muscleGroup: exercise.muscle_group ?? null,
        secondaryMuscles: exercise.secondary_muscles ?? [],
        instructionsEs: exercise.instructions?.es ?? exercise.instructions?.en ?? "",
        instructionStepsEs: exercise.instruction_steps?.es ?? exercise.instruction_steps?.en ?? [],
        imagePath: exercise.image ?? null,
        gifPath: exercise.gif_url ?? null,
        attribution: exercise.attribution ?? null,
      },
      update: {
        name: exercise.name,
        nameEs: spanishNames[exercise.id] ?? null,
        category: exercise.category ?? exercise.body_part ?? "general",
        bodyPart: exercise.body_part ?? exercise.category ?? "general",
        equipment: exercise.equipment ?? "sin equipo",
        target: exercise.target ?? "general",
        muscleGroup: exercise.muscle_group ?? null,
        secondaryMuscles: exercise.secondary_muscles ?? [],
        instructionsEs: exercise.instructions?.es ?? exercise.instructions?.en ?? "",
        instructionStepsEs: exercise.instruction_steps?.es ?? exercise.instruction_steps?.en ?? [],
        imagePath: exercise.image ?? null,
        gifPath: exercise.gif_url ?? null,
        attribution: exercise.attribution ?? null,
      },
    })));
  }

  for (const routine of curated) {
    const existing = await prisma.routine.upsert({
      where: { slug: routine.slug },
      create: {
        slug: routine.slug, name: routine.name, description: routine.description,
        goal: routine.goal, difficulty: routine.difficulty,
        estimatedMinutes: routine.estimatedMinutes, isFeatured: true, isPublic: true,
      },
      update: {
        name: routine.name, description: routine.description, goal: routine.goal,
        difficulty: routine.difficulty, estimatedMinutes: routine.estimatedMinutes,
        isFeatured: true, isPublic: true,
      },
    });
    await prisma.routineExercise.deleteMany({ where: { routineId: existing.id } });
    await prisma.routineExercise.createMany({ data: routine.exercises.map(([exerciseId, sets, reps, durationSeconds, restSeconds], position) => ({
      routineId: existing.id, exerciseId, position, sets, reps, durationSeconds, restSeconds,
    })) });
  }
  console.log(`Catálogo listo: ${exercises.length} ejercicios y ${curated.length} rutinas Nova.`);
}

main().finally(() => prisma.$disconnect());
