/**
 * Core types for the Flens engine.
 *
 * The engine is pure: no I/O, no wall-clock reads, no unseeded randomness.
 * Every state transition goes through `reduce(state, action)`.
 */

export interface Card {
  /** Stable identity, so a UI can animate a specific card around the table. */
  readonly id: number;
  /** 1..config.topValue */
  readonly value: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Every rule the sources disagree about is a knob. Defaults follow
 * `docs/spec-draft.md`; see `docs/research.md` for which are attested.
 */
export interface FlensConfig {
  /** Highest card value. Perry's original used 16; the "Pang" write-ups say 15. */
  readonly topValue: number;
  /** How many complete 1..topValue series make up the deck. */
  readonly seriesCount: number;
  /** Cards in each player's flensstok — the pile you race to empty. */
  readonly flensstokSize: number;
  /** Hand size, refilled from packets of this size. */
  readonly handSize: number;
  /**
   * `whenEmpty` follows the traditional packet-of-five rule: you take a fresh
   * packet only once your hand is completely used up (this can happen mid-turn,
   * and you keep playing). `everyTurn` tops you back up each turn, Skip-Bo style.
   */
  readonly refill: 'whenEmpty' | 'everyTurn';
  /** Personal face-up discard piles per player. */
  readonly openPileCount: number;
  /** Shared build piles in the centre. */
  readonly centrePileCount: number;

  /** If a legal centre play exists, you must make one ("voorrang"). */
  readonly centrePriority: boolean;
  /** A playable flensstok top must be played before an equivalent hand card. */
  readonly flensstokPriority: boolean;

  /** How you win. */
  readonly winCondition: 'flensstok' | 'allCards';

  /** Milliseconds others have to call FLENS! on an infraction. */
  readonly flensWindowMs: number;
  /** Milliseconds a turn may last, or null for no limit. */
  readonly turnTimeoutMs: number | null;
  /** Cards a wrong caller must add to their own flensstok. */
  readonly falseCallPenalty: number;

  /**
   * When the supply and the completed runs are both exhausted, pull the buried
   * cards out of every player's open piles (everything below each visible top)
   * and shuffle them back into the supply.
   *
   * Not attested in any source — an engine invention. Without it, cards drain
   * irreversibly into open piles and roughly a fifth of two-player games end in
   * a draw. See `docs/research.md`.
   */
  readonly recycleBuriedCards: boolean;

  /**
   * Turns without a single legal centre play before the game is called a draw.
   *
   * A safety net against livelock: only the top card of a flensstok is
   * reachable, so a position where every remaining `1` sits buried in one — with
   * all centre piles empty — can never progress. `newGame` avoids dealing such a
   * position, but play can wander back into an equivalent dead end, and an
   * engine that can spin forever is a server hazard.
   */
  readonly idleTurnsBeforeStalemate: number;

  /**
   * If true, an out-of-sequence card that nobody catches *stays*, and the pile
   * continues from its value — you got away with it. This is faithful to the
   * physical game and is the whole reason the Flens call has teeth. Set false
   * for a gentler game where uncaught errors are silently reverted.
   */
  readonly uncaughtErrorsStand: boolean;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

/** Where a card is played *from*. */
export type CardSource =
  | { readonly kind: 'hand'; readonly index: number }
  | { readonly kind: 'flensstok' }
  | { readonly kind: 'openPile'; readonly index: number };

/** Where a card is played *to*. */
export type PlayTarget = { readonly kind: 'centre'; readonly index: number };

// ---------------------------------------------------------------------------
// Infractions — the heart of the hybrid model
// ---------------------------------------------------------------------------

export type InfractionKind =
  /** Played a card that does not continue the centre pile's sequence. */
  | 'outOfSequence'
  /** Ended the turn while a legal centre play was available. */
  | 'missedCentrePlay'
  /** Played from hand while the flensstok top was equally playable. */
  | 'ignoredFlensstok';

/**
 * A rule error that the engine deliberately *allowed*, and that other players
 * may punish by calling FLENS! before the window closes.
 */
export interface Infraction {
  readonly kind: InfractionKind;
  /** Player who committed it. */
  readonly offender: number;
  /** Engine time (ms) at which it happened. */
  readonly at: number;
  /** Human-readable explanation, for the UI and for test assertions. */
  readonly detail: string;
  /**
   * Enough information to undo an `outOfSequence` play if it gets caught:
   * which centre pile the bad card landed on and where it came from.
   */
  readonly revert?: {
    readonly centreIndex: number;
    readonly card: Card;
    readonly source: CardSource;
  };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface PlayerState {
  readonly id: number;
  readonly name: string;
  /** Face down; only the top card is public. Empty it to win. */
  readonly flensstok: readonly Card[];
  /** Private to this player. */
  readonly hand: readonly Card[];
  /** Face up; tops are public and playable by their owner. */
  readonly openPiles: readonly (readonly Card[])[];
}

export interface CentrePile {
  readonly cards: readonly Card[];
}

export interface GameState {
  readonly config: FlensConfig;
  readonly rng: number;
  /** Monotonic engine clock in ms, advanced only by `tick` actions. */
  readonly now: number;

  readonly players: readonly PlayerState[];
  readonly centre: readonly CentrePile[];
  /** Face-down draw supply. */
  readonly voorraad: readonly Card[];
  /** Cards from completed 1..topValue runs, recycled when the voorraad runs dry. */
  readonly completed: readonly Card[];

  readonly currentPlayer: number;
  /** `stalemate` means the supply is gone and nobody can move — a draw. */
  readonly phase: 'playing' | 'finished' | 'stalemate';
  readonly winner: number | null;
  /** Consecutive passes; a full round of them ends the game in stalemate. */
  readonly consecutivePasses: number;
  /** Turns since anyone last played a card to the centre legally. */
  readonly idleTurns: number;

  /** The one infraction currently open to a FLENS! call, if any. */
  readonly pendingInfraction: Infraction | null;

  readonly log: readonly LogEntry[];
}

export interface LogEntry {
  readonly at: number;
  readonly message: string;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { readonly type: 'play'; readonly player: number; readonly from: CardSource; readonly to: PlayTarget }
  | { readonly type: 'discard'; readonly player: number; readonly handIndex: number; readonly openPileIndex: number }
  | { readonly type: 'callFlens'; readonly player: number; readonly fromPile?: number }
  /**
   * End your turn without discarding. Only possible once the supply is gone and
   * you hold nothing playable — otherwise you are obliged to play or discard.
   */
  | { readonly type: 'pass'; readonly player: number }
  /** Advance the engine clock. Closes expired Flens windows and turn timers. */
  | { readonly type: 'tick'; readonly ms: number };

/**
 * Result of `reduce`. A rejected action leaves the state untouched — rejections
 * are for *impossible* actions (a card you don't hold, a turn that isn't yours).
 * Rule errors of judgement are not rejected; they become infractions.
 */
export type ReduceResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly state: GameState; readonly reason: string };
