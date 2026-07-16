import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail } from "@/lib/api-response";
import { getPrivateObject } from "@/lib/private-storage";
import { canViewSocialPost } from "@/modules/social/feed";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ postId: string; photoId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const { postId, photoId } = await params;
  const post = await canViewSocialPost(session.user.id, postId);
  if (!post) return fail("FORBIDDEN", "No puedes ver esta fotografía", 403);
  const photo = await prisma.attendancePhoto.findFirst({
    where: { id: photoId, attendance: { socialPost: { id: postId } } },
    select: { objectKey: true, mimeType: true },
  });
  if (!photo) return fail("NOT_FOUND", "Fotografía no encontrada", 404);
  try {
    const object = await getPrivateObject(photo.objectKey);
    return new Response(Buffer.from(object.body), {
      headers: {
        "content-type": object.contentType || photo.mimeType,
        "cache-control": "private, no-store",
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
