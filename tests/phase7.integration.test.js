const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const describeWithDatabase = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeWithDatabase('role access and deadline edge cases', () => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const contestIds = [];
  const userIds = [];
  let adminToken;
  let userToken;
  let vipToken;
  let vipContest;
  let deadlineContest;
  let deadlineQuestion;

  beforeAll(async () => {
    await prisma.contest.deleteMany({ where: { name: { startsWith: 'Phase Seven ' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'phase-seven-' } } });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com', password: 'ChangeMe123!',
    });
    adminToken = adminLogin.body.token;

    const userRegistration = await request(app).post('/api/auth/register').send({
      name: 'Standard User', email: `phase-seven-user-${unique}@example.com`, password: 'TestPass123!',
    });
    userToken = userRegistration.body.token;
    userIds.push(userRegistration.body.user.id);

    const vipRegistration = await request(app).post('/api/auth/register').send({
      name: 'VIP User', email: `phase-seven-vip-${unique}@example.com`, password: 'TestPass123!',
    });
    vipToken = vipRegistration.body.token;
    userIds.push(vipRegistration.body.user.id);
    await prisma.user.update({ where: { id: vipRegistration.body.user.id }, data: { role: 'VIP' } });

    const common = {
      description: 'Phase 7 integration test', topic: 'Security', difficulty: 'INTERMEDIATE',
      startTime: new Date(Date.now() - 60_000), endTime: new Date(Date.now() + 600_000),
      prizeDescription: 'Test prize', createdById: adminLogin.body.user.id,
    };
    vipContest = await prisma.contest.create({ data: { ...common, name: `Phase Seven VIP ${unique}`, accessLevel: 'VIP' } });
    contestIds.push(vipContest.id);

    deadlineContest = await prisma.contest.create({
      data: {
        ...common, name: `Phase Seven Deadline ${unique}`, accessLevel: 'NORMAL',
        questions: {
          create: {
            questionText: 'Is server time authoritative?', type: 'TRUE_FALSE', topic: 'Security', difficulty: 'BEGINNER',
            options: { create: [{ optionText: 'True', isCorrect: true }, { optionText: 'False', isCorrect: false }] },
          },
        },
      },
      include: { questions: { include: { options: true } } },
    });
    deadlineQuestion = deadlineContest.questions[0];
    contestIds.push(deadlineContest.id);
  });

  afterAll(async () => {
    await prisma.contest.deleteMany({ where: { id: { in: contestIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('enforces ADMIN, USER, and VIP participation rules', async () => {
    const adminJoin = await request(app).post(`/api/contests/${vipContest.id}/join`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminJoin.status).toBe(403);

    const userJoin = await request(app).post(`/api/contests/${vipContest.id}/join`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(userJoin.status).toBe(403);

    const vipJoin = await request(app).post(`/api/contests/${vipContest.id}/join`)
      .set('Authorization', `Bearer ${vipToken}`);
    expect(vipJoin.status).toBe(201);
  });

  it('rejects non-standard contest difficulty values', async () => {
    const response = await request(app).post('/api/contests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Phase Seven Invalid Difficulty ${unique}`,
        description: 'Should fail validation',
        accessLevel: 'NORMAL',
        topic: 'Validation',
        difficulty: 'EASY',
        startTime: new Date(Date.now() + 60_000).toISOString(),
        endTime: new Date(Date.now() + 120_000).toISOString(),
        prizeDescription: 'None',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('keeps a saved answer valid while rejecting changes after the deadline', async () => {
    const joined = await request(app).post(`/api/contests/${deadlineContest.id}/join`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(joined.status).toBe(201);
    const participationId = joined.body.participation.id;
    const correctOption = deadlineQuestion.options.find((option) => option.isCorrect);

    const saved = await request(app)
      .put(`/api/participations/${participationId}/answers/${deadlineQuestion.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ selectedOptionIds: [correctOption.id] });
    expect(saved.status).toBe(200);
    expect(saved.body.answer).not.toHaveProperty('isCorrect');

    await prisma.contest.update({
      where: { id: deadlineContest.id },
      data: { endTime: new Date(new Date(saved.body.answer.answeredAt).getTime() + 1) },
    });

    const lateChange = await request(app)
      .put(`/api/participations/${participationId}/answers/${deadlineQuestion.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ selectedOptionIds: [correctOption.id] });
    expect(lateChange.status).toBe(409);

    const submitted = await request(app).post(`/api/participations/${participationId}/submit`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.participation).toMatchObject({ status: 'SUBMITTED', score: 1 });
  });
});
