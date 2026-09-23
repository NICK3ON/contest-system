const bcrypt = require('bcrypt');
const prisma = require('../src/lib/prisma');

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'System Admin', email: 'admin@example.com', passwordHash, role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'vip@example.com' },
    update: {},
    create: { name: 'Development VIP', email: 'vip@example.com', passwordHash, role: 'VIP' },
  });
  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: { name: 'Development User', email: 'user@example.com', passwordHash, role: 'USER' },
  });

  const now = new Date();
  const activeStart = new Date(now.getTime() - 60 * 60 * 1000);
  const activeEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await prisma.contest.upsert({
    where: { id: 'seed-active-node-contest' },
    update: {},
    create: {
      id: 'seed-active-node-contest', name: 'Node.js Foundations', description: 'A short seeded contest for local development.',
      accessLevel: 'NORMAL', topic: 'Node.js', difficulty: 'BEGINNER', startTime: activeStart, endTime: activeEnd,
      prizeDescription: 'Certificate of achievement', createdById: admin.id,
    },
  });
  console.log('Seed complete. Development users use password ChangeMe123!: admin@example.com, vip@example.com, user@example.com');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
