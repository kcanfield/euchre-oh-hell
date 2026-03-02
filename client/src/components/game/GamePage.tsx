import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@oh-hell/shared';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { GameTable } from './GameTable';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  socket: GameSocket | null;
}

export function GamePage({ socket }: Props) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { requestState } = useGameActions(socket);

  // Sync gameId into context
  useEffect(() => {
    if (gameId && state.gameId !== gameId) {
      dispatch({ type: 'SET_GAME_ID', gameId });
    }
  }, [gameId, state.gameId, dispatch]);

  // Request full state on mount or when we reconnect and have no game state
  useEffect(() => {
    if (!gameId || !socket) return;
    if (!state.gameState || state.gameState.gameId !== gameId) {
      requestState(gameId);
    }
  }, [gameId, socket, state.gameState, requestState]);

  // Navigate back to lobby if game is cleared
  useEffect(() => {
    if (!state.gameId && !state.gameState) {
      navigate('/');
    }
  }, [state.gameId, state.gameState, navigate]);

  if (!gameId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Invalid game URL.</p>
        <button onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  return <GameTable socket={socket} />;
}
