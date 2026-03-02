import { evaluateTrick, isLegalPlay } from '../src/game/TrickEvaluator';
import { Card, TrickCard } from '@oh-hell/shared';

// ─── Helpers ────────────────────────────────────────────────────────────────

function card(suit: Card['suit'], rank: Card['rank']): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

function trickCard(playerId: string, c: Card): TrickCard {
  return { playerId, card: c };
}

// ─── evaluateTrick() ─────────────────────────────────────────────────────────

describe('evaluateTrick()', () => {
  it('throws on an empty trick', () => {
    expect(() => evaluateTrick([], 'hearts')).toThrow(
      'Cannot evaluate an empty trick',
    );
  });

  it('returns the sole player as winner when only one card is played', () => {
    const trick = [trickCard('p1', card('hearts', 'A'))];
    expect(evaluateTrick(trick, null)).toBe('p1');
  });

  it('trump beats non-trump even if non-trump has a higher rank', () => {
    // p1 leads Ace of spades; p2 plays 2 of hearts (trump)
    const trick = [
      trickCard('p1', card('spades', 'A')),
      trickCard('p2', card('hearts', '2')),
    ];
    expect(evaluateTrick(trick, 'hearts')).toBe('p2');
  });

  it('highest trump wins when multiple trump cards are played', () => {
    const trick = [
      trickCard('p1', card('hearts', '5')),  // trump
      trickCard('p2', card('hearts', 'K')),  // trump, higher
      trickCard('p3', card('hearts', '9')),  // trump, middle
    ];
    expect(evaluateTrick(trick, 'hearts')).toBe('p2');
  });

  it('highest led-suit wins when no trump is played', () => {
    const trick = [
      trickCard('p1', card('clubs', '7')),
      trickCard('p2', card('clubs', 'K')),
      trickCard('p3', card('clubs', '3')),
    ];
    expect(evaluateTrick(trick, 'hearts')).toBe('p2');
  });

  it('off-suit non-trump card does not beat the led suit', () => {
    // p1 leads clubs; p2 throws diamonds (off-suit, no trump); p2 cannot win
    const trick = [
      trickCard('p1', card('clubs', '5')),
      trickCard('p2', card('diamonds', 'A')), // high rank but wrong suit
    ];
    expect(evaluateTrick(trick, 'spades')).toBe('p1');
  });

  it('trump suit wins even when trumpCard is not the led suit', () => {
    const trick = [
      trickCard('p1', card('diamonds', 'Q')),
      trickCard('p2', card('spades', '3')),  // spades is trump
    ];
    expect(evaluateTrick(trick, 'spades')).toBe('p2');
  });

  it('first played card wins when all cards are off-suit and no trump', () => {
    // Led suit is clubs; p2 and p3 play off-suit cards — p1 retains lead
    const trick = [
      trickCard('p1', card('clubs', '4')),
      trickCard('p2', card('diamonds', 'A')),
      trickCard('p3', card('hearts', 'K')),
    ];
    expect(evaluateTrick(trick, 'spades')).toBe('p1');
  });

  it('works correctly with no trump suit (null)', () => {
    const trick = [
      trickCard('p1', card('hearts', '8')),
      trickCard('p2', card('hearts', 'A')),
      trickCard('p3', card('spades', 'A')), // off-suit, cannot beat led suit
    ];
    expect(evaluateTrick(trick, null)).toBe('p2');
  });
});

// ─── isLegalPlay() ───────────────────────────────────────────────────────────

describe('isLegalPlay()', () => {
  it('allows any card when leading (empty trick)', () => {
    const hand = [card('hearts', '3'), card('spades', 'K')];
    const played = card('spades', 'K');
    expect(isLegalPlay(played, hand, [])).toBe(true);
  });

  it('requires following suit when player has a card of the led suit', () => {
    const ledCard = card('hearts', '5');
    const trick = [trickCard('p1', ledCard)];
    const hand = [card('hearts', 'A'), card('spades', 'K')];

    // Playing a hearts card is legal
    expect(isLegalPlay(card('hearts', 'A'), hand, trick)).toBe(true);
    // Playing a spades card is illegal (player has hearts)
    expect(isLegalPlay(card('spades', 'K'), hand, trick)).toBe(false);
  });

  it('allows any card when player has none of the led suit', () => {
    const ledCard = card('hearts', '5');
    const trick = [trickCard('p1', ledCard)];
    const hand = [card('spades', 'A'), card('clubs', '2')];

    // No hearts in hand — any card is legal
    expect(isLegalPlay(card('spades', 'A'), hand, trick)).toBe(true);
    expect(isLegalPlay(card('clubs', '2'), hand, trick)).toBe(true);
  });

  it('allows trump when player has no led-suit cards', () => {
    const ledCard = card('clubs', '9');
    const trick = [trickCard('p1', ledCard)];
    const hand = [card('hearts', 'K'), card('diamonds', '7')]; // no clubs

    expect(isLegalPlay(card('hearts', 'K'), hand, trick)).toBe(true);
  });

  it('disallows off-suit card when player has led suit', () => {
    const ledCard = card('diamonds', 'J');
    const trick = [trickCard('p1', ledCard)];
    const hand = [card('diamonds', '4'), card('clubs', 'A')];

    expect(isLegalPlay(card('clubs', 'A'), hand, trick)).toBe(false);
  });

  it('allows the exact led-suit card that is in the hand', () => {
    const ledCard = card('spades', '10');
    const trick = [trickCard('p1', ledCard)];
    const matchingCard = card('spades', '7');
    const hand = [matchingCard, card('hearts', '2')];

    expect(isLegalPlay(matchingCard, hand, trick)).toBe(true);
  });
});
