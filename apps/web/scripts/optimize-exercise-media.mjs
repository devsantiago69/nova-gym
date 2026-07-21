import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = process.env.EXERCISE_DATASET_PATH ?? path.resolve(process.cwd(), "../../vendor/exercises-dataset");
const targetRoot = process.env.EXERCISE_OPTIMIZED_MEDIA_PATH ?? path.resolve(process.cwd(), "../../storage/exercise-media");
const imageSource = path.join(sourceRoot, "images");
const animationSource = path.join(sourceRoot, "videos");
const imageTarget = path.join(targetRoot, "images");
const animationTarget = path.join(targetRoot, "animations");
const force = process.env.FORCE_MEDIA_OPTIMIZE === "1";
await Promise.all([mkdir(imageTarget, { recursive: true }), mkdir(animationTarget, { recursive: true })]);

async function exists(file) { try { return (await stat(file)).size > 0; } catch { return false; } }
async function processFiles(files, worker) {
  let cursor = 0; let completed = 0;
  const workers = Array.from({ length: Math.max(1, Number(process.env.MEDIA_OPTIMIZER_CONCURRENCY) || 3) }, async () => {
    while (cursor < files.length) {
      const index = cursor++; await worker(files[index]); completed += 1;
      if (completed % 100 === 0 || completed === files.length) console.log(`${completed}/${files.length}`);
    }
  });
  await Promise.all(workers);
}

const images = (await readdir(imageSource)).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
console.log(`Optimizando ${images.length} miniaturas...`);
await processFiles(images, async (file) => {
  const destination = path.join(imageTarget, `${path.parse(file).name}.webp`);
  if (!force && await exists(destination)) return;
  await sharp(path.join(imageSource, file)).rotate().resize(540, 540, { fit: "contain", background: "#ffffff", withoutEnlargement: false, kernel: sharp.kernel.lanczos3 }).sharpen({ sigma: 0.7, m1: 0.7, m2: 1 }).webp({ quality: 90, effort: 5 }).toFile(destination);
});

const animations = (await readdir(animationSource)).filter((file) => /\.(gif|webp)$/i.test(file));
console.log(`Optimizando ${animations.length} animaciones...`);
await processFiles(animations, async (file) => {
  const destination = path.join(animationTarget, `${path.parse(file).name}.webp`);
  if (!force && await exists(destination)) return;
  await sharp(path.join(animationSource, file), { animated: true, limitInputPixels: false }).resize(540, 540, { fit: "contain", background: "#ffffff", withoutEnlargement: false, kernel: sharp.kernel.lanczos3 }).sharpen({ sigma: 0.8, m1: 0.7, m2: 1.1 }).webp({ quality: 88, effort: 4, loop: 0 }).toFile(destination);
});

await writeFile(path.join(targetRoot, "manifest.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), images: images.length, animations: animations.length,
  source: "hasaneyldrm/exercises-dataset", attribution: "© Gym visual — https://gymvisual.com/",
}, null, 2));
console.log(`Biblioteca optimizada en ${targetRoot}`);
