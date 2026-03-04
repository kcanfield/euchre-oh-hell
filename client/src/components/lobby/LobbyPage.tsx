import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@oh-hell/shared';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { ServerStatusBanner } from './ServerStatusBanner';
import { WaitingRoom } from './WaitingRoom';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  socket: GameSocket | null;
  connected: boolean;
}

export function LobbyPage({ socket, connected }: Props) {
  const navigate = useNavigate();
  const { playerId, username, logout } = useAuth();
  const { state, dispatch } = useGame();
  const { createLobby, joinLobby, leaveLobby, startGame } = useGameActions(
    socket,
    (gameId) => navigate(`/game/${gameId}`),
  );

  const [joinGameId, setJoinGameId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    setIsCreating(true);
    try {
      const gameId = await createLobby();
      dispatch({ type: 'SET_GAME_ID', gameId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!joinGameId.trim()) return;
    setIsJoining(true);
    try {
      await joinLobby(joinGameId.trim());
      dispatch({ type: 'SET_GAME_ID', gameId: joinGameId.trim() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!state.gameId) return;
    await leaveLobby(state.gameId);
    dispatch({ type: 'CLEAR_GAME' });
  };

  const handleStartGame = async () => {
    if (!state.gameId) return;
    await startGame(state.gameId);
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, color: '#1e3a5f' }}>Oh Hell!</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Signed in as <strong>{username}</strong>
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              background: connected ? '#d1fae5' : '#fee2e2',
              color: connected ? '#065f46' : '#991b1b',
            }}
          >
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <button onClick={logout} style={logoutButtonStyle}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={contentStyle}>
        <ServerStatusBanner />

        {error && (
          <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
        )}

        {state.lobby && state.gameId ? (
          <WaitingRoom
            lobby={state.lobby}
            currentPlayerId={playerId ?? ''}
            onStartGame={handleStartGame}
            onLeave={handleLeave}
          />
        ) : (
          <div style={actionsContainerStyle}>
            <div style={actionCardStyle}>
              <h2 style={{ marginBottom: '0.75rem' }}>Create a Game</h2>
              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Start a new lobby and invite your friends.
              </p>
              <button
                onClick={handleCreate}
                disabled={isCreating || !connected}
                style={{
                  padding: '0.625rem 1.5rem',
                  background: connected ? '#2563eb' : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: connected ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                {isCreating ? 'Creating...' : 'Create Game'}
              </button>
            </div>

            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '0.5rem 0' }}>or</div>

            <div style={actionCardStyle}>
              <h2 style={{ marginBottom: '0.75rem' }}>Join a Game</h2>
              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Enter a game ID to join an existing lobby.
              </p>
              <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={joinGameId}
                  onChange={e => setJoinGameId(e.target.value)}
                  placeholder="Game ID"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={isJoining || !connected || !joinGameId.trim()}
                  style={{
                    padding: '0.5rem 1rem',
                    background: connected ? '#2563eb' : '#9ca3af',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: connected ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                  }}
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f0f4f8',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 2rem',
  background: '#fff',
  borderBottom: '1px solid #e5e7eb',
};

const contentStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '2rem auto',
  padding: '0 1rem',
};

const actionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const actionCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1.5rem',
};

const logoutButtonStyle: React.CSSProperties = {
  padding: '0.375rem 0.875rem',
  background: 'transparent',
  color: '#6b7280',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.875rem',
};
