/**
 * Calculates the round schedule for Oh Hell!
 *
 * maxHandSize = min(10, floor(51 / playerCount))
 * Schedule: [max, max-1, ..., 2, 1, 2, ..., max]
 * Total rounds: (maxHandSize - 1) * 2 + 1
 *
 * Examples:
 *  3–5 players → maxHandSize 10, 19 rounds
 *  6 players   → maxHandSize  8, 15 rounds
 *  7 players   → maxHandSize  7, 13 rounds
 */
export function getMaxHandSize(playerCount: number): number {
  if (playerCount < 2) throw new Error('At least 2 players are required');
  return Math.min(10, Math.floor(51 / playerCount));
}

export function buildRoundSchedule(playerCount: number): number[] {
  const max = getMaxHandSize(playerCount);

  const descending: number[] = [];
  for (let h = max; h >= 1; h--) {
    descending.push(h);
  }

  const ascending: number[] = [];
  for (let h = 2; h <= max; h++) {
    ascending.push(h);
  }

  return [...descending, ...ascending];
}

export function getTotalRounds(playerCount: number): number {
  return buildRoundSchedule(playerCount).length;
}
