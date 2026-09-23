const { questionSchema } = require('../src/validation/question.schemas');

const baseQuestion = {
  questionText: 'Which level is standardized?',
  type: 'SINGLE_SELECT',
  topic: 'Validation',
  options: [
    { optionText: 'Beginner', isCorrect: true },
    { optionText: 'Custom', isCorrect: false },
  ],
};

describe('difficulty validation', () => {
  it.each(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])('accepts %s', (difficulty) => {
    expect(questionSchema.safeParse({ ...baseQuestion, difficulty }).success).toBe(true);
  });

  it('rejects custom difficulty text', () => {
    expect(questionSchema.safeParse({ ...baseQuestion, difficulty: 'EASY' }).success).toBe(false);
  });
});
