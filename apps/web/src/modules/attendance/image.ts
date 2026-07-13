import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { DomainError } from "@gymchallenge/domain";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function normalizeAttendanceImage(file: File) {
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new DomainError("INVALID_IMAGE", "La fotografía debe pesar máximo 10 MB");
  const input = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(input);
  if (!detected || !allowed.has(detected.mime)) throw new DomainError("INVALID_IMAGE", "Usa una fotografía JPEG, PNG, WebP o HEIC válida");
  try {
    const image = sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
    const metadata = await image.metadata();
    const body = await image.webp({ quality: 82 }).toBuffer();
    return { body, mimeType: "image/webp", size: body.length, checksum: createHash("sha256").update(body).digest("hex"), width: metadata.width, height: metadata.height };
  } catch { throw new DomainError("INVALID_IMAGE", "No fue posible procesar la fotografía"); }
}
