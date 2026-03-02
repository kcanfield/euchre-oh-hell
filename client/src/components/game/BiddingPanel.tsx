import React from 'react';
import { Player } from '@oh-hell/shared';

interface Props {
  handSize: number;
  isMyTurn: boolean;
  forbiddenBid: number | null;
  onBid: (bid: number) => void;
  bids: Record<string, number | null>;
  players: Player[];
}

export function BiddingPanel({ handSize, isMyTurn, forbiddenBid, onBid, bids, players }: Props) {
  const bidsPlaced = players.filter(p => bids[p.playerId] !== null && bids[p.playerId] !== undefined);

  return (
    <div style={containerStyle}>
      <h3 style={{ marginBottom: '0.75rem' }}>Bidding Phase</h3>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          Bids placed: {bidsPlaced.length} / {players.length}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {players.map((player) => {
            const bid = bids[player.playerId];
            const hasBid = bid !== null && bid !== undefined;
            return (
              <div
                key={player.playerId}
                style={{
                  padding: '0.25rem 0.625rem',
                  borderRadius: '4px',
                  background: hasBid ? '#dbeafe' : '#f3f4f6',
                  border: '1px solid',
                  borderColor: hasBid ? '#93c5fd' : '#e5e7eb',
                  fontSize: '0.8rem',
                }}
              >
                {player.username}: {hasBid ? bid : '?'}
              </div>
            );
          })}
        </div>
      </div>

      {isMyTurn ? (
        <div>
          <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
            Your turn to bid (0 to {handSize}):
          </div>
          {forbiddenBid !== null && (
            <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#dc2626' }}>
              As dealer, you may not bid {forbiddenBid} (would make total equal hand size).
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Array.from({ length: handSize + 1 }, (_, i) => i).map((bid) => {
              const isForbidden = forbiddenBid !== null && bid === forbiddenBid;
              return (
                <button
                  key={bid}
                  onClick={() => !isForbidden && onBid(bid)}
                  disabled={isForbidden}
                  title={isForbidden ? `Cannot bid ${bid} as dealer` : undefined}
                  style={{
                    width: '44px',
                    height: '44px',
                    border: isForbidden ? '2px dashed #dc2626' : '2px solid #2563eb',
                    borderRadius: '6px',
                    background: isForbidden ? '#fee2e2' : '#eff6ff',
                    color: isForbidden ? '#dc2626' : '#1d4ed8',
                    cursor: isForbidden ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  {bid}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
          Waiting for others to bid...
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
};
