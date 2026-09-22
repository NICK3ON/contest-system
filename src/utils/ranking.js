function completionTimeMs(participation) {
  return new Date(participation.submittedAt).getTime() - new Date(participation.startedAt).getTime();
}

function rankParticipations(participations) {
  return participations
    .map((participation) => ({ ...participation, completionTimeMs: completionTimeMs(participation) }))
    .sort((left, right) => {
      const scoreDifference = (right.score || 0) - (left.score || 0);
      if (scoreDifference !== 0) return scoreDifference;
      const timeDifference = left.completionTimeMs - right.completionTimeMs;
      if (timeDifference !== 0) return timeDifference;
      return left.id.localeCompare(right.id);
    })
    .map((participation, index) => ({ ...participation, rank: index + 1 }));
}

module.exports = { completionTimeMs, rankParticipations };
