import React, { useState } from 'react';
import { LobbyState } from '@oh-hell/shared';
import { PlayerList } from './PlayerList';

interface Props {
  lobby: LobbyState;
  currentPlayerId: string;
  onStartGame: () => Promise<void>;
  onLeave: () => Promise<void>;
}

export function WaitingRoom({ lobby, currentPlayerId, onStartGame, onLeave }: Props) {
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');

  const isHost = lobby.hostId === currentPlayerId;
  const canStart = isHost && lobby.players.length >= lobby.minPlayers;

  const handleStart = async () => {
    setError('');
    setIsStarting(true);
    try {
      await onStartGame();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeave = async () => {
    setError('');
    setIsLeaving(true);
    try {
      await onLeave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to leave lobby');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Waiting Room</h2>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'monospace' }}>
          Game ID: {lobby.gameId}
        </div>
      </div>

      {error && (
        <p style={{ color: 'red', marginBottom: '0.75rem' }}>{error}</p>
      )}

      <PlayerList players={lobby.players} hostId={lobby.hostId} />

      <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
        {lobby.players.length < lobby.minPlayers
          ? `Waiting for ${lobby.minPlayers - lobby.players.length} more player(s) to join (minimum ${lobby.minPlayers})`
          : `Ready to start (${lobby.players.length}/${lobby.maxPlayers} players)`}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
        {isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart || isStarting}
            style={{
              padding: '0.5rem 1.25rem',
              background: canStart ? '#16a34a' : '#9ca3af',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: canStart ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            {isStarting ? 'Starting...' : 'Start Game'}
          </button>
        )}
        <button
          onClick={handleLeave}
          disabled={isLeaving}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'transparent',
            color: '#dc2626',
            border: '1px solid #dc2626',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isLeaving ? 'Leaving...' : 'Leave'}
        </button>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: '1.5rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#fff',
};
