import { Card, Rank, Suit } from '@oh-hell/shared';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const RANKS: Rank[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10',
  'J', 'Q', 'K', 'A',
];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle — returns a new shuffled array, does not mutate input.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals `handSize` cards to each player from a shuffled deck.
 * Returns:
 *   - hands: a map of playerId → Card[]
 *   - trumpCard: the next card after all hands are dealt (or null if no cards remain)
 *   - remainingDeck: the rest of the deck after dealing + trump card
 */
export function dealCards(
  deck: Card[],
  playerIds: string[],
  handSize: number,
): { hands: Record<string, Card[]>; trumpCard: Card | null; remainingDeck: Card[] } {
  const totalCardsNeeded = playerIds.length * handSize;
  if (deck.length < totalCardsNeeded) {
    throw new Error(
      `Not enough cards: need ${totalCardsNeeded}, have ${deck.length}`,
    );
  }

  const hands: Record<string, Card[]> = {};
  for (const id of playerIds) {
    hands[id] = [];
  }

  // Deal one card at a time, round-robin
  let index = 0;
  for (let card = 0; card < handSize; card++) {
    for (const id of playerIds) {
      hands[id].push(deck[index++]);
    }
  }

  const trumpCard = deck[index] ?? null;
  const remainingDeck = deck.slice(index + (trumpCard ? 1 : 0));

  return { hands, trumpCard, remainingDeck };
}

export { SUITS, RANKS, RANK_VALUES };
