import React, { createContext, useContext, useReducer } from 'react';
import { GameStateView, LobbyState, PlayerScore, RoundResult } from '@oh-hell/shared';

interface GameContextState {
  gameId: string | null;
  lobby: LobbyState | null;
  gameState: GameStateView | null;
  lastRoundResults: RoundResult[] | null;
  finalScores: PlayerScore[] | null;
  error: string | null;
}

type GameAction =
  | { type: 'SET_GAME_ID'; gameId: string }
  | { type: 'SET_LOBBY'; lobby: LobbyState }
  | { type: 'SET_GAME_STATE'; gameState: GameStateView }
  | { type: 'SET_ROUND_RESULTS'; results: RoundResult[] }
  | { type: 'SET_FINAL_SCORES'; scores: PlayerScore[]; winnerId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_GAME' };

interface GameContextValue {
  state: GameContextState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_GAME_ID':
      return { ...state, gameId: action.gameId };
    case 'SET_LOBBY':
      return { ...state, lobby: action.lobby };
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.gameState, error: null };
    case 'SET_ROUND_RESULTS':
      return { ...state, lastRoundResults: action.results };
    case 'SET_FINAL_SCORES':
      return { ...state, finalScores: action.scores };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'CLEAR_GAME':
      return {
        gameId: null,
        lobby: null,
        gameState: null,
        lastRoundResults: null,
        finalScores: null,
        error: null,
      };
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    gameId: null,
    lobby: null,
    gameState: null,
    lastRoundResults: null,
    finalScores: null,
    error: null,
  });

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
