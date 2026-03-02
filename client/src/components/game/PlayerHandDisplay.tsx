import React, { useState } from 'react';
import { Card, TrickCard, Suit } from '@oh-hell/shared';
import { CardComponent } from './CardComponent';

interface Props {
  hand: Card[];
  onPlayCard: (cardId: string) => void;
  isMyTurn: boolean;
  currentTrick: TrickCard[];
}

/**
 * Determines which cards in the hand are legal to play given the current trick.
 * Rule: Must follow the led suit if able. Otherwise any card is playable.
 */
function getLegalCards(hand: Card[], currentTrick: TrickCard[]): Set<string> {
  if (currentTrick.length === 0) {
    // Player leads — any card is legal
    return new Set(hand.map(c => c.id));
  }

  const ledSuit: Suit = currentTrick[0].card.suit;
  const hasSuit = hand.some(c => c.suit === ledSuit);

  if (hasSuit) {
    return new Set(hand.filter(c => c.suit === ledSuit).map(c => c.id));
  }

  // No cards of led suit — any card is legal
  return new Set(hand.map(c => c.id));
}

export function PlayerHandDisplay({ hand, onPlayCard, isMyTurn, currentTrick }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const legalCards = getLegalCards(hand, currentTrick);

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    if (!legalCards.has(cardId)) return;

    if (selectedCardId === cardId) {
      // Double-click confirm: play the card
      onPlayCard(cardId);
      setSelectedCardId(null);
    } else {
      setSelectedCardId(cardId);
    }
  };

  const handlePlaySelected = () => {
    if (selectedCardId) {
      onPlayCard(selectedCardId);
      setSelectedCardId(null);
    }
  };

  if (hand.length === 0) {
    return <div style={{ color: '#9ca3af', padding: '1rem' }}>No cards in hand.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', color: '#374151' }}>
        Your Hand
        {isMyTurn && (
          <span style={{ marginLeft: '0.5rem', color: '#16a34a' }}>— Your turn! Click a card to select, click again to play.</span>
        )}
        {!isMyTurn && (
          <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>— Waiting for another player...</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem' }}>
        {hand.map((card) => {
          const isLegal = legalCards.has(card.id);
          const isSelected = selectedCardId === card.id;
          return (
            <CardComponent
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card.id)}
              disabled={!isMyTurn || !isLegal}
              selected={isSelected}
            />
          );
        })}
      </div>
      {selectedCardId && isMyTurn && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', paddingLeft: '0.75rem' }}>
          <button
            onClick={handlePlaySelected}
            style={{
              padding: '0.375rem 1rem',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Play Card
          </button>
          <button
            onClick={() => setSelectedCardId(null)}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
