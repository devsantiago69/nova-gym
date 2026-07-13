import argon2 from "argon2";
import { prisma } from "../src/index.js";

const DEMO_PASSWORD = "NovaGym2026Demo!";
const DEMO_CHALLENGE_ID = "7d7736f2-5f54-4d54-a91d-e44a72d04731";

async function ensureFriendship(requesterId: string, addresseeId: string) {
  const existing = await prisma.friendship.findFirst({
    where: { OR: [{ requesterId, addresseeId }, { requesterId: addresseeId, addresseeId: requesterId }] },
  });
  if (existing) return prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
  return prisma.friendship.create({ data: { requesterId, addresseeId, status: "ACCEPTED" } });
}

async function main() {
  const santiago = await prisma.user.findUniqueOrThrow({ where: { username: "santiago" } });
  const category = await prisma.challengeCategory.findFirstOrThrow({ where: { status: "ACTIVE", durationDays: 15 } });
  const photoTemplates = await prisma.attendancePhoto.findMany({ orderBy: { createdAt: "desc" }, take: 2 });
  if (photoTemplates.length === 0) throw new Error("No existen fotografías para preparar las historias demo.");

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
  const demoPeople = [
    { username: "mateo.fit", email: "mateo.fit@demo.novagym.local", firstName: "Mateo", lastName: "Ríos", whatsappNumber: "+573001110101", day: 11 },
    { username: "vale.gym", email: "vale.gym@demo.novagym.local", firstName: "Valentina", lastName: "López", whatsappNumber: "+573001110102", day: 12 },
  ];

  const users = [];
  for (const person of demoPeople) {
    const user = await prisma.user.upsert({
      where: { username: person.username },
      update: { status: "ACTIVE", deletedAt: null },
      create: {
        username: person.username,
        email: person.email,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
        whatsappNumber: person.whatsappNumber,
        countryCode: "57",
        passwordChangedAt: new Date(),
      },
    });
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { firstName: person.firstName, lastName: person.lastName, bio: "Entrenando con el equipo Nova Gym." },
      create: { userId: user.id, firstName: person.firstName, lastName: person.lastName, bio: "Entrenando con el equipo Nova Gym." },
    });
    await ensureFriendship(santiago.id, user.id);

    const localDate = new Date(Date.UTC(2026, 6, person.day));
    const attendance = await prisma.attendance.upsert({
      where: { userId_localDate: { userId: user.id, localDate } },
      update: { status: "COMPLETED", durationMinutes: 64, startLatitude: 4.116455, startLongitude: -73.618454, startAccuracyMeters: 28 },
      create: {
        userId: user.id,
        localDate,
        timezone: "America/Bogota",
        status: "COMPLETED",
        startedAt: new Date(Date.UTC(2026, 6, person.day, 11, 0)),
        finishedAt: new Date(Date.UTC(2026, 6, person.day, 12, 4)),
        durationMinutes: 64,
        startLatitude: 4.116455,
        startLongitude: -73.618454,
        startAccuracyMeters: 28,
        endLatitude: 4.116461,
        endLongitude: -73.618449,
        endAccuracyMeters: 24,
      },
    });

    for (const [index, template] of photoTemplates.entries()) {
      const type = index === 0 ? "START" : "END";
      await prisma.attendancePhoto.upsert({
        where: { attendanceId_type: { attendanceId: attendance.id, type } },
        update: {},
        create: {
          attendanceId: attendance.id,
          ownerId: user.id,
          type,
          objectKey: template.objectKey,
          mimeType: template.mimeType,
          sizeBytes: template.sizeBytes,
          checksum: template.checksum,
          width: template.width,
          height: template.height,
        },
      });
    }
    users.push({ user, attendance });
  }

  const startsAt = new Date(Date.UTC(2026, 6, 10, 5));
  const endsAt = new Date(Date.UTC(2026, 6, 25, 4, 59, 59));
  const challenge = await prisma.challenge.upsert({
    where: { id: DEMO_CHALLENGE_ID },
    update: { status: "ACTIVE", categoryId: category.id, startsAt, endsAt, acceptedAt: startsAt },
    create: {
      id: DEMO_CHALLENGE_ID,
      categoryId: category.id,
      creatorId: santiago.id,
      status: "ACTIVE",
      message: "Equipo demo: constancia de 15 días",
      startsAt,
      endsAt,
      acceptedAt: startsAt,
    },
  });

  for (const participant of [santiago, ...users.map(({ user }) => user)]) {
    await prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId: challenge.id, userId: participant.id } },
      update: { acceptedAt: startsAt },
      create: { challengeId: challenge.id, userId: participant.id, acceptedAt: startsAt },
    });
  }

  for (const { user, attendance } of users) {
    const score = await prisma.challengeScoreEvent.upsert({
      where: { challengeId_userId_attendanceId: { challengeId: challenge.id, userId: user.id, attendanceId: attendance.id } },
      update: {},
      create: {
        challengeId: challenge.id,
        userId: user.id,
        attendanceId: attendance.id,
        points: category.pointsPerAttendance,
        idempotencyKey: `social-demo:${challenge.id}:${user.id}:${attendance.id}`,
      },
    });
    await prisma.challengeParticipant.update({
      where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
      data: { score: score.points },
    });
  }

  console.log(JSON.stringify({
    user: santiago.username,
    challenge: challenge.id,
    friends: users.map(({ user }) => user.username),
    demoPassword: DEMO_PASSWORD,
    stories: users.length,
  }, null, 2));
}

main().finally(async () => prisma.$disconnect());
