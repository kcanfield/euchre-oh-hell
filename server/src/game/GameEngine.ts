import { v4 as uuidv4 } from 'uuid';
import {
  Card,
  GameState,
  GameStateView,
  Player,
  PlayerScore,
  RoundResult,
  RoundState,
  RoundStateView,
  Suit,
} from '@oh-hell/shared';
import { createDeck, dealCards, shuffleDeck } from './Deck';
import { buildRoundSchedule } from './RoundScheduler';
import {
  computeRoundResults,
  determineWinner,
  getForbiddenDealerBid,
} from './Scoring';
import { evaluateTrick, isLegalPlay } from './TrickEvaluator';

export interface BidResult {
  playerId: string;
  bid: number;
  totalBids: number;
  bids: Record<string, number | null>;
  nextBidderId: string | null;
  biddingComplete: boolean;
}

export interface PlayCardResult {
  playerId: string;
  card: Card;
  trickComplete: boolean;
  trickWinnerId?: string;
  tricksTaken?: Record<string, number>;
  nextPlayerId: string | null;
  roundComplete: boolean;
  roundResults?: RoundResult[];
  updatedScores?: PlayerScore[];
  gameComplete: boolean;
  winnerId?: string;
}

export class GameEngine {
  private state: GameState;

  constructor(gameId: string, hostId: string, hostUsername: string) {
    this.state = {
      gameId,
      status: 'waiting',
      players: [
        {
          playerId: hostId,
          username: hostUsername,
          type: 'human',
          connected: true,
        },
      ],
      hostId,
      roundSchedule: [],
      currentRoundIndex: -1,
      currentRound: null,
      scores: [
        { playerId: hostId, username: hostUsername, totalScore: 0, roundScores: [] },
      ],
      winnerId: null,
      startedAt: null,
    };
  }

  // ─── Player Management ────────────────────────────────────────────────────

  addPlayer(player: Player): void {
    if (this.state.status !== 'waiting') {
      throw new Error('Cannot join a game that has already started');
    }
    if (this.state.players.length >= 7) {
      throw new Error('Game is full (max 7 players)');
    }
    if (this.state.players.find((p) => p.playerId === player.playerId)) {
      throw new Error('Player already in game');
    }
    this.state.players.push(player);
    this.state.scores.push({
      playerId: player.playerId,
      username: player.username,
      totalScore: 0,
      roundScores: [],
    });
  }

  removePlayer(playerId: string): void {
    if (this.state.status !== 'waiting') {
      // In a live game, mark disconnected instead of removing
      this.setPlayerConnected(playerId, false);
      return;
    }
    this.state.players = this.state.players.filter(
      (p) => p.playerId !== playerId,
    );
    this.state.scores = this.state.scores.filter(
      (s) => s.playerId !== playerId,
    );
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.state.players.find((p) => p.playerId === playerId);
    if (player) player.connected = connected;
  }

  setPlayerSocketId(playerId: string, socketId: string): void {
    const player = this.state.players.find((p) => p.playerId === playerId);
    if (player) player.socketId = socketId;
  }

  // ─── Game Start ───────────────────────────────────────────────────────────

  startGame(): void {
    if (this.state.players.length < 3) {
      throw new Error('Need at least 3 players to start');
    }
    if (this.state.status !== 'waiting') {
      throw new Error('Game has already started');
    }

    this.state.roundSchedule = buildRoundSchedule(this.state.players.length);
    this.state.currentRoundIndex = -1;
    this.state.startedAt = new Date().toISOString();
    this.startNextRound();
  }

  // ─── Round Management ─────────────────────────────────────────────────────

  private startNextRound(): void {
    this.state.currentRoundIndex++;
    const handSize = this.state.roundSchedule[this.state.currentRoundIndex];
    const playerIds = this.state.players.map((p) => p.playerId);

    // Dealer rotates each round (index of round)
    const dealerIndex = this.state.currentRoundIndex % playerIds.length;
    const dealerId = playerIds[dealerIndex];

    // First bidder is left of dealer
    const firstBidderIndex = (dealerIndex + 1) % playerIds.length;
    const firstBidderId = playerIds[firstBidderIndex];

    const deck = shuffleDeck(createDeck());
    const { hands, trumpCard } = dealCards(deck, playerIds, handSize);

    const bids: Record<string, number | null> = {};
    const tricksTaken: Record<string, number> = {};
    for (const id of playerIds) {
      bids[id] = null;
      tricksTaken[id] = 0;
    }

    this.state.currentRound = {
      roundNumber: this.state.currentRoundIndex + 1,
      handSize,
      trumpCard,
      trumpSuit: trumpCard?.suit ?? null,
      dealerId,
      currentPlayerId: firstBidderId,
      phase: 'bidding',
      bids,
      tricksTaken,
      currentTrick: [],
      trickLeaderId: null,
      trickNumber: 1,
      hands,
    };

    this.state.status = 'bidding';
  }

  // ─── Bidding ──────────────────────────────────────────────────────────────

  placeBid(playerId: string, bid: number): BidResult {
    const round = this.requireRound();

    if (round.phase !== 'bidding') {
      throw new Error('Not in bidding phase');
    }
    if (round.currentPlayerId !== playerId) {
      throw new Error('Not your turn to bid');
    }
    if (bid < 0 || bid > round.handSize || !Number.isInteger(bid)) {
      throw new Error(`Bid must be an integer between 0 and ${round.handSize}`);
    }

    // Screw the Dealer rule
    if (playerId === round.dealerId) {
      const otherBids = Object.entries(round.bids)
        .filter(([id, v]) => id !== playerId && v !== null)
        .map(([, v]) => v as number);
      const forbidden = getForbiddenDealerBid(round.handSize, otherBids);
      if (forbidden !== null && bid === forbidden) {
        throw new Error(
          `Dealer cannot bid ${bid} — it would make total bids equal tricks available`,
        );
      }
    }

    round.bids[playerId] = bid;

    const playerIds = this.state.players.map((p) => p.playerId);
    const totalBids = Object.values(round.bids)
      .filter((b) => b !== null)
      .reduce((s, b) => s + (b as number), 0);

    const biddingComplete = Object.values(round.bids).every((b) => b !== null);

    let nextBidderId: string | null = null;
    if (!biddingComplete) {
      const idx = playerIds.indexOf(playerId);
      nextBidderId = playerIds[(idx + 1) % playerIds.length];
      round.currentPlayerId = nextBidderId;
    } else {
      // Transition to playing phase
      round.phase = 'playing';
      this.state.status = 'playing';

      // First player is left of dealer
      const dealerIdx = playerIds.indexOf(round.dealerId);
      const firstPlayerIdx = (dealerIdx + 1) % playerIds.length;
      round.currentPlayerId = playerIds[firstPlayerIdx];
      round.trickLeaderId = round.currentPlayerId;
    }

    return {
      playerId,
      bid,
      totalBids,
      bids: { ...round.bids },
      nextBidderId,
      biddingComplete,
    };
  }

  // ─── Card Play ────────────────────────────────────────────────────────────

  playCard(playerId: string, cardId: string): PlayCardResult {
    const round = this.requireRound();

    if (round.phase !== 'playing') {
      throw new Error('Not in playing phase');
    }
    if (round.currentPlayerId !== playerId) {
      throw new Error('Not your turn to play');
    }

    const hand = round.hands[playerId];
    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      throw new Error('Card not in your hand');
    }

    const card = hand[cardIndex];

    if (!isLegalPlay(card, hand, round.currentTrick)) {
      throw new Error('Illegal play — you must follow suit');
    }

    // Remove card from hand
    hand.splice(cardIndex, 1);
    round.currentTrick.push({ card, playerId });

    const playerIds = this.state.players.map((p) => p.playerId);
    const trickFull = round.currentTrick.length === playerIds.length;

    if (!trickFull) {
      // Advance to next player
      const idx = playerIds.indexOf(playerId);
      round.currentPlayerId = playerIds[(idx + 1) % playerIds.length];

      return {
        playerId,
        card,
        trickComplete: false,
        nextPlayerId: round.currentPlayerId,
        roundComplete: false,
        gameComplete: false,
      };
    }

    // ── Trick complete ──
    const trickWinnerId = evaluateTrick(round.currentTrick, round.trumpSuit);
    round.tricksTaken[trickWinnerId] = (round.tricksTaken[trickWinnerId] ?? 0) + 1;
    const trickCards = [...round.currentTrick];
    const tricksTaken = { ...round.tricksTaken };

    round.currentTrick = [];
    round.trickNumber++;

    // Check if round is complete (all hands empty)
    const roundComplete = Object.values(round.hands).every(
      (h) => h.length === 0,
    );

    if (!roundComplete) {
      // Trick winner leads next trick
      round.currentPlayerId = trickWinnerId;
      round.trickLeaderId = trickWinnerId;

      return {
        playerId,
        card,
        trickComplete: true,
        trickWinnerId,
        tricksTaken,
        nextPlayerId: trickWinnerId,
        roundComplete: false,
        gameComplete: false,
      };
    }

    // ── Round complete ──
    this.state.status = 'round_summary';
    const bids = round.bids as Record<string, number>;
    const { results: roundResults, updatedScores } = computeRoundResults(
      bids,
      tricksTaken,
      this.state.scores,
    );
    this.state.scores = updatedScores;

    // Check if game is complete
    const gameComplete =
      this.state.currentRoundIndex >= this.state.roundSchedule.length - 1;

    if (gameComplete) {
      this.state.status = 'game_over';
      this.state.winnerId = determineWinner(updatedScores);
      this.state.currentRound = null;

      return {
        playerId,
        card,
        trickComplete: true,
        trickWinnerId,
        tricksTaken,
        nextPlayerId: null,
        roundComplete: true,
        roundResults,
        updatedScores,
        gameComplete: true,
        winnerId: this.state.winnerId,
      };
    }

    // Prepare next round
    this.startNextRound();

    return {
      playerId,
      card,
      trickComplete: true,
      trickWinnerId,
      tricksTaken,
      nextPlayerId: this.state.currentRound!.currentPlayerId,
      roundComplete: true,
      roundResults,
      updatedScores,
      gameComplete: false,
    };
  }

  // ─── State Access ─────────────────────────────────────────────────────────

  getState(): GameState {
    return this.state;
  }

  /**
   * Returns a client-safe view of game state for a specific player.
   * Hides other players' hands; only shows the requesting player's hand.
   */
  getStateView(playerId: string): GameStateView {
    const { currentRound, roundSchedule, ...rest } = this.state;

    let roundView: RoundStateView | null = null;
    if (currentRound) {
      const { hands, ...roundRest } = currentRound;
      const myHand = hands[playerId] ?? [];
      const handSizes: Record<string, number> = {};
      for (const [pid, hand] of Object.entries(hands)) {
        handSizes[pid] = hand.length;
      }

      roundView = {
        ...roundRest,
        myHand,
        handSizes,
      };
    }

    return {
      ...rest,
      totalRounds: roundSchedule.length,
      currentRound: roundView,
    };
  }

  getLobbyState() {
    return {
      gameId: this.state.gameId,
      hostId: this.state.hostId,
      players: this.state.players,
      status: this.state.status === 'waiting' ? ('waiting' as const) : ('in_progress' as const),
      maxPlayers: 7,
      minPlayers: 3,
    };
  }

  isHost(playerId: string): boolean {
    return this.state.hostId === playerId;
  }

  hasPlayer(playerId: string): boolean {
    return this.state.players.some((p) => p.playerId === playerId);
  }

  getStatus() {
    return this.state.status;
  }

  getGameId() {
    return this.state.gameId;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private requireRound(): RoundState {
    if (!this.state.currentRound) {
      throw new Error('No active round');
    }
    return this.state.currentRound;
  }
}
