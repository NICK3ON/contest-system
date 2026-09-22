const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const describeWithDatabase = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeWithDatabase('participation flow', () => {
  let adminToken;
  let userToken;
  let userId;
  let contestId;
  let participationId;
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  beforeAll(async () => {
    await prisma.contest.deleteMany({ where: { name: { startsWith: 'Phase Four ' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'phase-four-' } } });
  });

  afterAll(async () => {
    if (contestId) await prisma.contest.deleteMany({ where: { id: contestId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('sets up an active contest and participant', async () => {
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com', password: 'ChangeMe123!',
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;

    const registration = await request(app).post('/api/auth/register').send({
      name: 'Phase Four User', email: `phase-four-${unique}@example.com`, password: 'TestPass123!',
    });
    expect(registration.status).toBe(201);
    userToken = registration.body.token;
    userId = registration.body.user.id;

    const contest = await request(app).post('/api/contests').set('Authorization', `Bearer ${adminToken}`).send({
      name: `Phase Four ${unique}`, description: 'Integration test contest', accessLevel: 'NORMAL',
      topic: 'Node.js', difficulty: 'INTERMEDIATE',
      startTime: new Date(Date.now() - 60_000).toISOString(), endTime: new Date(Date.now() + 600_000).toISOString(),
      prizeDescription: 'Test prize',
    });
    expect(contest.status).toBe(201);
    contestId = contest.body.contest.id;

    const single = await request(app).post(`/api/contests/${contestId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`).send({
        questionText: 'Which option is correct?', type: 'SINGLE_SELECT', difficulty: 'EASY', topic: 'Testing',
        options: [{ optionText: 'Correct', isCorrect: true }, { optionText: 'Wrong', isCorrect: false }],
      });
    expect(single.status).toBe(201);

    const multi = await request(app).post(`/api/contests/${contestId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`).send({
        questionText: 'Select both correct options.', type: 'MULTI_SELECT', difficulty: 'EASY', topic: 'Testing',
        options: [
          { optionText: 'First', isCorrect: true }, { optionText: 'Second', isCorrect: true },
          { optionText: 'Third', isCorrect: false },
        ],
      });
    expect(multi.status).toBe(201);

    const joined = await request(app).post(`/api/contests/${contestId}/join`).set('Authorization', `Bearer ${userToken}`);
    expect(joined.status).toBe(201);
    participationId = joined.body.participation.id;
  });

  it('does not expose correctness and scores exact sets', async () => {
    const questions = await request(app).get(`/api/contests/${contestId}/questions`).set('Authorization', `Bearer ${userToken}`);
    expect(questions.status).toBe(200);
    expect(JSON.stringify(questions.body)).not.toContain('isCorrect');

    const [single, multi] = questions.body.questions;
    const savedSingle = await request(app)
      .put(`/api/participations/${participationId}/answers/${single.id}`)
      .set('Authorization', `Bearer ${userToken}`).send({ selectedOptionIds: [single.options[0].id] });
    expect(savedSingle.status).toBe(200);
    expect(savedSingle.body.answer).not.toHaveProperty('isCorrect');

    const savedPartialMulti = await request(app)
      .put(`/api/participations/${participationId}/answers/${multi.id}`)
      .set('Authorization', `Bearer ${userToken}`).send({ selectedOptionIds: [multi.options[0].id] });
    expect(savedPartialMulti.status).toBe(200);

    const submissions = await Promise.all([
      request(app).post(`/api/participations/${participationId}/submit`).set('Authorization', `Bearer ${userToken}`),
      request(app).post(`/api/participations/${participationId}/submit`).set('Authorization', `Bearer ${userToken}`),
    ]);
    expect(submissions.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(submissions.find((response) => response.status === 200).body.participation.score).toBe(1);
  });
});
