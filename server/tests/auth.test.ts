/**
 * auth.test.ts
 *
 * Placeholder tests for the auth route. Since auth.ts does not yet exist,
 * we build a minimal Express app with a mock /api/auth/register endpoint
 * to validate the expected HTTP contract.
 */

import express, { Request, Response } from 'express';
import supertest from 'supertest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234'),
}));

// ─── Mock App ─────────────────────────────────────────────────────────────────

/**
 * Builds a test Express application that simulates the /api/auth/register route
 * without depending on a real database or auth module.
 */
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Simulated in-memory user store for the mock
  const users: Record<string, { userId: string; username: string; passwordHash: string }> = {};

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};

    // Validation: both fields are required
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }

    if (typeof username !== 'string' || username.trim().length === 0) {
      res.status(400).json({ error: 'username must be a non-empty string' });
      return;
    }

    if (typeof password !== 'string' || password.length < 1) {
      res.status(400).json({ error: 'password must be a non-empty string' });
      return;
    }

    // Duplicate username check
    if (users[username]) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    // Use mocked bcrypt and uuid
    const bcrypt = await import('bcryptjs');
    const { v4: uuidv4 } = await import('uuid');

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    users[username] = { userId, username, passwordHash };

    res.status(201).json({
      playerId: userId,
      username,
      token: 'mock-jwt-token',
    });
  });

  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildTestApp();
    jest.clearAllMocks();
  });

  describe('400 — missing or invalid fields', () => {
    it('returns 400 when both username and password are missing', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('returns 400 when username is missing', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .send({ password: 'secret123' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('returns 400 when password is missing', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'alice' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('returns 400 when the request body is empty', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('201 — successful registration', () => {
    it('returns 201 with playerId, username, and token for valid input', async () => {
      const bcrypt = await import('bcryptjs');
      const { v4: uuidv4 } = await import('uuid');

      const response = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'alice', password: 'secret123' })
        .expect(201);

      expect(response.body).toHaveProperty('playerId', 'mock-uuid-1234');
      expect(response.body).toHaveProperty('username', 'alice');
      expect(response.body).toHaveProperty('token');
    });

    it('calls bcrypt.hash with the provided password', async () => {
      const bcrypt = await import('bcryptjs');

      await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'bob', password: 'mypassword' })
        .expect(201);

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
    });

    it('calls uuidv4 to generate a player ID', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'carol', password: 'pass' })
        .expect(201);

      expect(uuidv4).toHaveBeenCalled();
    });

    it('returns the username from the request in the response body', async () => {
      const response = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'dave', password: 'hunter2' })
        .expect(201);

      expect(response.body.username).toBe('dave');
    });
  });

  describe('409 — duplicate username', () => {
    it('returns 409 when the same username is registered twice', async () => {
      await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'pass1' })
        .expect(201);

      const response = await supertest(app)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'pass2' })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already taken/i);
    });
  });
});
