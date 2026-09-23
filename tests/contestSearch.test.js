const { buildContestWhere } = require('../src/utils/contestSearch');

describe('buildContestWhere', () => {
  it('converts validated filters into Prisma conditions', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    expect(buildContestWhere({
      status: 'ACTIVE', accessLevel: 'VIP', topic: 'Node', keyword: 'foundations', difficulty: 'BEGINNER', prizeOnly: true,
    }, now)).toEqual({
      AND: [
        { startTime: { lte: now }, endTime: { gt: now } },
        { accessLevel: 'VIP' },
        { topic: { contains: 'Node', mode: 'insensitive' } },
        {
          OR: [
            { name: { contains: 'foundations', mode: 'insensitive' } },
            { description: { contains: 'foundations', mode: 'insensitive' } },
            { topic: { contains: 'foundations', mode: 'insensitive' } },
          ],
        },
        { difficulty: 'BEGINNER' },
        { prizeDescription: { not: '' } },
      ],
    });
  });
});
