import {
  calculateRoundScore,
  getForbiddenDealerBid,
  computeRoundResults,
  determineWinner,
} from '../src/game/Scoring';
import { PlayerScore } from '@oh-hell/shared';

describe('calculateRoundScore()', () => {
  it('returns 13 when bid=3 and taken=3 (exact bid)', () => {
    expect(calculateRoundScore(3, 3)).toBe(13);
  });

  it('returns 10 when bid=0 and taken=0 (zero bid success)', () => {
    expect(calculateRoundScore(0, 0)).toBe(10);
  });

  it('returns 0 when bid=2 and taken=0 (missed bid, no tricks)', () => {
    expect(calculateRoundScore(2, 0)).toBe(0);
  });

  it('returns 2 when bid=0 and taken=2 (busted zero bid)', () => {
    expect(calculateRoundScore(0, 2)).toBe(2);
  });

  it('returns 3 when bid=5 and taken=3 (missed bid, partial tricks)', () => {
    expect(calculateRoundScore(5, 3)).toBe(3);
  });

  it('returns 10 + tricks for any exact bid', () => {
    for (let n = 1; n <= 10; n++) {
      expect(calculateRoundScore(n, n)).toBe(10 + n);
    }
  });
});

describe('getForbiddenDealerBid()', () => {
  it('returns 2 when handSize=5, otherBids=[2,1] (forbidden = 5-3 = 2)', () => {
    expect(getForbiddenDealerBid(5, [2, 1])).toBe(2);
  });

  it('returns null when handSize=3, otherBids=[2,2] (forbidden = -1, out of range)', () => {
    expect(getForbiddenDealerBid(3, [2, 2])).toBeNull();
  });

  it('returns 3 when handSize=3, otherBids=[] (forbidden = 3, valid)', () => {
    expect(getForbiddenDealerBid(3, [])).toBe(3);
  });

  it('returns 0 when all other bids sum to handSize', () => {
    // handSize=4, otherBids=[2,2] → forbidden = 4-4 = 0
    expect(getForbiddenDealerBid(4, [2, 2])).toBe(0);
  });

  it('returns forbidden bid at boundary: handSize=3, otherBids=[0] → forbidden=3 (valid, equals handSize)', () => {
    // forbidden=3, handSize=3: 3 >= 0 && 3 <= 3 → returns 3
    expect(getForbiddenDealerBid(3, [0])).toBe(3);
  });
});

describe('computeRoundResults()', () => {
  const baseScores: PlayerScore[] = [
    { playerId: 'p1', username: 'Alice', totalScore: 5, roundScores: [5] },
    { playerId: 'p2', username: 'Bob', totalScore: 10, roundScores: [10] },
  ];

  it('computes correct roundScore for each player', () => {
    const bids = { p1: 2, p2: 0 };
    const tricksTaken = { p1: 2, p2: 1 };
    const { results } = computeRoundResults(bids, tricksTaken, baseScores);

    const p1Result = results.find((r) => r.playerId === 'p1')!;
    const p2Result = results.find((r) => r.playerId === 'p2')!;

    // p1: bid=2, taken=2 → exact → 10+2=12
    expect(p1Result.roundScore).toBe(12);
    // p2: bid=0, taken=1 → missed → 1
    expect(p2Result.roundScore).toBe(1);
  });

  it('returns updated total scores', () => {
    const bids = { p1: 2, p2: 0 };
    const tricksTaken = { p1: 2, p2: 1 };
    const { updatedScores } = computeRoundResults(bids, tricksTaken, baseScores);

    const p1Score = updatedScores.find((s) => s.playerId === 'p1')!;
    const p2Score = updatedScores.find((s) => s.playerId === 'p2')!;

    // p1: was 5, added 12 → 17
    expect(p1Score.totalScore).toBe(17);
    // p2: was 10, added 1 → 11
    expect(p2Score.totalScore).toBe(11);
  });

  it('appends the round score to roundScores array', () => {
    const bids = { p1: 3, p2: 0 };
    const tricksTaken = { p1: 3, p2: 0 };
    const { updatedScores } = computeRoundResults(bids, tricksTaken, baseScores);

    const p1Score = updatedScores.find((s) => s.playerId === 'p1')!;
    const p2Score = updatedScores.find((s) => s.playerId === 'p2')!;

    expect(p1Score.roundScores).toEqual([5, 13]);
    expect(p2Score.roundScores).toEqual([10, 10]);
  });

  it('does not mutate the original currentScores array', () => {
    const bids = { p1: 1, p2: 1 };
    const tricksTaken = { p1: 1, p2: 1 };
    const originalTotalP1 = baseScores[0].totalScore;
    computeRoundResults(bids, tricksTaken, baseScores);
    expect(baseScores[0].totalScore).toBe(originalTotalP1);
  });

  it('includes username in results', () => {
    const bids = { p1: 0, p2: 0 };
    const tricksTaken = { p1: 0, p2: 0 };
    const { results } = computeRoundResults(bids, tricksTaken, baseScores);
    expect(results.find((r) => r.playerId === 'p1')?.username).toBe('Alice');
    expect(results.find((r) => r.playerId === 'p2')?.username).toBe('Bob');
  });
});

describe('determineWinner()', () => {
  it('returns the player with the highest total score', () => {
    const scores: PlayerScore[] = [
      { playerId: 'p1', username: 'Alice', totalScore: 30, roundScores: [] },
      { playerId: 'p2', username: 'Bob', totalScore: 55, roundScores: [] },
      { playerId: 'p3', username: 'Carol', totalScore: 45, roundScores: [] },
    ];
    expect(determineWinner(scores)).toBe('p2');
  });

  it('returns the first player in the array when there is a tie', () => {
    const scores: PlayerScore[] = [
      { playerId: 'p1', username: 'Alice', totalScore: 50, roundScores: [] },
      { playerId: 'p2', username: 'Bob', totalScore: 50, roundScores: [] },
    ];
    // reduce keeps 'p1' because p2.totalScore is NOT strictly greater
    expect(determineWinner(scores)).toBe('p1');
  });

  it('returns the sole player when only one player exists', () => {
    const scores: PlayerScore[] = [
      { playerId: 'p1', username: 'Alice', totalScore: 20, roundScores: [] },
    ];
    expect(determineWinner(scores)).toBe('p1');
  });

  it('throws when no players are provided', () => {
    expect(() => determineWinner([])).toThrow('No players to determine winner');
  });
});
