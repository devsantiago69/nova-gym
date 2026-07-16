import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getPrivateObject } from "@/lib/private-storage";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { userId } = await params;
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { avatarKey: true },
  });
  if (!profile?.avatarKey)
    return fail("AVATAR_NOT_FOUND", "Este perfil no tiene fotografía", 404);
  try {
    const object = await getPrivateObject(profile.avatarKey);
    return new Response(Buffer.from(object.body), {
      headers: {
        "content-type": object.contentType,
        "cache-control": "private, max-age=300",
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return fail(
      "STORAGE_UNAVAILABLE",
      "No fue posible abrir la fotografía",
      503,
    );
  }
}
