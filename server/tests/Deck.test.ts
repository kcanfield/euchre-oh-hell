import { createDeck, shuffleDeck, dealCards } from '../src/game/Deck';
import { Card } from '@oh-hell/shared';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

describe('createDeck()', () => {
  it('produces exactly 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);

    const ids = deck.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(52);
  });

  it('contains every suit and rank combination', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const found = deck.find((c) => c.suit === suit && c.rank === rank);
        expect(found).toBeDefined();
        expect(found?.id).toBe(`${suit}-${rank}`);
      }
    }
  });

  it('assigns correct id format: "suit-rank"', () => {
    const deck = createDeck();
    for (const card of deck) {
      expect(card.id).toBe(`${card.suit}-${card.rank}`);
    }
  });
});

describe('shuffleDeck()', () => {
  it('returns a new array (does not mutate the input)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).not.toBe(deck);
  });

  it('returns an array with the same 52 cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);

    const originalIds = new Set(deck.map((c) => c.id));
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    expect(shuffledIds).toEqual(originalIds);
  });

  it('produces a different order at least sometimes across multiple shuffles', () => {
    const deck = createDeck();
    const orderedIds = deck.map((c) => c.id).join(',');

    // Run 10 shuffles; at least one should differ from the original order
    let atLeastOneDiffers = false;
    for (let i = 0; i < 10; i++) {
      const shuffled = shuffleDeck(deck);
      if (shuffled.map((c) => c.id).join(',') !== orderedIds) {
        atLeastOneDiffers = true;
        break;
      }
    }
    expect(atLeastOneDiffers).toBe(true);
  });

  it('two shuffles of the same deck generally produce different results', () => {
    const deck = createDeck();
    let atLeastOnceDifferent = false;
    for (let i = 0; i < 10; i++) {
      const s1 = shuffleDeck(deck).map((c) => c.id).join(',');
      const s2 = shuffleDeck(deck).map((c) => c.id).join(',');
      if (s1 !== s2) {
        atLeastOnceDifferent = true;
        break;
      }
    }
    expect(atLeastOnceDifferent).toBe(true);
  });
});

describe('dealCards()', () => {
  it('deals the correct number of cards per player', () => {
    const deck = createDeck();
    const playerIds = ['p1', 'p2', 'p3'];
    const handSize = 5;
    const { hands } = dealCards(deck, playerIds, handSize);

    for (const id of playerIds) {
      expect(hands[id]).toHaveLength(handSize);
    }
  });

  it('deals in round-robin order', () => {
    const deck = createDeck();
    const playerIds = ['p1', 'p2', 'p3'];
    const handSize = 3;
    const { hands } = dealCards(deck, playerIds, handSize);

    // Round-robin: card 0→p1, 1→p2, 2→p3, 3→p1, 4→p2, 5→p3, 6→p1, 7→p2, 8→p3
    expect(hands['p1'][0]).toEqual(deck[0]);
    expect(hands['p2'][0]).toEqual(deck[1]);
    expect(hands['p3'][0]).toEqual(deck[2]);
    expect(hands['p1'][1]).toEqual(deck[3]);
    expect(hands['p2'][1]).toEqual(deck[4]);
    expect(hands['p3'][1]).toEqual(deck[5]);
    expect(hands['p1'][2]).toEqual(deck[6]);
    expect(hands['p2'][2]).toEqual(deck[7]);
    expect(hands['p3'][2]).toEqual(deck[8]);
  });

  it('returns the correct trumpCard (next card after all dealt cards)', () => {
    const deck = createDeck();
    const playerIds = ['p1', 'p2'];
    const handSize = 5;
    // 2 players × 5 cards = 10 cards dealt; trump is deck[10]
    const { trumpCard } = dealCards(deck, playerIds, handSize);
    expect(trumpCard).toEqual(deck[10]);
  });

  it('returns the correct remainingDeck (after dealt cards + trump card)', () => {
    const deck = createDeck();
    const playerIds = ['p1', 'p2'];
    const handSize = 5;
    const totalDealt = 10; // 2 × 5
    const { remainingDeck } = dealCards(deck, playerIds, handSize);
    // Remaining starts after trump card (index 11 onward)
    expect(remainingDeck).toEqual(deck.slice(11));
    expect(remainingDeck).toHaveLength(52 - totalDealt - 1);
  });

  it('throws an error when there are not enough cards in the deck', () => {
    const deck = createDeck().slice(0, 5); // only 5 cards
    const playerIds = ['p1', 'p2', 'p3'];
    const handSize = 5; // needs 15 cards
    expect(() => dealCards(deck, playerIds, handSize)).toThrow(
      /Not enough cards/,
    );
  });

  it('edge case: deals 1 card to 1 player, trump is deck[1], remaining is deck[2..]', () => {
    const deck = createDeck();
    const playerIds = ['p1'];
    const handSize = 1;
    const { hands, trumpCard, remainingDeck } = dealCards(deck, playerIds, handSize);

    expect(hands['p1']).toHaveLength(1);
    expect(hands['p1'][0]).toEqual(deck[0]);
    expect(trumpCard).toEqual(deck[1]);
    expect(remainingDeck).toHaveLength(50);
    expect(remainingDeck).toEqual(deck.slice(2));
  });

  it('trumpCard is null when the deck is exactly exhausted by dealing', () => {
    // 2 players × 5 = 10 cards; use a 10-card deck so nothing remains for trump
    const deck = createDeck().slice(0, 10);
    const playerIds = ['p1', 'p2'];
    const handSize = 5;
    const { trumpCard, remainingDeck } = dealCards(deck, playerIds, handSize);
    expect(trumpCard).toBeNull();
    expect(remainingDeck).toHaveLength(0);
  });
});
