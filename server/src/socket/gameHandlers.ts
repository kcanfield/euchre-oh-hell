import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import {
  ClientToServerEvents,
  CompletedGameRecord,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@oh-hell/shared';
import { gameStore } from '../game/GameStore';
import { IUserRepository } from '../services/IUserRepository';
import { IdleMonitor } from '../services/IdleMonitor';

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const gameBidSchema = z.object({
  gameId: z.string().uuid(),
  bid: z.number().int().min(0),
});

const gamePlayCardSchema = z.object({
  gameId: z.string().uuid(),
  cardId: z.string().min(1),
});

const gameRequestStateSchema = z.object({
  gameId: z.string().uuid(),
});

/**
 * Finds an active Socket.IO socket for a given playerId by checking socket.data.
 */
function findSocketByPlayerId(
  io: AppServer,
  playerId: string,
): AppSocket | undefined {
  for (const [, socket] of io.sockets.sockets) {
    if ((socket as AppSocket).data.playerId === playerId) {
      return socket as AppSocket;
    }
  }
  return undefined;
}

export function registerGameHandlers(
  io: AppServer,
  socket: AppSocket,
  dynamoDBService: IUserRepository,
  idleMonitor: IdleMonitor,
): void {
  const { playerId } = socket.data;

  // ─── game:bid ────────────────────────────────────────────────────────────────

  socket.on('game:bid', (payload, callback) => {
    const parseResult = gameBidSchema.safeParse(payload);
    if (!parseResult.success) {
      callback({ error: parseResult.error.errors[0].message });
      return;
    }

    const { gameId, bid } = parseResult.data;
    const engine = gameStore.get(gameId);

    if (!engine) {
      callback({ error: 'Game not found' });
      return;
    }

    try {
      const result = engine.placeBid(playerId, bid);

      io.to(gameId).emit('game:bidPlaced', {
        gameId,
        playerId,
        bid,
        totalBids: result.totalBids,
        bids: result.bids,
      });

      if (result.biddingComplete) {
        const state = engine.getState();
        const currentRound = state.currentRound!;
        io.to(gameId).emit('game:biddingComplete', {
          gameId,
          bids: result.bids as Record<string, number>,
          firstPlayerId: currentRound.currentPlayerId,
        });
      }

      idleMonitor.recordActivity();
      callback({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place bid';
      callback({ error: message });
    }
  });

  // ─── game:playCard ────────────────────────────────────────────────────────────

  socket.on('game:playCard', (payload, callback) => {
    const parseResult = gamePlayCardSchema.safeParse(payload);
    if (!parseResult.success) {
      callback({ error: parseResult.error.errors[0].message });
      return;
    }

    const { gameId, cardId } = parseResult.data;
    const engine = gameStore.get(gameId);

    if (!engine) {
      callback({ error: 'Game not found' });
      return;
    }

    try {
      // Capture the trick state before mutation so we can include completed trick cards in events
      const preMutationTrick = [...(engine.getState().currentRound?.currentTrick ?? [])];

      const result = engine.playCard(playerId, cardId);
      const state = engine.getState();

      // Build the post-play current trick: if the trick completed the engine clears it,
      // so we include the card just played appended to the pre-mutation trick.
      const playedTrickCard = { card: result.card, playerId };
      const completedTrick = [...preMutationTrick, playedTrickCard];

      // For an in-progress trick, use the live state; for a completed trick the state is cleared.
      const currentTrickForEvent = result.trickComplete
        ? completedTrick
        : (state.currentRound?.currentTrick ?? []);

      // Always emit card played
      io.to(gameId).emit('game:cardPlayed', {
        gameId,
        playerId,
        card: result.card,
        currentTrick: currentTrickForEvent,
        nextPlayerId: result.nextPlayerId,
      });

      if (result.trickComplete) {
        io.to(gameId).emit('game:trickComplete', {
          gameId,
          winnerId: result.trickWinnerId!,
          trickCards: completedTrick,
          tricksTaken: result.tricksTaken!,
          nextPlayerId: result.nextPlayerId,
        });
      }

      if (result.roundComplete) {
        io.to(gameId).emit('game:roundComplete', {
          gameId,
          roundResults: result.roundResults!,
          scores: result.updatedScores!,
          nextRoundIn: result.gameComplete ? 0 : 100,
        });
      }

      if (result.gameComplete) {
        io.to(gameId).emit('game:complete', {
          gameId,
          finalScores: result.updatedScores!,
          winnerId: result.winnerId!,
        });

        // Persist to DynamoDB
        const completedGame: CompletedGameRecord = {
          gameId,
          completedAt: new Date().toISOString(),
          playerIds: state.players.map((p) => p.playerId),
          finalScores: result.updatedScores!,
          winnerId: result.winnerId!,
          roundCount: state.roundSchedule?.length ?? 0,
          startedAt: state.startedAt ?? new Date().toISOString(),
        };

        dynamoDBService.saveCompletedGame(completedGame).catch((err) => {
          console.error('[gameHandlers] Failed to save completed game to DynamoDB:', err);
        });

        gameStore.remove(gameId);
      } else if (result.roundComplete) {
        // New round started — send personalized state to each player after a short delay
        setTimeout(() => {
          for (const player of state.players) {
            const playerSocket = findSocketByPlayerId(io, player.playerId);
            if (playerSocket) {
              const freshState = engine.getState();
              playerSocket.emit('game:roundStarted', {
                gameId,
                round: engine.getStateView(player.playerId).currentRound!,
                scores: freshState.scores,
              });
            }
          }
        }, 100);
      }

      idleMonitor.recordActivity();
      callback({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to play card';
      callback({ error: message });
    }
  });

  // ─── game:requestState ────────────────────────────────────────────────────────

  socket.on('game:requestState', (payload, callback) => {
    const parseResult = gameRequestStateSchema.safeParse(payload);
    if (!parseResult.success) {
      callback({ error: parseResult.error.errors[0].message });
      return;
    }

    const { gameId } = parseResult.data;
    const engine = gameStore.get(gameId);

    if (!engine) {
      callback({ error: 'Game not found' });
      return;
    }

    callback({ gameState: engine.getStateView(playerId) });
  });
}
