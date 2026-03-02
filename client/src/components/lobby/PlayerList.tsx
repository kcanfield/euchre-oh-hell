import React from 'react';
import { Player } from '@oh-hell/shared';

interface Props {
  players: Player[];
  hostId: string;
}

export function PlayerList({ players, hostId }: Props) {
  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Players ({players.length})</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {players.map((player) => (
          <li
            key={player.playerId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.25rem',
              background: '#f9fafb',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: player.connected ? '#10b981' : '#9ca3af',
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: player.playerId === hostId ? 'bold' : 'normal' }}>
              {player.username}
            </span>
            {player.playerId === hostId && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.75rem',
                  background: '#2563eb',
                  color: '#fff',
                  padding: '0.125rem 0.4rem',
                  borderRadius: '3px',
                  fontWeight: 'bold',
                }}
              >
                Host
              </span>
            )}
            {player.type === 'bot' && (
              <span
                style={{
                  marginLeft: player.playerId === hostId ? '0.25rem' : 'auto',
                  fontSize: '0.75rem',
                  background: '#7c3aed',
                  color: '#fff',
                  padding: '0.125rem 0.4rem',
                  borderRadius: '3px',
                }}
              >
                Bot
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
