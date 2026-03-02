// ─── Card Types ─────────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;   // e.g. "hearts-A"
  suit: Suit;
  rank: Rank;
}

// ─── Player Types ────────────────────────────────────────────────────────────

export type PlayerType = 'human' | 'bot';

export interface Player {
  playerId: string;
  username: string;
  type: PlayerType;
  socketId?: string;
  connected: boolean;
}

// ─── Lobby Types ─────────────────────────────────────────────────────────────

export type LobbyStatus = 'waiting' | 'in_progress';

export interface LobbyState {
  gameId: string;
  hostId: string;
  players: Player[];
  status: LobbyStatus;
  maxPlayers: number;
  minPlayers: number;
}

// ─── Round & Trick Types ─────────────────────────────────────────────────────

export interface TrickCard {
  card: Card;
  playerId: string;
}

export interface RoundResult {
  playerId: string;
  username: string;
  bid: number;
  tricksTaken: number;
  roundScore: number;
}

export type RoundPhase = 'bidding' | 'playing';

export interface RoundState {
  roundNumber: number;
  handSize: number;
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  dealerId: string;
  currentPlayerId: string;
  phase: RoundPhase;
  bids: Record<string, number | null>;
  tricksTaken: Record<string, number>;
  currentTrick: TrickCard[];
  trickLeaderId: string | null;
  trickNumber: number;
  hands: Record<string, Card[]>;
}

// ─── Score Types ─────────────────────────────────────────────────────────────

export interface PlayerScore {
  playerId: string;
  username: string;
  totalScore: number;
  roundScores: number[];
}

// ─── Game State Types (server-internal) ─────────────────────────────────────

export type GameStatus =
  | 'waiting'
  | 'bidding'
  | 'playing'
  | 'round_summary'
  | 'game_over';

export interface GameState {
  gameId: string;
  status: GameStatus;
  players: Player[];
  hostId: string;
  roundSchedule: number[];
  currentRoundIndex: number;
  currentRound: RoundState | null;
  scores: PlayerScore[];
  winnerId: string | null;
  startedAt: string | null;
}

// ─── Client-Safe View Types ───────────────────────────────────────────────────

export interface RoundStateView {
  roundNumber: number;
  handSize: number;
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  dealerId: string;
  currentPlayerId: string;
  phase: RoundPhase;
  bids: Record<string, number | null>;
  tricksTaken: Record<string, number>;
  currentTrick: TrickCard[];
  trickLeaderId: string | null;
  trickNumber: number;
  myHand: Card[];
  handSizes: Record<string, number>;
}

export interface GameStateView {
  gameId: string;
  status: GameStatus;
  players: Player[];
  hostId: string;
  totalRounds: number;
  currentRoundIndex: number;
  currentRound: RoundStateView | null;
  scores: PlayerScore[];
  winnerId: string | null;
  startedAt: string | null;
}

// ─── Socket.IO Event Payloads ─────────────────────────────────────────────────

// Client → Server
export interface CS_LobbyCreate {
  // no payload needed
}

export interface CS_LobbyJoin {
  gameId: string;
}

export interface CS_LobbyLeave {
  gameId: string;
}

export interface CS_LobbyStart {
  gameId: string;
}

export interface CS_GameBid {
  gameId: string;
  bid: number;
}

export interface CS_GamePlayCard {
  gameId: string;
  cardId: string;
}

export interface CS_GameRequestState {
  gameId: string;
}

// Server → Client
export interface SC_LobbyUpdated {
  lobby: LobbyState;
}

export interface SC_LobbyGameStarted {
  gameId: string;
}

export interface SC_GameRoundStarted {
  gameId: string;
  round: RoundStateView;
  scores: PlayerScore[];
}

export interface SC_GameBiddingStarted {
  gameId: string;
  dealerId: string;
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  handSize: number;
  firstBidderId: string;
}

export interface SC_GameBidPlaced {
  gameId: string;
  playerId: string;
  bid: number;
  totalBids: number;
  bids: Record<string, number | null>;
}

export interface SC_GameBiddingComplete {
  gameId: string;
  bids: Record<string, number>;
  firstPlayerId: string;
}

export interface SC_GameCardPlayed {
  gameId: string;
  playerId: string;
  card: Card;
  currentTrick: TrickCard[];
  nextPlayerId: string | null;
}

export interface SC_GameTrickComplete {
  gameId: string;
  winnerId: string;
  trickCards: TrickCard[];
  tricksTaken: Record<string, number>;
  nextPlayerId: string | null;
}

export interface SC_GameRoundComplete {
  gameId: string;
  roundResults: RoundResult[];
  scores: PlayerScore[];
  nextRoundIn: number;
}

export interface SC_GameComplete {
  gameId: string;
  finalScores: PlayerScore[];
  winnerId: string;
}

export interface SC_GameStateSync {
  gameState: GameStateView;
}

export interface SC_GameError {
  message: string;
  code: string;
}

export interface SC_PlayerConnected {
  playerId: string;
  username: string;
}

export interface SC_PlayerDisconnected {
  playerId: string;
  username: string;
}

// ─── Socket.IO Event Map (typed interface) ───────────────────────────────────

export interface ServerToClientEvents {
  'lobby:updated': (payload: SC_LobbyUpdated) => void;
  'lobby:gameStarted': (payload: SC_LobbyGameStarted) => void;
  'game:roundStarted': (payload: SC_GameRoundStarted) => void;
  'game:biddingStarted': (payload: SC_GameBiddingStarted) => void;
  'game:bidPlaced': (payload: SC_GameBidPlaced) => void;
  'game:biddingComplete': (payload: SC_GameBiddingComplete) => void;
  'game:cardPlayed': (payload: SC_GameCardPlayed) => void;
  'game:trickComplete': (payload: SC_GameTrickComplete) => void;
  'game:roundComplete': (payload: SC_GameRoundComplete) => void;
  'game:complete': (payload: SC_GameComplete) => void;
  'game:stateSync': (payload: SC_GameStateSync) => void;
  'game:error': (payload: SC_GameError) => void;
  'player:connected': (payload: SC_PlayerConnected) => void;
  'player:disconnected': (payload: SC_PlayerDisconnected) => void;
}

export interface ClientToServerEvents {
  'lobby:create': (callback: (response: { gameId: string } | { error: string }) => void) => void;
  'lobby:join': (payload: CS_LobbyJoin, callback: (response: { success: boolean } | { error: string }) => void) => void;
  'lobby:leave': (payload: CS_LobbyLeave, callback: (response: { success: boolean } | { error: string }) => void) => void;
  'lobby:start': (payload: CS_LobbyStart, callback: (response: { success: boolean } | { error: string }) => void) => void;
  'game:bid': (payload: CS_GameBid, callback: (response: { success: boolean } | { error: string }) => void) => void;
  'game:playCard': (payload: CS_GamePlayCard, callback: (response: { success: boolean } | { error: string }) => void) => void;
  'game:requestState': (payload: CS_GameRequestState, callback: (response: SC_GameStateSync | { error: string }) => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  username: string;
  currentGameId?: string;
}

// ─── REST API Types ───────────────────────────────────────────────────────────

export interface AuthRegisterRequest {
  username: string;
  password: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  playerId: string;
  username: string;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

// ─── DynamoDB Record Types ────────────────────────────────────────────────────

export interface UserRecord {
  userId: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface CompletedGameRecord {
  gameId: string;
  completedAt: string;
  playerIds: string[];
  finalScores: PlayerScore[];
  winnerId: string;
  roundCount: number;
  startedAt: string;
}
