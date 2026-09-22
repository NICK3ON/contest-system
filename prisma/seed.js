const bcrypt = require('bcrypt');
const prisma = require('../src/lib/prisma');

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'System Admin', email: 'admin@example.com', passwordHash, role: 'ADMIN' },
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
  console.log('Seed complete. Development admin: admin@example.com / ChangeMe123!');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
