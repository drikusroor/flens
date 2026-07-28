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
   * The open infraction — **null unless `revealInfractions` was requested**.
   *
   * Spotting a mistake is the entire skill of the game. A client that were told
   * "an infraction is live" could just wire the FLENS! button to that flag and
   * never look at the table, so by default this is withheld and a player has to
   * decide for themselves whether to call.
   */
  readonly pendingInfraction: Infraction | null;
  readonly flensWindowRemainingMs: number;
  /** Time left in the current turn, or null when the turn timer is off. */
  readonly turnRemainingMs: number | null;
  readonly log: GameState['log'];
}

export interface ViewOptions {
  /**
   * Reveal the open infraction and the countdown. For practice modes, replays
   * and debugging — never for a competitive seat.
   */
  readonly revealInfractions?: boolean;
}

export function viewFor(state: GameState, playerId: number, options: ViewOptions = {}): GameView {
  const reveal = options.revealInfractions === true;
  const infraction = reveal ? state.pendingInfraction : null;
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
    turnRemainingMs:
      state.config.turnTimeoutMs === null
        ? null
        : Math.max(0, state.config.turnTimeoutMs - (state.now - state.turnStartedAt)),
    log: reveal ? state.log : state.log.filter((entry) => entry.secret !== true),
  };
}
