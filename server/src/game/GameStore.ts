import { GameEngine } from './GameEngine';

/**
 * In-memory store for active game engines.
 * Only completed games are written to DynamoDB.
 */
export class GameStore {
  private games = new Map<string, GameEngine>();
  private playerGameMap = new Map<string, string>(); // playerId → gameId

  add(engine: GameEngine): void {
    const gameId = engine.getGameId();
    this.games.set(gameId, engine);
  }

  get(gameId: string): GameEngine | undefined {
    return this.games.get(gameId);
  }

  remove(gameId: string): void {
    const engine = this.games.get(gameId);
    if (engine) {
      const state = engine.getState();
      for (const player of state.players) {
        this.playerGameMap.delete(player.playerId);
      }
    }
    this.games.delete(gameId);
  }

  getByPlayer(playerId: string): GameEngine | undefined {
    const gameId = this.playerGameMap.get(playerId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

  registerPlayerGame(playerId: string, gameId: string): void {
    this.playerGameMap.set(playerId, gameId);
  }

  unregisterPlayer(playerId: string): void {
    this.playerGameMap.delete(playerId);
  }

  getActiveGameIds(): string[] {
    return [...this.games.keys()];
  }

  count(): number {
    return this.games.size;
  }

  /** Returns all open lobbies (status === 'waiting') */
  getOpenLobbies() {
    const lobbies = [];
    for (const engine of this.games.values()) {
      if (engine.getStatus() === 'waiting') {
        lobbies.push(engine.getLobbyState());
      }
    }
    return lobbies;
  }
}

// Singleton export — one store for the lifetime of the process
export const gameStore = new GameStore();
