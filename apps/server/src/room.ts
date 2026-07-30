/**
 * A single game room.
 *
 * Deliberately knows nothing about WebSockets: it takes actions in and emits
 * per-seat views out, so the whole thing is testable without a network. The
 * transport layer in `index.ts` is the only part that touches sockets.
 */

import {
  newGame,
  reduce,
  viewFor,
  type Action,
  type GameState,
  type GameView,
} from '@flens/engine';
import { PROFILES, botAction, botCallsFlens, type Difficulty } from '@flens/bot';
import type { BotDifficulty, ErrorReason, LobbyInfo, SeatInfo } from '@flens/protocol';

export const MAX_SEATS = 6;
export const TICK_MS = 100;

/** How long a bot waits before acting, so humans can watch and catch mistakes. */
const BOT_THINK_MIN_MS = 700;
const BOT_THINK_VARIANCE_MS = 900;

interface Seat {
  seat: number;
  name: string;
  kind: 'human' | 'bot';
  difficulty: BotDifficulty;
  /** Humans only. Identifies the seat across reconnects. */
  token: string;
  connected: boolean;
}

/** Bot reaction decisions, rolled once per infraction rather than per tick. */
interface FlensIntent {
  infractionAt: number;
  callers: Map<number, number>;
}

/**
 * A refusal, as a code the client can say in its own language. Never a
 * sentence: the server has no idea what the player reads.
 */
export interface Refusal {
  readonly error: ErrorReason;
}

export interface RoomEvents {
  /** A view changed and should be pushed to everyone. */
  onBroadcast: () => void;
}

export class Room {
  readonly code: string;
  private seats: Seat[] = [];
  private hostSeat = 0;
  private game: GameState | null = null;
  private topValue: number;
  private nextBotMoveAt = 0;
  private intent: FlensIntent | null = null;
  private events: RoomEvents;

  constructor(code: string, topValue: number, events: RoomEvents) {
    this.code = code;
    this.topValue = topValue;
    this.events = events;
  }

  get started(): boolean {
    return this.game !== null;
  }

  get isEmpty(): boolean {
    return this.seats.every((s) => s.kind === 'bot' || !s.connected);
  }

  get humanCount(): number {
    return this.seats.filter((s) => s.kind === 'human').length;
  }

  // -------------------------------------------------------------------------
  // Lobby
  // -------------------------------------------------------------------------

  addHuman(name: string, token: string): { seat: number } | Refusal {
    if (this.game) return { error: 'error.alreadyStarted' };
    if (this.seats.length >= MAX_SEATS) return { error: 'error.roomFull' };

    const seat: Seat = {
      seat: this.seats.length,
      // A stand-in name is not localised: a name is data, and the same seat has
      // to read the same way to everyone at the table.
      name: sanitiseName(name) || `Player ${this.seats.length + 1}`,
      kind: 'human',
      difficulty: 'normal',
      token,
      connected: true,
    };
    this.seats.push(seat);
    return { seat: seat.seat };
  }

  addBot(difficulty: BotDifficulty): Refusal | null {
    if (this.game) return { error: 'error.alreadyStarted' };
    if (this.seats.length >= MAX_SEATS) return { error: 'error.roomFull' };

    const names = ['Bram', 'Cato', 'Dirk', 'Eef', 'Fokke', 'Geert'];
    this.seats.push({
      seat: this.seats.length,
      name: names[this.seats.length % names.length] as string,
      kind: 'bot',
      difficulty,
      token: '',
      connected: true,
    });
    return null;
  }

  removeSeat(seat: number, byToken: string): Refusal | null {
    if (this.game) return { error: 'error.alreadyStarted' };
    const host = this.seats.find((s) => s.seat === this.hostSeat);
    if (!host || host.token !== byToken) return { error: 'error.hostOnly' };

    const target = this.seats.find((s) => s.seat === seat);
    if (!target) return { error: 'error.noSuchSeat' };
    if (target.kind === 'human') return { error: 'error.cannotRemovePlayer' };

    this.seats = this.seats.filter((s) => s.seat !== seat);
    this.reindexSeats();
    return null;
  }

  /** Seat numbers must stay contiguous, since the engine indexes players by them. */
  private reindexSeats(): void {
    this.seats = this.seats.map((s, index) => ({ ...s, seat: index }));
    this.hostSeat = 0;
  }

  resume(token: string): { seat: number } | Refusal {
    const seat = this.seats.find((s) => s.kind === 'human' && s.token === token);
    if (!seat) return { error: 'error.unknownToken' };
    seat.connected = true;
    return { seat: seat.seat };
  }

  disconnect(token: string): void {
    const seat = this.seats.find((s) => s.kind === 'human' && s.token === token);
    if (!seat) return;
    seat.connected = false;

    // Before the game starts a dropped player just frees their seat.
    if (!this.game) {
      this.seats = this.seats.filter((s) => s !== seat);
      this.reindexSeats();
    }
  }

  start(byToken: string): Refusal | null {
    if (this.game) return { error: 'error.alreadyStarted' };
    const host = this.seats.find((s) => s.seat === this.hostSeat);
    if (!host || host.token !== byToken) return { error: 'error.hostOnlyStart' };
    if (this.seats.length < 2) return { error: 'error.needTwoPlayers' };

    this.game = newGame({
      playerNames: this.seats.map((s) => s.name),
      seed: Math.floor(Math.random() * 2 ** 31),
      config: { topValue: this.topValue },
    });
    this.nextBotMoveAt = BOT_THINK_MIN_MS;
    return null;
  }

  lobby(): LobbyInfo {
    const seats: SeatInfo[] = this.seats.map((s) =>
      s.kind === 'bot'
        ? { seat: s.seat, name: s.name, kind: 'bot', connected: true, difficulty: s.difficulty }
        : { seat: s.seat, name: s.name, kind: 'human', connected: s.connected },
    );

    return {
      code: this.code,
      hostSeat: this.hostSeat,
      started: this.game !== null,
      seats,
      config: {
        topValue: this.topValue,
        flensWindowMs: this.game?.config.flensWindowMs ?? 6_000,
        turnTimeoutMs: this.game?.config.turnTimeoutMs ?? 45_000,
      },
    };
  }

  seatFor(token: string): number | null {
    return this.seats.find((s) => s.kind === 'human' && s.token === token)?.seat ?? null;
  }

  // -------------------------------------------------------------------------
  // Play
  // -------------------------------------------------------------------------

  /**
   * Apply a human action. The seat comes from the connection's token, never
   * from the message, so a client cannot act on another player's behalf.
   */
  submit(seat: number, action: Action): Refusal | null {
    if (!this.game) return { error: 'error.notStarted' };
    if (action.type === 'tick') return { error: 'error.clientClock' };

    const owned = { ...action, player: seat } as Action;
    const result = reduce(this.game, owned);
    if (!result.ok) return { error: result.reason };

    this.game = result.state;
    this.events.onBroadcast();
    return null;
  }

  /** Called on the server heartbeat. Advances the clock and runs the bots. */
  tick(): void {
    if (!this.game) return;

    const before = materialSignature(this.game);
    const ticked = reduce(this.game, { type: 'tick', ms: TICK_MS });
    if (ticked.ok) this.game = ticked.state;

    if (this.game.phase === 'playing') {
      this.runBotFlensCalls();
      this.runBotTurn();
    }

    // Plain clock movement is not worth a message — clients extrapolate it.
    // Anything that changes the table is.
    if (materialSignature(this.game) !== before) this.events.onBroadcast();
  }

  private runBotTurn(): void {
    const game = this.game;
    if (!game) return;

    const seat = this.seats[game.currentPlayer];
    if (!seat || seat.kind !== 'bot') return;
    if (game.now < this.nextBotMoveAt) return;

    const profile = PROFILES[seat.difficulty as Difficulty];
    const result = reduce(game, botAction(game, game.currentPlayer, profile, Math.random));
    const next = result.ok ? result.state : game;
    this.game = next;

    this.nextBotMoveAt = next.now + BOT_THINK_MIN_MS + Math.random() * BOT_THINK_VARIANCE_MS;
  }

  private runBotFlensCalls(): void {
    const game = this.game;
    if (!game) return;

    const infraction = game.pendingInfraction;
    if (!infraction) {
      this.intent = null;
      return;
    }

    if (this.intent?.infractionAt !== infraction.at) {
      const callers = new Map<number, number>();
      for (const seat of this.seats) {
        if (seat.kind !== 'bot' || seat.seat === infraction.offender) continue;
        const profile = PROFILES[seat.difficulty as Difficulty];
        if (Math.random() >= profile.spotChance) continue;
        callers.set(seat.seat, profile.spotDelayMs * (0.7 + Math.random() * 0.6));
      }
      this.intent = { infractionAt: infraction.at, callers };
    }

    const elapsed = game.now - infraction.at;
    for (const [seatIndex, delay] of this.intent.callers) {
      if (elapsed < delay) continue;
      const seat = this.seats[seatIndex];
      if (!seat) continue;
      const profile = PROFILES[seat.difficulty as Difficulty];
      if (!botCallsFlens(game, seatIndex, profile, elapsed, () => 0)) continue;

      const result = reduce(game, { type: 'callFlens', player: seatIndex });
      if (result.ok) this.game = result.state;
      this.intent = null;
      return;
    }
  }

  /** The redacted view for one seat. Never hand out `GameState`. */
  viewForSeat(seat: number): GameView | null {
    return this.game ? viewFor(this.game, seat) : null;
  }

  get now(): number {
    return this.game?.now ?? 0;
  }

  get humanSeats(): { seat: number; token: string }[] {
    return this.seats
      .filter((s) => s.kind === 'human')
      .map((s) => ({ seat: s.seat, token: s.token }));
  }
}

/**
 * What counts as "the table changed". Deliberately excludes `now`, so the
 * heartbeat alone never triggers a broadcast.
 */
function materialSignature(state: GameState): string {
  return [state.log.length, state.currentPlayer, state.phase, state.winner ?? -1].join(':');
}

function sanitiseName(name: string): string {
  return name.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 16);
}
