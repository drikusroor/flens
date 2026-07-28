/**
 * Full games driven by a trivial greedy bot.
 *
 * Scenario tests check individual rules; these check that the rules compose
 * into a game that actually terminates without losing or duplicating cards.
 */

import { describe, expect, it } from 'vitest';
import { availableCentrePlays } from './legality.js';
import { reduce } from './reduce.js';
import { newGame, type NewGameOptions } from './setup.js';
import type { Action, GameState } from './types.js';

/**
 * Bots act instantly, and the harness jumps the clock forward to expire Flens
 * windows — so the turn timer, which exists to stop a *human* stalling, would
 * fire constantly and meaninglessly here.
 */
function game(options: NewGameOptions): GameState {
  return newGame({ ...options, config: { ...options.config, turnTimeoutMs: null } });
}

/** Every card in the game, wherever it currently sits. */
function countCards(state: GameState): number {
  return (
    state.players.reduce(
      (sum, p) =>
        sum +
        p.flensstok.length +
        p.hand.length +
        p.openPiles.reduce((s, pile) => s + pile.length, 0),
      0,
    ) +
    state.centre.reduce((sum, pile) => sum + pile.cards.length, 0) +
    state.voorraad.length +
    state.completed.length
  );
}

function allCardIds(state: GameState): number[] {
  return [
    ...state.players.flatMap((p) => [...p.flensstok, ...p.hand, ...p.openPiles.flat()]),
    ...state.centre.flatMap((pile) => pile.cards),
    ...state.voorraad,
    ...state.completed,
  ].map((c) => c.id);
}

/**
 * Greedy, rule-abiding bot: always plays from the flensstok when it can (that
 * is what wins), otherwise any legal centre play, otherwise discards.
 */
function greedyAction(state: GameState): Action {
  const player = state.currentPlayer;
  const plays = availableCentrePlays(state, player);

  if (plays.length > 0) {
    const preferred = plays.find((p) => p.from.kind === 'flensstok') ?? plays[0]!;
    return { type: 'play', player, from: preferred.from, to: { kind: 'centre', index: preferred.centreIndex } };
  }

  const hand = state.players[player]!.hand;
  if (hand.length === 0) return { type: 'pass', player };

  const openPiles = state.players[player]!.openPiles;
  // Discard onto the shallowest pile, to keep cards reachable.
  let target = 0;
  openPiles.forEach((pile, index) => {
    if (pile.length < openPiles[target]!.length) target = index;
  });
  return { type: 'discard', player, handIndex: hand.length - 1, openPileIndex: target };
}

interface RunResult {
  readonly state: GameState;
  readonly steps: number;
}

function playOut(state: GameState, maxSteps = 20_000): RunResult {
  let current = state;
  let steps = 0;

  while (current.phase === 'playing' && steps < maxSteps) {
    const result = reduce(current, greedyAction(current));
    if (!result.ok) throw new Error(`bot produced a rejected action: ${result.reason}`);
    current = result.state;
    steps++;

    // Let any Flens window lapse — nobody is watching in this test.
    const ticked = reduce(current, { type: 'tick', ms: 10_000 });
    if (ticked.ok) current = ticked.state;
  }

  return { state: current, steps };
}

describe('a full game', () => {
  it('reaches a winner', () => {
    const start = game({ playerNames: ['Ada', 'Bram', 'Cato'], seed: 7 });
    const { state } = playOut(start);

    expect(state.phase).toBe('finished');
    expect(state.winner).not.toBeNull();
    expect(state.players[state.winner!]!.flensstok).toHaveLength(0);
  });

  it('conserves every card from deal to finish', () => {
    const start = game({ playerNames: ['Ada', 'Bram'], seed: 3 });
    const deckSize = start.config.topValue * start.config.seriesCount;
    expect(countCards(start)).toBe(deckSize);

    const { state } = playOut(start);

    expect(countCards(state)).toBe(deckSize);
    const ids = allCardIds(state);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('terminates across many seeds and table sizes', () => {
    const names = ['Ada', 'Bram', 'Cato', 'Dirk', 'Eef', 'Fokke'];

    for (let seed = 1; seed <= 40; seed++) {
      for (const count of [2, 3, 4, 6]) {
        const start = game({ playerNames: names.slice(0, count), seed });
        const { state, steps } = playOut(start);

        expect(state.phase, `${count}p seed ${seed} never terminated`).not.toBe('playing');
        // Real games settle in a few hundred steps; anything near the cap means
        // the engine found a livelock rather than a conclusion.
        expect(steps, `${count}p seed ${seed} took suspiciously long`).toBeLessThan(2_000);
        expect(countCards(state)).toBe(start.config.topValue * start.config.seriesCount);
      }
    }
  });

  it('almost always produces a winner rather than a draw', () => {
    const names = ['Ada', 'Bram', 'Cato', 'Dirk'];
    let draws = 0;

    for (let seed = 1; seed <= 40; seed++) {
      for (const count of [2, 3, 4]) {
        const { state } = playOut(game({ playerNames: names.slice(0, count), seed }));
        if (state.phase === 'stalemate') draws++;
      }
    }

    // Against a deliberately unsophisticated bot. Real players should do better.
    expect(draws / 120).toBeLessThan(0.05);
  });

  it('a rule-abiding bot never commits an infraction', () => {
    const start = game({ playerNames: ['Ada', 'Bram'], seed: 11 });
    const { state } = playOut(start);

    expect(state.log.some((e) => e.message.includes('infraction'))).toBe(false);
  });

  it('plays the 1..15 variant just as happily', () => {
    const start = game({
      playerNames: ['Ada', 'Bram'],
      seed: 5,
      config: { topValue: 15 },
    });
    const { state } = playOut(start);

    expect(state.phase).not.toBe('playing');
    expect(countCards(state)).toBe(15 * start.config.seriesCount);
  });
});
