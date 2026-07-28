/**
 * Wire protocol shared by the server and the browser client.
 *
 * Two rules the messages encode:
 *
 *  - The server is authoritative. Clients send *intent* (`action`); they never
 *    send state. Every action is re-validated server-side against the seat the
 *    connection actually owns.
 *  - Clients receive a redacted `GameView`, never a `GameState`. Hidden cards
 *    and unresolved infractions must not travel over the wire at all — anything
 *    sent is readable in a browser's network tab.
 */

import type { Action, FlensConfig, GameView } from '@flens/engine';

export const PROTOCOL_VERSION = 1;

/** Room codes are short and unambiguous — no 0/O or 1/I. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface SeatInfo {
  readonly seat: number;
  readonly name: string;
  readonly kind: 'human' | 'bot';
  /** Humans only; a disconnected seat keeps playing via the turn timer. */
  readonly connected: boolean;
  readonly difficulty?: BotDifficulty;
}

export interface LobbyInfo {
  readonly code: string;
  readonly hostSeat: number;
  readonly started: boolean;
  readonly seats: readonly SeatInfo[];
  readonly config: Pick<FlensConfig, 'topValue' | 'flensWindowMs' | 'turnTimeoutMs'>;
}

// ---------------------------------------------------------------------------
// Client → server
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { readonly type: 'create'; readonly name: string; readonly topValue?: number }
  | { readonly type: 'join'; readonly code: string; readonly name: string }
  /**
   * Join the room belonging to a Discord Activity instance, creating it if this
   * is the first arrival. Everyone launching the Activity in the same voice
   * channel shares an `instanceId`, so this is what puts them at one table
   * without anyone typing a code.
   */
  | { readonly type: 'joinInstance'; readonly instanceId: string; readonly name: string }
  /** Reclaim a seat after a refresh or a dropped connection. */
  | { readonly type: 'resume'; readonly code: string; readonly token: string }
  | { readonly type: 'addBot'; readonly difficulty: BotDifficulty }
  | { readonly type: 'removeSeat'; readonly seat: number }
  | { readonly type: 'start' }
  /**
   * The `player` field on the action is ignored — the server substitutes the
   * seat this connection owns, so a client cannot act for anyone else.
   */
  | { readonly type: 'action'; readonly action: Action }
  | { readonly type: 'leave' };

// ---------------------------------------------------------------------------
// Server → client
// ---------------------------------------------------------------------------

export type ServerMessage =
  | {
      readonly type: 'joined';
      readonly code: string;
      readonly seat: number;
      /** Store this; it is what `resume` needs. */
      readonly token: string;
      readonly lobby: LobbyInfo;
    }
  | { readonly type: 'lobby'; readonly lobby: LobbyInfo }
  /**
   * A full redacted view. `serverNow` is the engine clock at send time, so the
   * client can extrapolate countdowns locally instead of being spammed with
   * ticks.
   */
  | { readonly type: 'state'; readonly view: GameView; readonly serverNow: number }
  | { readonly type: 'error'; readonly message: string };

export function isClientMessage(value: unknown): value is ClientMessage {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}
