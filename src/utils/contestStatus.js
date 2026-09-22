function getContestStatus(contest, now = new Date()) {
  if (now < new Date(contest.startTime)) return 'UPCOMING';
  if (now >= new Date(contest.endTime)) return 'ENDED';
  return 'ACTIVE';
}

module.exports = { getContestStatus };
