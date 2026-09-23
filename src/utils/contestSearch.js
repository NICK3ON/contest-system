function buildContestWhere(filters, now = new Date()) {
  const conditions = [];

  if (filters.status === 'ACTIVE') conditions.push({ startTime: { lte: now }, endTime: { gt: now } });
  if (filters.status === 'UPCOMING') conditions.push({ startTime: { gt: now } });
  if (filters.status === 'ENDED') conditions.push({ endTime: { lte: now } });
  if (filters.accessLevel) conditions.push({ accessLevel: filters.accessLevel });
  if (filters.topic) conditions.push({ topic: { contains: filters.topic, mode: 'insensitive' } });
  if (filters.difficulty) conditions.push({ difficulty: filters.difficulty });
  if (filters.prizeOnly) conditions.push({ prizeDescription: { not: '' } });
  if (filters.startsFrom) conditions.push({ startTime: { gte: new Date(filters.startsFrom) } });
  if (filters.startsTo) conditions.push({ startTime: { lte: new Date(filters.startsTo) } });

  return conditions.length ? { AND: conditions } : {};
}

module.exports = { buildContestWhere };
