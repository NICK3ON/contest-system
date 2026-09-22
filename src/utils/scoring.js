function isExactAnswerCorrect(options, selectedOptionIds) {
  if (!Array.isArray(selectedOptionIds)) return false;

  const selected = new Set(selectedOptionIds);
  if (selected.size !== selectedOptionIds.length) return false;

  const correct = options.filter((option) => option.isCorrect).map((option) => option.id);
  return selected.size === correct.length && correct.every((optionId) => selected.has(optionId));
}

module.exports = { isExactAnswerCorrect };
