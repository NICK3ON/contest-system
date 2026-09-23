const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const env = require('../src/config/env');

const describeWithDatabase = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeWithDatabase('Gemini contest search and question generation', () => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const originalFetch = global.fetch;
  const originalApiKey = env.geminiApiKey;
  let adminToken;
  let contest;

  function mockGemini(output) {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }),
    });
  }

  beforeAll(async () => {
    env.geminiApiKey = 'integration-test-key';
    global.fetch = jest.fn();
    await prisma.contest.deleteMany({ where: { name: { startsWith: 'Phase Six ' } } });

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com', password: 'ChangeMe123!',
    });
    adminToken = login.body.token;
    contest = await prisma.contest.create({
      data: {
        name: `Phase Six ${unique}`, description: 'AI integration test', accessLevel: 'VIP',
        topic: 'Node.js', difficulty: 'BEGINNER', startTime: new Date(Date.now() - 60_000),
        endTime: new Date(Date.now() + 600_000), prizeDescription: 'Certificate', createdById: login.body.user.id,
        questions: {
          create: {
            questionText: 'Which runtime executes JavaScript outside a browser?', type: 'SINGLE_SELECT',
            topic: 'Node.js', difficulty: 'BEGINNER',
            options: { create: [{ optionText: 'Node.js', isCorrect: true }, { optionText: 'CSS', isCorrect: false }] },
          },
        },
      },
    });
  });

  afterAll(async () => {
    if (contest) await prisma.contest.deleteMany({ where: { id: contest.id } });
    env.geminiApiKey = originalApiKey;
    global.fetch = originalFetch;
    await prisma.$disconnect();
  });

  it('validates Gemini filters and uses Prisma for natural-language search', async () => {
    mockGemini({ status: 'ACTIVE', accessLevel: 'VIP', topic: 'node', keyword: 'integration' });
    const response = await request(app).post('/api/contests/search').send({ query: 'active VIP Node contests' });

    expect(response.status).toBe(200);
    expect(response.body.filters).toEqual({ status: 'ACTIVE', accessLevel: 'VIP', topic: 'node', keyword: 'integration' });
    expect(response.body.contests.some((entry) => entry.id === contest.id)).toBe(true);
    const requestBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(requestBody.generationConfig.responseMimeType).toBe('application/json');
  });

  it('falls back to an exact free-text match across contest names', async () => {
    mockGemini({ topic: 'does-not-match' });
    const response = await request(app).post('/api/contests/search').send({ query: contest.name });

    expect(response.status).toBe(200);
    expect(response.body.fallbackKeyword).toBe(contest.name);
    expect(response.body.contests.some((entry) => entry.id === contest.id)).toBe(true);
  });

  it('validates generated questions and skips normalized duplicates before insertion', async () => {
    mockGemini({
      questions: [
        {
          questionText: '  Which runtime executes JavaScript outside a browser? ', type: 'SINGLE_SELECT',
          topic: 'ignored', difficulty: 'ADVANCED',
          options: [{ optionText: 'Node.js', isCorrect: true }, { optionText: 'CSS', isCorrect: false }],
        },
        {
          questionText: 'Node.js uses an event loop.', type: 'TRUE_FALSE', topic: 'ignored', difficulty: 'ADVANCED',
          explanation: 'The event loop coordinates asynchronous work.',
          options: [{ optionText: 'True', isCorrect: true }, { optionText: 'False', isCorrect: false }],
        },
      ],
    });
    const response = await request(app).post(`/api/contests/${contest.id}/questions/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 2, questionTypes: ['SINGLE_SELECT', 'TRUE_FALSE'] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ generatedCount: 1, skippedDuplicates: 1 });
    expect(response.body.questions[0]).toMatchObject({ topic: 'Node.js', difficulty: 'BEGINNER', type: 'TRUE_FALSE' });
  });

  it('shows answer keys to admins when listing contest questions', async () => {
    const response = await request(app).get(`/api/contests/${contest.id}/questions`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.questions.length).toBeGreaterThan(0);
    expect(response.body.questions[0].options[0]).toHaveProperty('isCorrect');
  });
});
