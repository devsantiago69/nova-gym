import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { DomainError } from "@gymchallenge/domain";

const allowed = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function normalizeAvatarImage(file: File) {
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    throw new DomainError(
      "INVALID_AVATAR",
      "La fotografía debe pesar máximo 8 MB",
    );
  }
  const input = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(input);
  if (!detected || !allowed.has(detected.mime)) {
    throw new DomainError(
      "INVALID_AVATAR",
      "Usa una imagen JPEG, PNG, WebP o HEIC válida",
    );
  }
  try {
    const body = await sharp(input, { limitInputPixels: 30_000_000 })
      .rotate()
      .resize(640, 640, {
        fit: "cover",
        position: "attention",
        withoutEnlargement: false,
      })
      .webp({ quality: 86 })
      .toBuffer();
    return { body, contentType: "image/webp" };
  } catch {
    throw new DomainError(
      "INVALID_AVATAR",
      "No fue posible procesar la fotografía",
    );
  }
}
