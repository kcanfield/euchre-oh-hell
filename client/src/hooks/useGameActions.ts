import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@oh-hell/shared';
import { useGame } from '../context/GameContext';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useGameActions(
  socket: GameSocket | null,
  onGameStarted?: (gameId: string) => void,
) {
  const { state, dispatch } = useGame();

  // Keep a ref to the latest state so event handlers never have stale closures,
  // without needing to re-subscribe every time state changes.
  const stateRef = useRef(state);
  stateRef.current = state;

  const onGameStartedRef = useRef(onGameStarted);
  onGameStartedRef.current = onGameStarted;

  useEffect(() => {
    if (!socket) return;

    socket.on('lobby:updated', ({ lobby }) => {
      dispatch({ type: 'SET_LOBBY', lobby });
      dispatch({ type: 'SET_GAME_ID', gameId: lobby.gameId });
    });

    socket.on('lobby:gameStarted', ({ gameId }) => {
      dispatch({ type: 'SET_GAME_ID', gameId });
      onGameStartedRef.current?.(gameId);
    });

    socket.on('game:roundStarted', ({ round, scores, gameId }) => {
      const s = stateRef.current;
      dispatch({ type: 'SET_GAME_ID', gameId });
      dispatch({
        type: 'SET_GAME_STATE',
        gameState: {
          gameId,
          status: round.phase === 'bidding' ? 'bidding' : 'playing',
          players: s.gameState?.players ?? s.lobby?.players ?? [],
          hostId: s.gameState?.hostId ?? s.lobby?.hostId ?? '',
          totalRounds: s.gameState?.totalRounds ?? 0,
          currentRoundIndex: s.gameState ? s.gameState.currentRoundIndex + 1 : 0,
          currentRound: round,
          scores,
          winnerId: null,
          startedAt: s.gameState?.startedAt ?? new Date().toISOString(),
        },
      });
    });

    socket.on('game:biddingStarted', ({ dealerId, trumpCard, trumpSuit, handSize, firstBidderId }) => {
      const s = stateRef.current;
      if (!s.gameState) return;
      dispatch({
        type: 'SET_GAME_STATE',
        gameState: {
          ...s.gameState,
          status: 'bidding',
          currentRound: s.gameState.currentRound
            ? { ...s.gameState.currentRound, phase: 'bidding', dealerId, trumpCard, trumpSuit, handSize, currentPlayerId: firstBidderId }
            : null,
        },
      });
    });

    socket.on('game:bidPlaced', ({ bids }) => {
      const s = stateRef.current;
      if (!s.gameState?.currentRound) return;
      dispatch({
        type: 'SET_GAME_STATE',
        gameState: { ...s.gameState, currentRound: { ...s.gameState.currentRound, bids } },
      });
    });

    socket.on('game:biddingComplete', ({ firstPlayerId }) => {
      const s = stateRef.current;
      if (!s.gameState?.currentRound) return;
      dispatch({
        type: 'SET_GAME_STATE',
        gameState: {
          ...s.gameState,
          status: 'playing',
          currentRound: { ...s.gameState.currentRound, phase: 'playing', currentPlayerId: firstPlayerId },
        },
      });
    });

    socket.on('game:cardPlayed', ({ currentTrick, nextPlayerId }) => {
      const s = stateRef.current;
      if (!s.gameState?.currentRound) return;
      dispatch({
        type: 'SET_GAME_STATE',
        gameState: {
          ...s.gameState,
          currentRound: {
            ...s.gameState.currentRound,
            currentTrick,
            currentPlayerId: nextPlayerId ?? s.gameState.currentRound.currentPlayerId,
          },
        },
      });
    });

    socket.on('game:trickComplete', ({ tricksTaken, nextPlayerId }) => {
      const s = stateRef.current;
      if (!s.gameState?.currentRound) return;
      dispatch({
        type: 'SET_GAME_STATE',
        gameState: {
          ...s.gameState,
          currentRound: {
            ...s.gameState.currentRound,
            currentTrick: [],
            tricksTaken,
            currentPlayerId: nextPlayerId ?? s.gameState.currentRound.currentPlayerId,
          },
        },
      });
    });

    socket.on('game:roundComplete', ({ roundResults, scores }) => {
      const s = stateRef.current;
      dispatch({ type: 'SET_ROUND_RESULTS', results: roundResults });
      if (s.gameState) {
        dispatch({ type: 'SET_GAME_STATE', gameState: { ...s.gameState, status: 'round_summary', scores } });
      }
    });

    socket.on('game:complete', ({ finalScores, winnerId }) => {
      const s = stateRef.current;
      dispatch({ type: 'SET_FINAL_SCORES', scores: finalScores, winnerId });
      if (s.gameState) {
        dispatch({ type: 'SET_GAME_STATE', gameState: { ...s.gameState, status: 'game_over', winnerId, scores: finalScores } });
      }
    });

    socket.on('game:stateSync', ({ gameState }) => {
      dispatch({ type: 'SET_GAME_STATE', gameState });
    });

    socket.on('game:error', ({ message }) => {
      dispatch({ type: 'SET_ERROR', error: message });
    });

    return () => {
      socket.off('lobby:updated');
      socket.off('lobby:gameStarted');
      socket.off('game:roundStarted');
      socket.off('game:biddingStarted');
      socket.off('game:bidPlaced');
      socket.off('game:biddingComplete');
      socket.off('game:cardPlayed');
      socket.off('game:trickComplete');
      socket.off('game:roundComplete');
      socket.off('game:complete');
      socket.off('game:stateSync');
      socket.off('game:error');
    };
  }, [socket, dispatch]); // only re-subscribe when socket or dispatch changes

  const createLobby = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('lobby:create', (res) => {
        if ('error' in res) reject(new Error(res.error));
        else resolve(res.gameId);
      });
    });
  }, [socket]);

  const joinLobby = useCallback((gameId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('lobby:join', { gameId }, (res) => {
        if ('error' in res) reject(new Error(res.error));
        else resolve();
      });
    });
  }, [socket]);

  const leaveLobby = useCallback((gameId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('lobby:leave', { gameId }, (res) => {
        if ('error' in res) reject(new Error(res.error));
        else resolve();
      });
    });
  }, [socket]);

  const startGame = useCallback((gameId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('lobby:start', { gameId }, (res) => {
        if ('error' in res) reject(new Error(res.error));
        else resolve();
      });
    });
  }, [socket]);

  const placeBid = useCallback((gameId: string, bid: number) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('game:bid', { gameId, bid }, (res) => {
        if ('error' in res) reject(new Error(res.error));
        else resolve();
      });
    });
  }, [socket]);

  const playCard = useCallback((gameId: string, cardId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('game:playCard', { gameId, cardId }, (res) => {
        if ('error' in res) reject(new Error(res.error));
        else resolve();
      });
    });
  }, [socket]);

  const requestState = useCallback((gameId: string) => {
    if (!socket) return;
    socket.emit('game:requestState', { gameId }, (res) => {
      if ('gameState' in res) dispatch({ type: 'SET_GAME_STATE', gameState: res.gameState });
    });
  }, [socket, dispatch]);

  return { createLobby, joinLobby, leaveLobby, startGame, placeBid, playCard, requestState };
}
