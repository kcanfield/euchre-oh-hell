import { PlayerScore, RoundResult } from '@oh-hell/shared';

/**
 * Scoring rules for Oh Hell!:
 *  - Exact bid: 10 + tricks taken
 *  - Failed bid: 1 point per trick (no bonus)
 *  - Zero bid success: 10 points (covered by exact bid rule: 10 + 0 = 10)
 */
export function calculateRoundScore(bid: number, tricksTaken: number): number {
  if (bid === tricksTaken) {
    return 10 + tricksTaken;
  }
  return tricksTaken; // 1 point per trick, no bonus
}

/**
 * Computes round results and returns updated PlayerScore array.
 */
export function computeRoundResults(
  bids: Record<string, number>,
  tricksTaken: Record<string, number>,
  currentScores: PlayerScore[],
): { results: RoundResult[]; updatedScores: PlayerScore[] } {
  const results: RoundResult[] = currentScores.map((ps) => {
    const bid = bids[ps.playerId] ?? 0;
    const tricks = tricksTaken[ps.playerId] ?? 0;
    const roundScore = calculateRoundScore(bid, tricks);
    return {
      playerId: ps.playerId,
      username: ps.username,
      bid,
      tricksTaken: tricks,
      roundScore,
    };
  });

  const updatedScores: PlayerScore[] = currentScores.map((ps) => {
    const result = results.find((r) => r.playerId === ps.playerId)!;
    return {
      ...ps,
      totalScore: ps.totalScore + result.roundScore,
      roundScores: [...ps.roundScores, result.roundScore],
    };
  });

  return { results, updatedScores };
}

/**
 * Screw the Dealer: the dealer cannot place a bid that would make
 * the total bids equal the number of tricks available (handSize).
 * Returns the forbidden bid value, or null if all bids are allowed.
 */
export function getForbiddenDealerBid(
  handSize: number,
  otherBids: number[],
): number | null {
  const otherTotal = otherBids.reduce((sum, b) => sum + b, 0);
  const forbidden = handSize - otherTotal;
  // forbidden must be a valid bid (0 to handSize)
  if (forbidden >= 0 && forbidden <= handSize) {
    return forbidden;
  }
  return null;
}

/**
 * Returns the winner (highest total score) among all players at game end.
 * Ties are broken by whoever appears first in the scores array (insertion order).
 */
export function determineWinner(scores: PlayerScore[]): string {
  if (scores.length === 0) throw new Error('No players to determine winner');
  return scores.reduce((best, current) =>
    current.totalScore > best.totalScore ? current : best,
  ).playerId;
}
