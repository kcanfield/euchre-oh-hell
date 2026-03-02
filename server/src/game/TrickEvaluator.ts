import { Card, Suit, TrickCard } from '@oh-hell/shared';
import { getRankValue } from './Deck';

/**
 * Determines the winner of a trick.
 *
 * Rules:
 *  1. If any trump cards were played, the highest-ranked trump wins.
 *  2. Otherwise, the highest-ranked card of the led suit wins.
 */
export function evaluateTrick(trick: TrickCard[], trumpSuit: Suit | null): string {
  if (trick.length === 0) throw new Error('Cannot evaluate an empty trick');

  const ledSuit = trick[0].card.suit;

  let winner = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const challenger = trick[i];
    if (beats(challenger.card, winner.card, ledSuit, trumpSuit)) {
      winner = challenger;
    }
  }

  return winner.playerId;
}

/**
 * Returns true if `challenger` beats `current` given the led suit and trump.
 */
function beats(
  challenger: Card,
  current: Card,
  ledSuit: Suit,
  trumpSuit: Suit | null,
): boolean {
  const challengerIsTrump = trumpSuit !== null && challenger.suit === trumpSuit;
  const currentIsTrump = trumpSuit !== null && current.suit === trumpSuit;

  if (challengerIsTrump && !currentIsTrump) return true;
  if (!challengerIsTrump && currentIsTrump) return false;

  // Both trump or both non-trump
  if (challengerIsTrump && currentIsTrump) {
    return getRankValue(challenger.rank) > getRankValue(current.rank);
  }

  // Neither is trump — challenger must be led suit to beat current
  if (challenger.suit === ledSuit && current.suit !== ledSuit) return true;
  if (challenger.suit !== ledSuit && current.suit === ledSuit) return false;

  // Same suit — higher rank wins
  if (challenger.suit === current.suit) {
    return getRankValue(challenger.rank) > getRankValue(current.rank);
  }

  // Challenger is off-suit and non-trump, cannot beat current
  return false;
}

/**
 * Validates whether `card` is a legal play.
 *
 * Rules:
 *  - If the player has any cards matching the led suit, they must follow suit.
 *  - If the player has no cards of the led suit, they may play any card.
 *  - On the first card of a trick, any card is legal.
 */
export function isLegalPlay(
  card: Card,
  hand: Card[],
  currentTrick: TrickCard[],
): boolean {
  if (currentTrick.length === 0) return true; // leading the trick

  const ledSuit = currentTrick[0].card.suit;
  const hasLedSuit = hand.some((c) => c.suit === ledSuit);

  if (hasLedSuit) {
    return card.suit === ledSuit;
  }

  return true; // no led-suit cards; anything goes
}
