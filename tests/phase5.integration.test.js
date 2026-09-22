const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

const describeWithDatabase = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeWithDatabase('leaderboards, history, and prize finalization', () => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const contestIds = [];
  const userIds = [];
  let adminToken;
  let fasterUser;
  let fasterToken;
  let slowerUser;
  let endedContest;

  beforeAll(async () => {
    await prisma.contest.deleteMany({ where: { name: { startsWith: 'Phase Five ' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'phase-five-' } } });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com', password: 'ChangeMe123!',
    });
    adminToken = adminLogin.body.token;
    const adminId = adminLogin.body.user.id;

    const fasterRegistration = await request(app).post('/api/auth/register').send({
      name: 'Fast Finisher', email: `phase-five-fast-${unique}@example.com`, password: 'TestPass123!',
    });
    fasterUser = fasterRegistration.body.user;
    fasterToken = fasterRegistration.body.token;
    userIds.push(fasterUser.id);

    const slowerRegistration = await request(app).post('/api/auth/register').send({
      name: 'Slow Finisher', email: `phase-five-slow-${unique}@example.com`, password: 'TestPass123!',
    });
    slowerUser = slowerRegistration.body.user;
    userIds.push(slowerUser.id);

    const base = Date.now() - 3_600_000;
    endedContest = await prisma.contest.create({
      data: {
        name: `Phase Five Ended ${unique}`, description: 'Leaderboard integration test', accessLevel: 'NORMAL',
        topic: 'Testing', difficulty: 'INTERMEDIATE', startTime: new Date(base), endTime: new Date(base + 600_000),
        prizeDescription: 'Winner certificate', createdById: adminId,
      },
    });
    contestIds.push(endedContest.id);

    await prisma.participation.createMany({
      data: [
        {
          userId: slowerUser.id, contestId: endedContest.id, status: 'SUBMITTED', score: 5,
          startedAt: new Date(base), submittedAt: new Date(base + 300_000),
        },
        {
          userId: fasterUser.id, contestId: endedContest.id, status: 'SUBMITTED', score: 5,
          startedAt: new Date(base), submittedAt: new Date(base + 120_000),
        },
      ],
    });

    const activeContest = await prisma.contest.create({
      data: {
        name: `Phase Five Active ${unique}`, description: 'In-progress integration test', accessLevel: 'NORMAL',
        topic: 'Testing', difficulty: 'EASY', startTime: new Date(Date.now() - 60_000),
        endTime: new Date(Date.now() + 600_000), prizeDescription: 'Test prize', createdById: adminId,
      },
    });
    contestIds.push(activeContest.id);
    await prisma.participation.create({ data: { userId: fasterUser.id, contestId: activeContest.id } });
  });

  afterAll(async () => {
    await prisma.contest.deleteMany({ where: { id: { in: contestIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('uses score and fastest completion for the contest leaderboard', async () => {
    const response = await request(app).get(`/api/contests/${endedContest.id}/leaderboard`);
    expect(response.status).toBe(200);
    expect(response.body.leaderboard.map((entry) => entry.user.id)).toEqual([fasterUser.id, slowerUser.id]);
    expect(response.body.leaderboard[0]).toMatchObject({ rank: 1, score: 5, completionTimeMs: 120_000 });
  });

  it('builds the global leaderboard from submitted participations', async () => {
    const response = await request(app).get('/api/leaderboard');
    expect(response.status).toBe(200);
    const testEntries = response.body.leaderboard.filter((entry) => userIds.includes(entry.user.id));
    expect(testEntries).toHaveLength(2);
    expect(testEntries.every((entry) => entry.totalScore === 5 && entry.submittedContests === 1)).toBe(true);
  });

  it('returns history and in-progress contests for the authenticated user', async () => {
    const history = await request(app).get('/api/users/me/history').set('Authorization', `Bearer ${fasterToken}`);
    expect(history.status).toBe(200);
    expect(history.body.participations).toHaveLength(2);

    const inProgress = await request(app).get('/api/users/me/in-progress').set('Authorization', `Bearer ${fasterToken}`);
    expect(inProgress.status).toBe(200);
    expect(inProgress.body.participations).toHaveLength(1);
    expect(inProgress.body.participations[0].status).toBe('IN_PROGRESS');
  });

  it('awards one prize to the fastest tied participant under concurrent finalization', async () => {
    const responses = await Promise.all([
      request(app).post(`/api/contests/${endedContest.id}/finalize`).set('Authorization', `Bearer ${adminToken}`),
      request(app).post(`/api/contests/${endedContest.id}/finalize`).set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    expect(responses.every((response) => response.body.prize.user.id === fasterUser.id)).toBe(true);

    const prizes = await request(app).get('/api/users/me/prizes').set('Authorization', `Bearer ${fasterToken}`);
    expect(prizes.status).toBe(200);
    expect(prizes.body.prizes).toHaveLength(1);
    expect(prizes.body.prizes[0].contest.id).toBe(endedContest.id);
  });
});
