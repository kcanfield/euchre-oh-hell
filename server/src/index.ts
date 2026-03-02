import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@oh-hell/shared';
import authRouter, { setUserRepository } from './routes/auth';
import { socketAuthMiddleware } from './socket/middleware';
import { registerLobbyHandlers } from './socket/lobbyHandlers';
import { registerGameHandlers } from './socket/gameHandlers';
import { registerDisconnectHandler } from './socket/disconnectHandler';
import { DynamoDBService } from './services/DynamoDBService';
import { InMemoryStore } from './services/InMemoryStore';
import { IUserRepository } from './services/IUserRepository';
import { createIdleMonitor } from './services/IdleMonitor';

const PORT = process.env.PORT ?? 3001;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ─── REST Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);

app.get('/api/status', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── Services ─────────────────────────────────────────────────────────────────

const isLocalDev = process.env.LOCAL_DEV_MODE === 'true';
const userRepository: IUserRepository = isLocalDev
  ? new InMemoryStore()
  : new DynamoDBService();

if (isLocalDev) {
  console.log('Running in LOCAL_DEV_MODE — using in-memory store (no AWS required)');
}

setUserRepository(userRepository);

const idleMonitor = createIdleMonitor(io);

// ─── Socket.IO ────────────────────────────────────────────────────────────────

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (${socket.data.username})`);

  registerLobbyHandlers(io, socket, idleMonitor);
  registerGameHandlers(io, socket, userRepository, idleMonitor);
  registerDisconnectHandler(io, socket);

  idleMonitor.recordActivity();
});

// ─── Start Server ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Oh Hell! server running on port ${PORT}`);
  idleMonitor.start();
});

export { app, httpServer };
