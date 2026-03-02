import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@oh-hell/shared';

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

export function socketAuthMiddleware(
  socket: AppSocket,
  next: (err?: Error) => void,
): void {
  try {
    // Prefer token from handshake auth, fall back to Authorization header
    let token: string | undefined = socket.handshake.auth?.token as
      | string
      | undefined;

    if (!token) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      next(new Error('Authentication failed'));
      return;
    }

    const payload = jwt.verify(token, getJwtSecret()) as {
      playerId: string;
      username: string;
    };

    socket.data.playerId = payload.playerId;
    socket.data.username = payload.username;

    next();
  } catch {
    next(new Error('Authentication failed'));
  }
}
