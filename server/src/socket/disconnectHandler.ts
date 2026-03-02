import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@oh-hell/shared';
import { gameStore } from '../game/GameStore';

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

export function registerDisconnectHandler(
  io: AppServer,
  socket: AppSocket,
): void {
  socket.on('disconnect', (reason) => {
    const { playerId, username } = socket.data;

    console.log(
      `[disconnect] Socket ${socket.id} disconnected (playerId=${playerId}, reason=${reason})`,
    );

    const engine = gameStore.getByPlayer(playerId);
    if (engine) {
      const gameId = engine.getGameId();

      engine.setPlayerConnected(playerId, false);

      io.to(gameId).emit('player:disconnected', { playerId, username });
    }
  });
}
