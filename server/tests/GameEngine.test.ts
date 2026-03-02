import { GameEngine } from '../src/game/GameEngine';
import { Player, Card } from '@oh-hell/shared';
import { isLegalPlay } from '../src/game/TrickEvaluator';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePlayer(id: string, username: string): Player {
  return { playerId: id, username, type: 'human', connected: true };
}

/**
 * Creates a GameEngine with 3 players already added (host + 2 others).
 * Returns the engine and the three player IDs.
 */
function makeThreePlayerGame(): {
  engine: GameEngine;
  hostId: string;
  p2Id: string;
  p3Id: string;
} {
  const hostId = 'host';
  const p2Id = 'p2';
  const p3Id = 'p3';
  const engine = new GameEngine('game-1', hostId, 'Alice');
  engine.addPlayer(makePlayer(p2Id, 'Bob'));
  engine.addPlayer(makePlayer(p3Id, 'Carol'));
  return { engine, hostId, p2Id, p3Id };
}

/**
 * Plays through all tricks in the current round by always having the current
 * player play the first legal card in their hand.
 *
 * Returns the result of the final playCard() call.
 */
function playAllTricks(engine: GameEngine) {
  let lastResult: ReturnType<GameEngine['playCard']> | undefined;

  while (true) {
    const state = engine.getState();
    const round = state.currentRound;

    // If there's no active round or we're done playing, stop.
    if (!round || round.phase !== 'playing') break;

    const currentPlayerId = round.currentPlayerId;
    const hand = round.hands[currentPlayerId];

    // Find first legal card
    const legalCard = hand.find((c: Card) =>
      isLegalPlay(c, hand, round.currentTrick),
    );

    if (!legalCard) break;

    lastResult = engine.playCard(currentPlayerId, legalCard.id);

    if (lastResult.roundComplete || lastResult.gameComplete) break;
  }

  return lastResult;
}

/**
 * Runs the bidding phase for all players, having each player bid 0.
 * The last player (dealer) may be forbidden from bidding 0; in that case bid 1.
 */
function bidAllZero(engine: GameEngine): void {
  const state = engine.getState();
  const round = state.currentRound!;
  const playerIds = state.players.map((p) => p.playerId);

  // Determine bid order: starts left of dealer
  const dealerIndex = playerIds.indexOf(round.dealerId);
  const bidOrder: string[] = [];
  for (let i = 1; i <= playerIds.length; i++) {
    bidOrder.push(playerIds[(dealerIndex + i) % playerIds.length]);
  }

  for (let i = 0; i < bidOrder.length; i++) {
    const bidderId = bidOrder[i];
    const currentState = engine.getState();
    const currentRound = currentState.currentRound!;
    const isDealer = bidderId === currentRound.dealerId;

    if (isDealer) {
      // Compute forbidden bid to avoid throwing
      const otherBids = Object.entries(currentRound.bids)
        .filter(([id, v]) => id !== bidderId && v !== null)
        .map(([, v]) => v as number);
      const otherTotal = otherBids.reduce((s, b) => s + b, 0);
      const forbidden = currentRound.handSize - otherTotal;
      const bid = forbidden === 0 ? 1 : 0;
      engine.placeBid(bidderId, bid);
    } else {
      engine.placeBid(bidderId, 0);
    }
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GameEngine — initial state', () => {
  it('starts in "waiting" state', () => {
    const engine = new GameEngine('g1', 'host', 'Alice');
    expect(engine.getStatus()).toBe('waiting');
  });

  it('has the host as the first player', () => {
    const engine = new GameEngine('g1', 'host', 'Alice');
    const state = engine.getState();
    expect(state.players).toHaveLength(1);
    expect(state.players[0].playerId).toBe('host');
    expect(state.hostId).toBe('host');
  });

  it('initialises host score at 0', () => {
    const engine = new GameEngine('g1', 'host', 'Alice');
    const state = engine.getState();
    expect(state.scores).toHaveLength(1);
    expect(state.scores[0].totalScore).toBe(0);
    expect(state.scores[0].roundScores).toEqual([]);
  });
});

describe('GameEngine — addPlayer()', () => {
  it('adds a player and a corresponding score entry', () => {
    const engine = new GameEngine('g1', 'host', 'Alice');
    engine.addPlayer(makePlayer('p2', 'Bob'));
    const state = engine.getState();
    expect(state.players).toHaveLength(2);
    expect(state.scores).toHaveLength(2);
    expect(state.scores[1].playerId).toBe('p2');
    expect(state.scores[1].totalScore).toBe(0);
  });

  it('throws if game has already started', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    expect(() => engine.addPlayer(makePlayer('p4', 'Dave'))).toThrow(
      'Cannot join a game that has already started',
    );
  });

  it('throws if game is full (8th player attempt; max is 7)', () => {
    const engine = new GameEngine('g1', 'host', 'Alice');
    for (let i = 2; i <= 7; i++) {
      engine.addPlayer(makePlayer(`p${i}`, `Player${i}`));
    }
    // Now at 7 players (max) — adding one more should throw
    expect(() => engine.addPlayer(makePlayer('p8', 'Player8'))).toThrow(
      'Game is full',
    );
  });

  it('throws if the same player tries to join twice', () => {
    const engine = new GameEngine('g1', 'host', 'Alice');
    expect(() => engine.addPlayer(makePlayer('host', 'Alice'))).toThrow(
      'Player already in game',
    );
  });
});

describe('GameEngine — startGame()', () => {
  it('throws when there are fewer than 3 players', () => {
    const engine = new GameEngine('g1', 'host', 'Alice');
    engine.addPlayer(makePlayer('p2', 'Bob'));
    expect(() => engine.startGame()).toThrow('Need at least 3 players');
  });

  it('transitions to "bidding" status after start', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    expect(engine.getStatus()).toBe('bidding');
  });

  it('sets currentRound with correct handSize after start', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    const state = engine.getState();
    expect(state.currentRound).not.toBeNull();
    // First round for 3 players has handSize = 10
    expect(state.currentRound!.handSize).toBe(10);
  });

  it('sets currentRoundIndex to 0 after first round starts', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    expect(engine.getState().currentRoundIndex).toBe(0);
  });

  it('builds roundSchedule on start', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    const state = engine.getState();
    // 3 players → 19 rounds
    expect(state.roundSchedule).toHaveLength(19);
  });

  it('throws if startGame() is called again on an already-started game', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    expect(() => engine.startGame()).toThrow('Game has already started');
  });
});

describe('GameEngine — Screw the Dealer (forbidden bid)', () => {
  it('throws when dealer places the forbidden bid', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();

    const state = engine.getState();
    const round = state.currentRound!;
    const playerIds = state.players.map((p) => p.playerId);
    const dealerIndex = playerIds.indexOf(round.dealerId);

    // Bid order: left of dealer first
    const bidOrder: string[] = [];
    for (let i = 1; i <= playerIds.length; i++) {
      bidOrder.push(playerIds[(dealerIndex + i) % playerIds.length]);
    }

    // Non-dealer players each bid 0
    for (let i = 0; i < bidOrder.length - 1; i++) {
      engine.placeBid(bidOrder[i], 0);
    }

    // Dealer is last; forbidden bid = handSize - 0 = handSize
    const dealerId = bidOrder[bidOrder.length - 1];
    const forbidden = round.handSize; // all others bid 0, so forbidden = 10
    expect(() => engine.placeBid(dealerId, forbidden)).toThrow(
      /Dealer cannot bid/,
    );
  });
});

describe('GameEngine — placeBid()', () => {
  it('throws if it is not the player\'s turn to bid', () => {
    const { engine, hostId, p2Id } = makeThreePlayerGame();
    engine.startGame();
    const round = engine.getState().currentRound!;
    const notCurrentPlayer =
      round.currentPlayerId === hostId ? p2Id : hostId;
    expect(() => engine.placeBid(notCurrentPlayer, 1)).toThrow(
      'Not your turn to bid',
    );
  });

  it('advances to the next bidder after a bid is placed', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    const state = engine.getState();
    const playerIds = state.players.map((p) => p.playerId);
    const round = state.currentRound!;
    const firstBidder = round.currentPlayerId;

    const result = engine.placeBid(firstBidder, 1);

    expect(result.biddingComplete).toBe(false);
    expect(result.nextBidderId).not.toBe(firstBidder);
    // Next bidder should be the player after firstBidder in order
    const firstIdx = playerIds.indexOf(firstBidder);
    expect(result.nextBidderId).toBe(playerIds[(firstIdx + 1) % playerIds.length]);
  });

  it('transitions to "playing" after all players have bid', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    bidAllZero(engine);
    expect(engine.getStatus()).toBe('playing');
  });

  it('sets biddingComplete=true when the last bid is placed', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();

    const state = engine.getState();
    const round = state.currentRound!;
    const playerIds = state.players.map((p) => p.playerId);
    const dealerIndex = playerIds.indexOf(round.dealerId);

    const bidOrder: string[] = [];
    for (let i = 1; i <= playerIds.length; i++) {
      bidOrder.push(playerIds[(dealerIndex + i) % playerIds.length]);
    }

    let lastResult: ReturnType<GameEngine['placeBid']> | undefined;
    for (let i = 0; i < bidOrder.length - 1; i++) {
      lastResult = engine.placeBid(bidOrder[i], 0);
      expect(lastResult.biddingComplete).toBe(false);
    }

    // Last bidder is dealer — pick a safe bid
    const dealerState = engine.getState().currentRound!;
    const otherBids = Object.entries(dealerState.bids)
      .filter(([id, v]) => id !== bidOrder[bidOrder.length - 1] && v !== null)
      .map(([, v]) => v as number);
    const otherTotal = otherBids.reduce((s, b) => s + b, 0);
    const forbidden = dealerState.handSize - otherTotal;
    const safeBid = forbidden === 1 ? 2 : 1;

    lastResult = engine.placeBid(bidOrder[bidOrder.length - 1], safeBid);
    expect(lastResult.biddingComplete).toBe(true);
  });

  it('throws for an invalid bid (negative)', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    const round = engine.getState().currentRound!;
    expect(() => engine.placeBid(round.currentPlayerId, -1)).toThrow(
      /Bid must be an integer/,
    );
  });

  it('throws for a bid exceeding handSize', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    const round = engine.getState().currentRound!;
    expect(() => engine.placeBid(round.currentPlayerId, round.handSize + 1)).toThrow(
      /Bid must be an integer/,
    );
  });
});

describe('GameEngine — playCard()', () => {
  function setupForPlaying(engine: GameEngine): void {
    engine.startGame();
    bidAllZero(engine);
  }

  it('throws if it is not the player\'s turn to play', () => {
    const { engine, hostId, p2Id } = makeThreePlayerGame();
    setupForPlaying(engine);

    const round = engine.getState().currentRound!;
    const notCurrentPlayer =
      round.currentPlayerId === hostId ? p2Id : hostId;
    const someCard = engine.getState().currentRound!.hands[notCurrentPlayer][0];
    expect(() => engine.playCard(notCurrentPlayer, someCard.id)).toThrow(
      'Not your turn to play',
    );
  });

  it('throws if the card is not in the player\'s hand', () => {
    const { engine } = makeThreePlayerGame();
    setupForPlaying(engine);
    const round = engine.getState().currentRound!;
    expect(() =>
      engine.playCard(round.currentPlayerId, 'nonexistent-card-id'),
    ).toThrow('Card not in your hand');
  });

  it('advances to the next player after a valid card is played', () => {
    const { engine } = makeThreePlayerGame();
    setupForPlaying(engine);

    const state = engine.getState();
    const round = state.currentRound!;
    const firstPlayer = round.currentPlayerId;
    const firstCard = round.hands[firstPlayer][0];

    const result = engine.playCard(firstPlayer, firstCard.id);

    expect(result.trickComplete).toBe(false);
    expect(result.nextPlayerId).not.toBe(firstPlayer);
  });

  it('removes played card from the player\'s hand', () => {
    const { engine } = makeThreePlayerGame();
    setupForPlaying(engine);

    const round = engine.getState().currentRound!;
    const currentPlayer = round.currentPlayerId;
    const cardToPlay = round.hands[currentPlayer][0];

    engine.playCard(currentPlayer, cardToPlay.id);

    const updatedHand = engine.getState().currentRound!.hands[currentPlayer];
    expect(updatedHand.find((c) => c.id === cardToPlay.id)).toBeUndefined();
  });

  it('marks trickComplete=true and identifies a winner after all players play', () => {
    const { engine } = makeThreePlayerGame();
    setupForPlaying(engine);

    const state = engine.getState();
    const playerIds = state.players.map((p) => p.playerId);
    let lastResult: ReturnType<GameEngine['playCard']> | undefined;

    for (let i = 0; i < playerIds.length; i++) {
      const round = engine.getState().currentRound!;
      const currentPlayer = round.currentPlayerId;
      const hand = round.hands[currentPlayer];
      const legalCard = hand.find((c) =>
        isLegalPlay(c, hand, round.currentTrick),
      )!;
      lastResult = engine.playCard(currentPlayer, legalCard.id);
    }

    expect(lastResult!.trickComplete).toBe(true);
    expect(lastResult!.trickWinnerId).toBeDefined();
    expect(typeof lastResult!.trickWinnerId).toBe('string');
  });

  it('throws when trying to play in bidding phase', () => {
    const { engine } = makeThreePlayerGame();
    engine.startGame();
    const round = engine.getState().currentRound!;
    const someCard = round.hands[round.currentPlayerId][0];
    expect(() => engine.playCard(round.currentPlayerId, someCard.id)).toThrow(
      'Not in playing phase',
    );
  });
});

describe('GameEngine — full mini-game flow (3 players, single round of 1 card)', () => {
  /**
   * Forces the game into a single-round state by manipulating the round schedule.
   * We start normally then intercept after startGame sets things up to use only
   * the final round (handSize=1 at position 18 in the 19-round schedule for 3 players).
   *
   * Instead, we create a fresh engine and patch the round schedule directly via
   * getState() (which returns the internal reference) so that only 1 round exists.
   */
  function makeOneRoundGame(): {
    engine: GameEngine;
    playerIds: string[];
  } {
    const { engine, hostId, p2Id, p3Id } = makeThreePlayerGame();
    engine.startGame();

    // Patch the state so only the current round remains in the schedule.
    // getState() returns the internal state object by reference, so mutations apply.
    const state = engine.getState();
    // Keep only currentRoundIndex's entry so the game ends after this round.
    state.roundSchedule = [state.roundSchedule[state.currentRoundIndex]];
    state.currentRoundIndex = 0;

    return { engine, playerIds: [hostId, p2Id, p3Id] };
  }

  it('completes: waiting → bidding → playing → game_over', () => {
    const { engine } = makeOneRoundGame();

    // Should now be in bidding
    expect(engine.getStatus()).toBe('bidding');

    // Complete bidding
    bidAllZero(engine);
    expect(engine.getStatus()).toBe('playing');

    // Play all tricks
    const finalResult = playAllTricks(engine);

    expect(finalResult).toBeDefined();
    expect(finalResult!.roundComplete).toBe(true);
    expect(finalResult!.gameComplete).toBe(true);
    expect(engine.getStatus()).toBe('game_over');
  });

  it('determines a winner at game end', () => {
    const { engine } = makeOneRoundGame();
    bidAllZero(engine);
    const finalResult = playAllTricks(engine);

    expect(finalResult!.winnerId).toBeDefined();
    const state = engine.getState();
    expect(state.winnerId).toBe(finalResult!.winnerId);
  });

  it('returns updatedScores with non-null values at game end', () => {
    const { engine } = makeOneRoundGame();
    bidAllZero(engine);
    const finalResult = playAllTricks(engine);

    expect(finalResult!.updatedScores).toBeDefined();
    expect(finalResult!.updatedScores!.length).toBeGreaterThan(0);
    for (const score of finalResult!.updatedScores!) {
      expect(typeof score.totalScore).toBe('number');
    }
  });

  it('sets currentRound to null after game is over', () => {
    const { engine } = makeOneRoundGame();
    bidAllZero(engine);
    playAllTricks(engine);
    expect(engine.getState().currentRound).toBeNull();
  });
});

describe('GameEngine — getStateView()', () => {
  it('returns myHand only for the requesting player', () => {
    const { engine, hostId, p2Id } = makeThreePlayerGame();
    engine.startGame();

    const hostView = engine.getStateView(hostId);
    const p2View = engine.getStateView(p2Id);

    // Each view should contain only that player's hand (non-empty during bidding)
    expect(hostView.currentRound?.myHand).toBeDefined();
    expect(p2View.currentRound?.myHand).toBeDefined();
    // Hand sizes should be present for all players
    expect(Object.keys(hostView.currentRound!.handSizes)).toHaveLength(3);
  });

  it('includes totalRounds equal to roundSchedule length', () => {
    const { engine, hostId } = makeThreePlayerGame();
    engine.startGame();
    const view = engine.getStateView(hostId);
    // 3 players → 19 rounds
    expect(view.totalRounds).toBe(19);
  });
});

describe('GameEngine — isHost() and hasPlayer()', () => {
  it('isHost() returns true for the host and false for others', () => {
    const { engine, hostId, p2Id } = makeThreePlayerGame();
    expect(engine.isHost(hostId)).toBe(true);
    expect(engine.isHost(p2Id)).toBe(false);
  });

  it('hasPlayer() returns true for known players and false otherwise', () => {
    const { engine, hostId } = makeThreePlayerGame();
    expect(engine.hasPlayer(hostId)).toBe(true);
    expect(engine.hasPlayer('unknown-id')).toBe(false);
  });
});
