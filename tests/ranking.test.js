const { rankParticipations } = require('../src/utils/ranking');

describe('rankParticipations', () => {
  it('orders by score, completion duration, then ID', () => {
    const ranked = rankParticipations([
      { id: 'c', score: 4, startedAt: new Date(0), submittedAt: new Date(1_000) },
      { id: 'b', score: 5, startedAt: new Date(0), submittedAt: new Date(2_000) },
      { id: 'a', score: 5, startedAt: new Date(0), submittedAt: new Date(2_000) },
      { id: 'd', score: 5, startedAt: new Date(0), submittedAt: new Date(1_000) },
    ]);

    expect(ranked.map((entry) => entry.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3, 4]);
    expect(ranked[0].completionTimeMs).toBe(1_000);
  });
});
