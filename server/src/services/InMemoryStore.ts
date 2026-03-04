import fs from 'fs';
import path from 'path';
import { CompletedGameRecord, UserRecord } from '@oh-hell/shared';
import { IUserRepository } from './IUserRepository';

const DATA_FILE = path.resolve(__dirname, '../../../data/local-store.json');

interface StoreData {
  users: UserRecord[];
  games: CompletedGameRecord[];
}

function loadFromDisk(): StoreData {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as StoreData;
  } catch {
    return { users: [], games: [] };
  }
}

function ensureDataDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * In-memory store for local development backed by a JSON file.
 * Data survives server restarts.
 */
export class InMemoryStore implements IUserRepository {
  private users = new Map<string, UserRecord>();
  private usersByName = new Map<string, UserRecord>();
  private games = new Map<string, CompletedGameRecord>();

  constructor() {
    ensureDataDir();
    const data = loadFromDisk();
    for (const user of data.users) {
      this.users.set(user.userId, user);
      this.usersByName.set(user.username, user);
    }
    for (const game of data.games) {
      this.games.set(game.gameId, game);
    }
    console.log(
      `[InMemoryStore] Loaded ${this.users.size} user(s) and ${this.games.size} game(s) from ${DATA_FILE}`,
    );
  }

  async createUser(user: UserRecord): Promise<void> {
    this.users.set(user.userId, user);
    this.usersByName.set(user.username, user);
    this.persist();
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    return this.usersByName.get(username) ?? null;
  }

  async getUserById(userId: string): Promise<UserRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async saveCompletedGame(game: CompletedGameRecord): Promise<void> {
    this.games.set(game.gameId, game);
    this.persist();
  }

  async getGameHistory(gameId: string): Promise<CompletedGameRecord | null> {
    return this.games.get(gameId) ?? null;
  }

  private persist(): void {
    const data: StoreData = {
      users: [...this.users.values()],
      games: [...this.games.values()],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}
