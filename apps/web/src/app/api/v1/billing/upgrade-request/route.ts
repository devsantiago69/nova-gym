import { getServerSession } from "next-auth";
import { prisma } from "@gymchallenge/database";
import { authOptions } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return fail("UNAUTHORIZED", "Debes iniciar sesión", 401);
  const payload = (await request.json().catch(() => null)) as {
    planId?: string;
    paymentMethod?: string;
  } | null;
  if (
    !payload?.planId ||
    !["CARD", "PSE", "NEQUI"].includes(payload.paymentMethod ?? "")
  )
    return fail("VALIDATION_ERROR", "Selecciona un método de pago", 422);
  const plan = await prisma.plan.findFirst({
    where: { id: payload.planId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!plan)
    return fail("PLAN_NOT_FOUND", "El plan ya no está disponible", 404);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      username: true,
      profile: { select: { firstName: true, lastName: true } },
    },
  });
  const name =
    `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() ||
    user.username;
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
    select: { id: true },
  });
  const requestId = crypto.randomUUID();
  await prisma
    .$transaction([
      ...admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            actorId: session.user.id,
            type: "SYSTEM",
            title: "Solicitud de mejora de plan",
            body: `${name} quiere activar ${plan.name} mediante ${payload.paymentMethod}.`,
            href: "/admin/usuarios",
            data: {
              requestId,
              planId: plan.id,
              paymentMethod: payload.paymentMethod,
            },
            dedupeKey: `upgrade:${session.user.id}:${plan.id}:${new Date().toISOString().slice(0, 10)}`,
          },
        }),
      ),
      prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "PLAN_UPGRADE_REQUESTED",
          entityType: "Plan",
          entityId: plan.id,
          correlationId: requestId,
          newValues: { paymentMethod: payload.paymentMethod },
        },
      }),
    ])
    .catch(async (error) => {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      )
        return;
      throw error;
    });
  return ok(
    { requestId },
    "Solicitud recibida. Te avisaremos antes de realizar cualquier cobro.",
  );
}
