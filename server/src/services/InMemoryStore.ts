import { CompletedGameRecord, UserRecord } from '@oh-hell/shared';
import { IUserRepository } from './IUserRepository';

/**
 * In-memory store for local development — no AWS credentials required.
 * Data is lost when the server restarts.
 */
export class InMemoryStore implements IUserRepository {
  private users = new Map<string, UserRecord>();          // userId → record
  private usersByName = new Map<string, UserRecord>();    // username → record
  private games = new Map<string, CompletedGameRecord>(); // gameId → record

  async createUser(user: UserRecord): Promise<void> {
    this.users.set(user.userId, user);
    this.usersByName.set(user.username, user);
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    return this.usersByName.get(username) ?? null;
  }

  async getUserById(userId: string): Promise<UserRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async saveCompletedGame(game: CompletedGameRecord): Promise<void> {
    this.games.set(game.gameId, game);
  }

  async getGameHistory(gameId: string): Promise<CompletedGameRecord | null> {
    return this.games.get(gameId) ?? null;
  }
}
