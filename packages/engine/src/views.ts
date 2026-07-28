/**
 * Per-player views.
 *
 * The whole game is hidden information, so the server must never ship the full
 * `GameState` to a client — a player could read everyone's hand out of the
 * network tab. `viewFor` produces exactly what one seat is entitled to see.
 */

import { topOf } from './legality.js';
import type { Card, CentrePile, FlensConfig, GameState, Infraction } from './types.js';

export interface PublicPlayerView {
  readonly id: number;
  readonly name: string;
  /** Face down — only the count and the exposed top card are public. */
  readonly flensstokCount: number;
  readonly flensstokTop: Card | null;
  /** Other players' hands are counted, not shown. */
  readonly handCount: number;
  /** Your own hand; null for everyone else. */
  readonly hand: readonly Card[] | null;
  /** Open piles are face up: tops are public, plus depth. */
  readonly openPiles: readonly { readonly top: Card | null; readonly count: number }[];
}

export interface GameView {
  readonly config: FlensConfig;
  readonly you: number;
  readonly now: number;
  readonly players: readonly PublicPlayerView[];
  readonly centre: readonly CentrePile[];
  readonly voorraadCount: number;
  readonly currentPlayer: number;
  readonly phase: GameState['phase'];
  readonly winner: number | null;
  /**
   * The open infraction, if the window is still running. Deliberately visible:
   * spotting it is the player's job, but the client needs to know a call is
   * live so it can enable the FLENS! button and run the countdown.
   */
  readonly pendingInfraction: Infraction | null;
  readonly flensWindowRemainingMs: number;
  readonly log: GameState['log'];
}

export function viewFor(state: GameState, playerId: number): GameView {
  const infraction = state.pendingInfraction;
  const remaining =
    infraction === null
      ? 0
      : Math.max(0, state.config.flensWindowMs - (state.now - infraction.at));

  return {
    config: state.config,
    you: playerId,
    now: state.now,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      flensstokCount: p.flensstok.length,
      flensstokTop: topOf(p.flensstok),
      handCount: p.hand.length,
      hand: p.id === playerId ? p.hand : null,
      openPiles: p.openPiles.map((pile) => ({ top: topOf(pile), count: pile.length })),
    })),
    centre: state.centre,
    voorraadCount: state.voorraad.length,
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    winner: state.winner,
    pendingInfraction: remaining > 0 ? infraction : null,
    flensWindowRemainingMs: remaining,
    log: state.log,
  };
}
