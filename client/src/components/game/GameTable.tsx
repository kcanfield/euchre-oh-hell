import React from 'react';
import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, Card } from '@oh-hell/shared';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { useGameActions } from '../../hooks/useGameActions';
import { CardComponent } from './CardComponent';
import { TrickArea } from './TrickArea';
import { BiddingPanel } from './BiddingPanel';
import { PlayerHandDisplay } from './PlayerHandDisplay';
import { ScoreBoard } from './ScoreBoard';
import { RoundSummaryModal } from './RoundSummaryModal';
import { GameOverScreen } from './GameOverScreen';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Props {
  socket: GameSocket | null;
}

export function GameTable({ socket }: Props) {
  const { playerId } = useAuth();
  const { state, dispatch } = useGame();
  const { placeBid, playCard } = useGameActions(socket);

  const { gameState, lastRoundResults } = state;

  if (!gameState) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading game...
      </div>
    );
  }

  const { currentRound, players, scores, status, currentRoundIndex } = gameState;

  // Game over
  if (status === 'game_over' && gameState.winnerId) {
    return (
      <GameOverScreen
        scores={scores}
        winnerId={gameState.winnerId}
        players={players}
      />
    );
  }

  if (!currentRound) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Waiting for round to start...
      </div>
    );
  }

  const isMyBidTurn = currentRound.phase === 'bidding' && currentRound.currentPlayerId === playerId;
  const isMyPlayTurn = currentRound.phase === 'playing' && currentRound.currentPlayerId === playerId;

  // Dealer forbidden bid: sum of all other bids would equal hand size
  const computeForbiddenBid = (): number | null => {
    const isDealer = currentRound.dealerId === playerId;
    if (!isDealer || currentRound.phase !== 'bidding') return null;

    // Check if I am the last to bid
    const bidsSoFar = Object.values(currentRound.bids).filter(b => b !== null && b !== undefined) as number[];
    if (bidsSoFar.length !== players.length - 1) return null;

    const sumSoFar = bidsSoFar.reduce((acc, b) => acc + b, 0);
    const forbidden = currentRound.handSize - sumSoFar;
    if (forbidden >= 0 && forbidden <= currentRound.handSize) return forbidden;
    return null;
  };

  const forbiddenBid = computeForbiddenBid();

  const handleBid = async (bid: number) => {
    if (!gameState.gameId) return;
    try {
      await placeBid(gameState.gameId, bid);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Failed to place bid' });
    }
  };

  const handlePlayCard = async (cardId: string) => {
    if (!gameState.gameId) return;
    try {
      await playCard(gameState.gameId, cardId);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : 'Failed to play card' });
    }
  };

  const handleDismissRoundSummary = () => {
    dispatch({ type: 'CLEAR_ERROR' });
    // The server will send game:roundStarted automatically; just clear local round results
    dispatch({ type: 'SET_ROUND_RESULTS', results: [] });
  };

  const otherPlayers = players.filter(p => p.playerId !== playerId);

  return (
    <div style={tableStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>Oh Hell!</span>
          <span style={{ marginLeft: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Round {currentRound.roundNumber} &mdash; {currentRound.handSize} cards
          </span>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Phase: <strong>{currentRound.phase}</strong>
        </div>
      </div>

      {/* Error banner */}
      {state.error && (
        <div style={errorBannerStyle}>
          {state.error}
          <button
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
            style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontWeight: 'bold' }}
          >
            x
          </button>
        </div>
      )}

      <div style={layoutStyle}>
        {/* Left column: game area */}
        <div style={mainColumnStyle}>
          {/* Trump display */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>Trump:</span>
                {currentRound.trumpSuit ? (
                  <span style={{ color: ['hearts', 'diamonds'].includes(currentRound.trumpSuit) ? 'red' : 'black', fontWeight: 'bold' }}>
                    {currentRound.trumpSuit.charAt(0).toUpperCase() + currentRound.trumpSuit.slice(1)}
                    {' '}
                    {({ hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' } as Record<string, string>)[currentRound.trumpSuit]}
                  </span>
                ) : (
                  <span style={{ color: '#9ca3af' }}>No trump (last round)</span>
                )}
              </div>
              {currentRound.trumpCard && (
                <CardComponent card={currentRound.trumpCard as Card} disabled />
              )}
            </div>
          </div>

          {/* Other players' info */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
              Other Players
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {otherPlayers.map((player) => {
                const playerBid = currentRound.bids[player.playerId];
                const tricksTaken = currentRound.tricksTaken[player.playerId] ?? 0;
                const handSize = currentRound.handSizes[player.playerId] ?? 0;
                const isCurrentPlayer = currentRound.currentPlayerId === player.playerId;
                return (
                  <div
                    key={player.playerId}
                    style={{
                      padding: '0.625rem 0.875rem',
                      border: isCurrentPlayer ? '2px solid #2563eb' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: isCurrentPlayer ? '#eff6ff' : '#f9fafb',
                      minWidth: '140px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {player.username}
                      {isCurrentPlayer && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#2563eb' }}>TURN</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Cards: {handSize}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Bid: {playerBid !== null && playerBid !== undefined ? playerBid : '?'}
                      {' '}&mdash;{' '}
                      Taken: {tricksTaken}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trick area */}
          <div style={sectionStyle}>
            <TrickArea
              currentTrick={currentRound.currentTrick}
              players={players}
              trickLeaderId={currentRound.trickLeaderId}
            />
          </div>

          {/* Bidding panel */}
          {currentRound.phase === 'bidding' && (
            <div style={sectionStyle}>
              <BiddingPanel
                handSize={currentRound.handSize}
                isMyTurn={isMyBidTurn}
                forbiddenBid={forbiddenBid}
                onBid={handleBid}
                bids={currentRound.bids}
                players={players}
              />
            </div>
          )}

          {/* Player hand */}
          {currentRound.phase === 'playing' && (
            <div style={sectionStyle}>
              <PlayerHandDisplay
                hand={currentRound.myHand}
                onPlayCard={handlePlayCard}
                isMyTurn={isMyPlayTurn}
                currentTrick={currentRound.currentTrick}
              />
            </div>
          )}

          {/* Tricks taken summary (during play) */}
          {currentRound.phase === 'playing' && (
            <div style={{ ...sectionStyle, fontSize: '0.875rem', color: '#6b7280' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {players.map((player) => {
                  const bid = currentRound.bids[player.playerId];
                  const taken = currentRound.tricksTaken[player.playerId] ?? 0;
                  return (
                    <span key={player.playerId}>
                      {player.username}: {taken}/{bid !== null && bid !== undefined ? bid : '?'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: scoreboard */}
        <div style={sideColumnStyle}>
          <ScoreBoard scores={scores} currentRoundIndex={currentRoundIndex} />
        </div>
      </div>

      {/* Round summary modal */}
      {status === 'round_summary' && lastRoundResults && lastRoundResults.length > 0 && (
        <RoundSummaryModal
          roundNumber={currentRound.roundNumber}
          results={lastRoundResults}
          onContinue={handleDismissRoundSummary}
        />
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f0f4f8',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  background: '#1e3a5f',
  color: '#fff',
};

const errorBannerStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: '#fee2e2',
  color: '#991b1b',
  display: 'flex',
  alignItems: 'center',
};

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
  padding: '1.5rem',
  flex: 1,
  alignItems: 'flex-start',
};

const mainColumnStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  minWidth: 0,
};

const sideColumnStyle: React.CSSProperties = {
  width: '280px',
  flexShrink: 0,
};

const sectionStyle: React.CSSProperties = {
  // Spacing between sections handled by gap in parent
};
