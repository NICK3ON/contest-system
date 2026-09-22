const { buildContestWhere } = require('../src/utils/contestSearch');

describe('buildContestWhere', () => {
  it('converts validated filters into Prisma conditions', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    expect(buildContestWhere({ status: 'ACTIVE', accessLevel: 'VIP', topic: 'Node', prizeOnly: true }, now)).toEqual({
      AND: [
        { startTime: { lte: now }, endTime: { gt: now } },
        { accessLevel: 'VIP' },
        { topic: { contains: 'Node', mode: 'insensitive' } },
        { prizeDescription: { not: '' } },
      ],
    });
  });
});
