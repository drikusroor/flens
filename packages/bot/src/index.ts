/**
 * Flens bots.
 *
 * Difficulty here is deliberately *not* search depth. A bot that follows the
 * rules perfectly never commits an infraction, so it can never be Flensed — and
 * one that spots your errors instantly is miserable to play against. Both halves
 * of the Flens mechanic need a fallible opponent, so difficulty is expressed as
 * error rate and observation latency instead.
 */

import {
  availableCentrePlays,
  cardAt,
  nextValueFor,
  playableSources,
  type Action,
  type CardSource,
  type GameState,
} from '@flens/engine';

export interface BotProfile {
  readonly name: string;
  /** Chance of botching a turn it could have played correctly. */
  readonly errorRate: number;
  /** Chance of noticing an opponent's infraction at all. */
  readonly spotChance: number;
  /** How long it takes to notice, in ms. Compared against the Flens window. */
  readonly spotDelayMs: number;
}

export const PROFILES = {
  easy: { name: 'Easy', errorRate: 0.18, spotChance: 0.35, spotDelayMs: 4200 },
  normal: { name: 'Normal', errorRate: 0.07, spotChance: 0.7, spotDelayMs: 2000 },
  hard: { name: 'Hard', errorRate: 0.01, spotChance: 0.95, spotDelayMs: 700 },
} as const satisfies Record<string, BotProfile>;

export type Difficulty = keyof typeof PROFILES;

/** Injected so bot behaviour stays reproducible in tests. */
export type Rand = () => number;

// ---------------------------------------------------------------------------
// Choosing a turn
// ---------------------------------------------------------------------------

export function botAction(
  state: GameState,
  playerId: number,
  profile: BotProfile,
  rand: Rand,
): Action {
  const player = state.players[playerId];
  if (!player) throw new Error(`no such player: ${playerId}`);

  const plays = availableCentrePlays(state, playerId);
  const wantsToErr = rand() < profile.errorRate;

  if (plays.length > 0) {
    // Two ways to go wrong, both of them Flens-able.
    if (wantsToErr && player.hand.length > 0) {
      return rand() < 0.5
        ? discardAction(state, playerId) // missedCentrePlay
        : (badCentrePlay(state, playerId, rand) ?? bestPlay(plays, playerId));
    }
    return bestPlay(plays, playerId);
  }

  if (wantsToErr) {
    const bad = badCentrePlay(state, playerId, rand);
    if (bad) return bad;
  }

  if (player.hand.length === 0) return { type: 'pass', player: playerId };
  return discardAction(state, playerId);
}

/** Emptying the flensstok is the win condition, so prefer it over everything. */
function bestPlay(plays: ReturnType<typeof availableCentrePlays>, playerId: number): Action {
  const preferred =
    plays.find((p) => p.from.kind === 'flensstok') ??
    plays.find((p) => p.from.kind === 'openPile') ??
    plays[0]!;

  return {
    type: 'play',
    player: playerId,
    from: preferred.from,
    to: { kind: 'centre', index: preferred.centreIndex },
  };
}

/** A plausible-looking wrong move: a card that misses the sequence. */
function badCentrePlay(state: GameState, playerId: number, rand: Rand): Action | null {
  const player = state.players[playerId];
  if (!player) return null;

  const candidates: { from: CardSource; centreIndex: number }[] = [];
  for (const from of playableSources(player)) {
    const card = cardAt(player, from);
    if (!card) continue;
    state.centre.forEach((pile, centreIndex) => {
      const wanted = nextValueFor(pile, state.config);
      // Off-by-one errors are the believable kind — a wild mismatch would just
      // look like a bug to whoever is watching.
      if (wanted !== null && card.value !== wanted && Math.abs(card.value - wanted) <= 2) {
        candidates.push({ from, centreIndex });
      }
    });
  }

  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(rand() * candidates.length)]!;
  return {
    type: 'play',
    player: playerId,
    from: pick.from,
    to: { kind: 'centre', index: pick.centreIndex },
  };
}

function discardAction(state: GameState, playerId: number): Action {
  const player = state.players[playerId]!;
  const openPiles = player.openPiles;

  // Keep piles shallow so cards stay reachable, and shed high cards first —
  // they are the hardest to place later.
  let target = 0;
  openPiles.forEach((pile, index) => {
    if (pile.length < openPiles[target]!.length) target = index;
  });

  let handIndex = 0;
  player.hand.forEach((card, index) => {
    if (card.value > player.hand[handIndex]!.value) handIndex = index;
  });

  return { type: 'discard', player: playerId, handIndex, openPileIndex: target };
}

// ---------------------------------------------------------------------------
// Spotting infractions
// ---------------------------------------------------------------------------

/**
 * Whether this bot calls FLENS! on the open infraction, given how long it has
 * been sitting there. Returns false for its own mistakes — a bot cannot dob
 * itself in.
 */
export function botCallsFlens(
  state: GameState,
  playerId: number,
  profile: BotProfile,
  elapsedMs: number,
  rand: Rand,
): boolean {
  const infraction = state.pendingInfraction;
  if (!infraction) return false;
  if (infraction.offender === playerId) return false;
  if (elapsedMs < profile.spotDelayMs) return false;
  if (state.now - infraction.at > state.config.flensWindowMs) return false;

  return rand() < profile.spotChance;
}
