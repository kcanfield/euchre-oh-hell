import React from 'react';
import { TrickCard, Player } from '@oh-hell/shared';
import { CardComponent } from './CardComponent';

interface Props {
  currentTrick: TrickCard[];
  players: Player[];
  trickLeaderId: string | null;
}

export function TrickArea({ currentTrick, players, trickLeaderId }: Props) {
  const getPlayerName = (playerId: string): string => {
    return players.find(p => p.playerId === playerId)?.username ?? playerId;
  };

  return (
    <div style={containerStyle}>
      <h3 style={{ marginBottom: '0.75rem' }}>Current Trick</h3>
      {currentTrick.length === 0 ? (
        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No cards played yet.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          {currentTrick.map((tc, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {getPlayerName(tc.playerId)}
                {tc.playerId === trickLeaderId && (
                  <span style={{ marginLeft: '0.25rem', color: '#2563eb' }}>(led)</span>
                )}
              </div>
              <CardComponent card={tc.card} disabled />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#fff',
  minHeight: '140px',
};
