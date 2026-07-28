/**
 * The hybrid model, in one file.
 *
 * Two distinct notions of "you can't do that":
 *
 *  - **Impossible** — playing a card you do not hold, acting out of turn, a pile
 *    index that doesn't exist. These are rejected outright; they are UI bugs or
 *    cheating, never gameplay.
 *
 *  - **Wrong** — playing out of sequence, ignoring the priority rules. These are
 *    *allowed*, recorded as an `Infraction`, and punished only if another player
 *    calls FLENS! in time. This is what makes the game Flens rather than Skip-Bo.
 */

import type { Card, CardSource, CentrePile, FlensConfig, GameState, PlayerState } from './types.js';

export function topOf(pile: readonly Card[]): Card | null {
  return pile.length > 0 ? (pile[pile.length - 1] as Card) : null;
}

/** The value a centre pile is waiting for, or null if the run is complete. */
export function nextValueFor(pile: CentrePile, config: FlensConfig): number | null {
  const top = topOf(pile.cards);
  if (top === null) return 1;
  return top.value >= config.topValue ? null : top.value + 1;
}

export function isCompleteRun(pile: CentrePile, config: FlensConfig): boolean {
  const top = topOf(pile.cards);
  return top !== null && top.value >= config.topValue;
}

/**
 * Resolve a source to the card it refers to.
 * Returns null when the source does not exist — an *impossible* action.
 */
export function cardAt(player: PlayerState, source: CardSource): Card | null {
  switch (source.kind) {
    case 'hand':
      return player.hand[source.index] ?? null;
    case 'flensstok':
      return topOf(player.flensstok);
    case 'openPile': {
      const pile = player.openPiles[source.index];
      return pile ? topOf(pile) : null;
    }
  }
}

/** Every source the player could legally draw a card from right now. */
export function playableSources(player: PlayerState): CardSource[] {
  const sources: CardSource[] = player.hand.map((_, index) => ({ kind: 'hand', index }) as const);
  if (player.flensstok.length > 0) sources.push({ kind: 'flensstok' });
  player.openPiles.forEach((pile, index) => {
    if (pile.length > 0) sources.push({ kind: 'openPile', index });
  });
  return sources;
}

export interface CentrePlay {
  readonly from: CardSource;
  readonly centreIndex: number;
  readonly card: Card;
}

/** All in-sequence centre plays available to a player. Empty means "must discard". */
export function availableCentrePlays(state: GameState, playerId: number): CentrePlay[] {
  const player = state.players[playerId];
  if (!player) return [];

  const plays: CentrePlay[] = [];
  for (const from of playableSources(player)) {
    const card = cardAt(player, from);
    if (!card) continue;
    state.centre.forEach((pile, centreIndex) => {
      if (nextValueFor(pile, state.config) === card.value) {
        plays.push({ from, centreIndex, card });
      }
    });
  }
  return plays;
}

/**
 * Would playing `card` onto centre pile `centreIndex` follow the sequence?
 * A false here is an infraction, not a rejection.
 */
export function followsSequence(card: Card, pile: CentrePile, config: FlensConfig): boolean {
  return nextValueFor(pile, config) === card.value;
}

/**
 * Is the flensstok top playable to the centre while the player instead played
 * from hand? Enforces `flensstokPriority` — the rule that keeps the game a race.
 */
export function violatesFlensstokPriority(
  state: GameState,
  player: PlayerState,
  from: CardSource,
  playedValue: number,
): boolean {
  if (!state.config.flensstokPriority) return false;
  if (from.kind !== 'hand') return false;

  const stokTop = topOf(player.flensstok);
  if (!stokTop || stokTop.value !== playedValue) return false;

  // The flensstok card is interchangeable with the one played, and playable.
  return state.centre.some((pile) => nextValueFor(pile, state.config) === stokTop.value);
}
