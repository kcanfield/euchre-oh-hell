import React from 'react';
import { Card } from '@oh-hell/shared';

interface Props {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export function CardComponent({ card, onClick, disabled, selected }: Props) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit];

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'inline-block',
        width: '60px',
        height: '90px',
        border: selected ? '2px solid blue' : '1px solid black',
        borderRadius: '4px',
        background: disabled ? '#ccc' : 'white',
        color: isRed ? 'red' : 'black',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        padding: '4px',
        userSelect: 'none',
        boxShadow: selected ? '0 0 0 2px rgba(37,99,235,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
        transform: selected ? 'translateY(-6px)' : undefined,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{card.rank}</div>
      <div style={{ fontSize: '1.5em' }}>{suitSymbol}</div>
    </div>
  );
}
