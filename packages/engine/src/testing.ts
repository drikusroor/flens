/**
 * Scenario builder for tests.
 *
 * Real deals are shuffled, which is useless for asserting on specific rules.
 * `scenario` builds an exact table from plain numbers instead.
 */

import { makeConfig } from './config.js';
import type { Card, FlensConfig, GameState, PlayerState } from './types.js';

export interface PlayerSpec {
  readonly name?: string;
  readonly hand?: readonly number[];
  /**
   * Omit and you get a single top-value card. An *empty* flensstok is a won
   * game under the default win condition, so defaulting to empty would end
   * every scenario before it started. Top-value is chosen because it is only
   * playable onto a nearly-finished run, so it rarely disturbs a test.
   */
  readonly flensstok?: readonly number[];
  /** Bottom-to-top, so the last number is the visible top card. */
  readonly openPiles?: readonly (readonly number[])[];
}

export interface ScenarioSpec {
  readonly players: readonly PlayerSpec[];
  /** Bottom-to-top per centre pile. */
  readonly centre?: readonly (readonly number[])[];
  /**
   * Omit and you get a deep stack of inert top-value cards. A real voorraad
   * holds ~90 cards; leaving it empty would make almost every scenario trip the
   * empty-supply recycling path, which is rarely what a test is about. Set it
   * explicitly (including to `[]`) when the supply *is* the subject.
   */
  readonly voorraad?: readonly number[];
  readonly currentPlayer?: number;
  readonly config?: Partial<FlensConfig>;
}

export function scenario(spec: ScenarioSpec): GameState {
  const config = makeConfig(spec.config);
  let nextId = 0;
  const card = (value: number): Card => ({ id: nextId++, value });
  const cards = (values: readonly number[] = []): Card[] => values.map(card);

  const players: PlayerState[] = spec.players.map((p, id) => ({
    id,
    name: p.name ?? `P${id}`,
    flensstok: cards(p.flensstok ?? [config.topValue]),
    hand: cards(p.hand),
    openPiles: padPiles(
      (p.openPiles ?? []).map((pile) => cards(pile)),
      config.openPileCount,
    ),
  }));

  const centre = padPiles(
    (spec.centre ?? []).map((pile) => cards(pile)),
    config.centrePileCount,
  ).map((cardsInPile) => ({ cards: cardsInPile }));

  return {
    config,
    rng: 1,
    now: 0,
    players,
    centre,
    // Reversed because `drawCards` pops from the end; this way the first number
    // in the spec is the first card drawn.
    voorraad: cards(
      spec.voorraad ?? new Array<number>(20).fill(config.topValue),
    ).reverse(),
    completed: [],
    currentPlayer: spec.currentPlayer ?? 0,
    phase: 'playing',
    winner: null,
    consecutivePasses: 0,
    idleTurns: 0,
    turnStartedAt: 0,
    pendingInfraction: null,
    log: [],
  };
}

function padPiles(piles: Card[][], count: number): Card[][] {
  const out = piles.slice(0, count);
  while (out.length < count) out.push([]);
  return out;
}

/** Card values of a pile, bottom-to-top — for readable assertions. */
export const values = (pile: readonly Card[]): number[] => pile.map((c) => c.value);
