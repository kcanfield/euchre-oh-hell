import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  ClientToServerEvents,
  InterServerEvents,
  Player,
  ServerToClientEvents,
  SocketData,
} from '@oh-hell/shared';
import { GameEngine } from '../game/GameEngine';
import { gameStore } from '../game/GameStore';
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

const gameIdSchema = z.object({
  gameId: z.string().uuid(),
});

export function registerLobbyHandlers(
  io: AppServer,
  socket: AppSocket,
  idleMonitor: IdleMonitor,
): void {
  const { playerId, username } = socket.data;

  // ─── lobby:create ───────────────────────────────────────────────────────────

  socket.on('lobby:create', (callback) => {
    try {
      const gameId = uuidv4();
      const engine = new GameEngine(gameId, playerId, username);

      gameStore.add(engine);
      gameStore.registerPlayerGame(playerId, gameId);
      socket.data.currentGameId = gameId;

      void socket.join(gameId);

      io.to(gameId).emit('lobby:updated', { lobby: engine.getLobbyState() });

      idleMonitor.recordActivity();
      callback({ gameId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create game';
      callback({ error: message });
    }
  });

  // ─── lobby:join ─────────────────────────────────────────────────────────────

  socket.on('lobby:join', (payload, callback) => {
    const parseResult = gameIdSchema.safeParse(payload);
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

    if (engine.getStatus() !== 'waiting') {
      callback({ error: 'Game already started' });
      return;
    }

    try {
      const player: Player = {
        playerId,
        username,
        type: 'human',
        connected: true,
        socketId: socket.id,
      };

      engine.addPlayer(player);
      gameStore.registerPlayerGame(playerId, gameId);
      socket.data.currentGameId = gameId;

      void socket.join(gameId);

      io.to(gameId).emit('lobby:updated', { lobby: engine.getLobbyState() });

      idleMonitor.recordActivity();
      callback({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join game';
      callback({ error: message });
    }
  });

  // ─── lobby:leave ────────────────────────────────────────────────────────────

  socket.on('lobby:leave', (payload, callback) => {
    const parseResult = gameIdSchema.safeParse(payload);
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

    try {
      engine.removePlayer(playerId);
      gameStore.unregisterPlayer(playerId);
      socket.data.currentGameId = undefined;

      void socket.leave(gameId);

      const remainingPlayers = engine.getState().players;
      if (remainingPlayers.length === 0) {
        gameStore.remove(gameId);
      } else {
        io.to(gameId).emit('lobby:updated', { lobby: engine.getLobbyState() });
      }

      callback({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave game';
      callback({ error: message });
    }
  });

  // ─── lobby:start ────────────────────────────────────────────────────────────

  socket.on('lobby:start', (payload, callback) => {
    const parseResult = gameIdSchema.safeParse(payload);
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

    if (!engine.isHost(playerId)) {
      callback({ error: 'Only the host can start the game' });
      return;
    }

    try {
      engine.startGame();

      io.to(gameId).emit('lobby:gameStarted', { gameId });

      // Send personalized round state to each player
      for (const player of engine.getState().players) {
        const playerSocket = findSocketByPlayerId(io, player.playerId);
        if (playerSocket) {
          playerSocket.emit('game:roundStarted', {
            gameId,
            round: engine.getStateView(player.playerId).currentRound!,
            scores: engine.getState().scores,
          });
        }
      }

      idleMonitor.recordActivity();
      callback({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      callback({ error: message });
    }
  });
}

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
