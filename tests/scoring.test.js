const { isExactAnswerCorrect } = require('../src/utils/scoring');

const options = [
  { id: 'a', isCorrect: true },
  { id: 'b', isCorrect: false },
  { id: 'c', isCorrect: true },
];

describe('isExactAnswerCorrect', () => {
  it('accepts an exact set regardless of order', () => {
    expect(isExactAnswerCorrect(options, ['c', 'a'])).toBe(true);
  });

  it('rejects a partial selection', () => {
    expect(isExactAnswerCorrect(options, ['a'])).toBe(false);
  });

  it('rejects a selection containing an extra option', () => {
    expect(isExactAnswerCorrect(options, ['a', 'b', 'c'])).toBe(false);
  });

  it('rejects duplicate selected IDs', () => {
    expect(isExactAnswerCorrect(options, ['a', 'c', 'c'])).toBe(false);
  });
});
