import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { IUserRepository } from '../services/IUserRepository';
import { UserRecord } from '@oh-hell/shared';

const router = Router();
let dynamoDBService: IUserRepository;

export function setUserRepository(repo: IUserRepository): void {
  dynamoDBService = repo;
}

const SALT_ROUNDS = 10;

const authSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Username must be alphanumeric'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as {
      playerId: string;
      username: string;
    };
    req.user = { playerId: payload.playerId, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── POST /register ───────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parseResult = authSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { username, password } = parseResult.data;

  try {
    const existing = await dynamoDBService.getUserByUsername(username);
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();
    const now = new Date().toISOString();

    const userRecord: UserRecord = {
      userId,
      username,
      passwordHash,
      createdAt: now,
    };

    await dynamoDBService.createUser(userRecord);

    const token = jwt.sign(
      { playerId: userId, username },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    res.status(201).json({ token, playerId: userId, username });
  } catch (error) {
    console.error('[auth/register] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /login ──────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parseResult = authSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { username, password } = parseResult.data;

  try {
    const user = await dynamoDBService.getUserByUsername(username);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { playerId: user.userId, username: user.username },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    res.status(200).json({ token, playerId: user.userId, username: user.username });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /me ──────────────────────────────────────────────────────────────────

router.get('/me', authenticateToken, (req: Request, res: Response): void => {
  res.status(200).json({ playerId: req.user!.playerId, username: req.user!.username });
});

export default router;
