import { CompletedGameRecord, UserRecord } from '@oh-hell/shared';

export interface IUserRepository {
  createUser(user: UserRecord): Promise<void>;
  getUserByUsername(username: string): Promise<UserRecord | null>;
  getUserById(userId: string): Promise<UserRecord | null>;
  saveCompletedGame(game: CompletedGameRecord): Promise<void>;
  getGameHistory(gameId: string): Promise<CompletedGameRecord | null>;
}
