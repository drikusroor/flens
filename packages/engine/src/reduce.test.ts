import { describe, expect, it } from 'vitest';
import { reduce, reduceAll } from './reduce.js';
import { scenario, values } from './scenario.js';
import type { Action, CardSource, GameState } from './types.js';

const play = (player: number, from: CardSource, to: number): Action => ({
  type: 'play',
  player,
  from,
  to: { kind: 'centre', index: to },
});
const hand = (index: number) => ({ kind: 'hand', index }) as const;
const stok = () => ({ kind: 'flensstok' }) as const;
const open = (index: number) => ({ kind: 'openPile', index }) as const;

const ok = (state: GameState, action: Action): GameState => {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`expected acceptance, got: ${result.reason}`);
  return result.state;
};

describe('playing to the centre', () => {
  it('accepts a card that continues the sequence', () => {
    // A spare card keeps the hand non-empty, so no packet refill muddies the
    // assertion.
    const state = scenario({
      players: [{ hand: [4, 12] }, {}],
      centre: [[1, 2, 3]],
    });

    const next = ok(state, play(0, hand(0), 0));

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3, 4]);
    expect(values(next.players[0]!.hand)).toEqual([12]);
    expect(next.pendingInfraction).toBeNull();
  });

  it('only accepts a 1 on an empty pile', () => {
    const state = scenario({ players: [{ hand: [1] }, {}] });
    const next = ok(state, play(0, hand(0), 0));
    expect(values(next.centre[0]!.cards)).toEqual([1]);
    expect(next.pendingInfraction).toBeNull();
  });

  it('plays from the flensstok', () => {
    const state = scenario({
      players: [{ hand: [9], flensstok: [8, 4] }, {}],
      centre: [[1, 2, 3]],
    });

    const next = ok(state, play(0, stok(), 0));

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3, 4]);
    expect(values(next.players[0]!.flensstok)).toEqual([8]);
  });

  it('plays from an open pile', () => {
    const state = scenario({
      players: [{ hand: [9], openPiles: [[7, 4]] }, {}],
      centre: [[1, 2, 3]],
    });

    const next = ok(state, play(0, open(0), 0));

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3, 4]);
    expect(values(next.players[0]!.openPiles[0]!)).toEqual([7]);
  });

  it('clears a completed run and calls Pankouk', () => {
    const full = Array.from({ length: 15 }, (_, i) => i + 1);
    const state = scenario({
      players: [{ hand: [16] }, {}],
      centre: [full],
      // Stocked so the empty-hand refill does not immediately recycle the
      // completed run back into the supply.
      voorraad: [7, 7, 7, 7, 7],
      config: { topValue: 16 },
    });

    const next = ok(state, play(0, hand(0), 0));

    expect(next.centre[0]!.cards).toHaveLength(0);
    expect(next.completed).toHaveLength(16);
    expect(next.log.some((e) => e.text.key === 'log.pankouk')).toBe(true);
  });
});

describe('impossible actions are rejected', () => {
  const state = scenario({ players: [{ hand: [4] }, { hand: [4] }], centre: [[1, 2, 3]] });

  it('rejects playing out of turn', () => {
    const result = reduce(state, play(1, hand(0), 0));
    expect(result).toMatchObject({ ok: false, reason: 'reject.notYourTurn' });
  });

  it('rejects a card that is not there', () => {
    const result = reduce(state, play(0, hand(7), 0));
    expect(result).toMatchObject({ ok: false, reason: 'reject.noCardThere' });
  });

  it('rejects an empty flensstok', () => {
    const empty = scenario({
      players: [{ hand: [4], flensstok: [] }, {}],
      centre: [[1, 2, 3]],
    });
    const result = reduce(empty, play(0, stok(), 0));
    expect(result).toMatchObject({ ok: false, reason: 'reject.noCardThere' });
  });

  it('rejects a centre pile that does not exist', () => {
    const result = reduce(state, play(0, hand(0), 99));
    expect(result).toMatchObject({ ok: false, reason: 'reject.noSuchCentrePile' });
  });

  it('leaves the state untouched when rejecting', () => {
    const result = reduce(state, play(0, hand(7), 0));
    expect(result.state).toBe(state);
  });
});

describe('discarding ends the turn', () => {
  it('moves the card and passes play on', () => {
    const state = scenario({
      players: [{ hand: [7, 8] }, { hand: [3] }],
      centre: [[1, 2, 3]],
      config: { centrePriority: false },
    });

    const next = ok(state, { type: 'discard', player: 0, handIndex: 0, openPileIndex: 1 });

    expect(values(next.players[0]!.openPiles[1]!)).toEqual([7]);
    expect(values(next.players[0]!.hand)).toEqual([8]);
    expect(next.currentPlayer).toBe(1);
  });

  it('rejects a discard from an empty hand slot', () => {
    const state = scenario({ players: [{ hand: [7] }, {}] });
    const result = reduce(state, { type: 'discard', player: 0, handIndex: 3, openPileIndex: 0 });
    expect(result).toMatchObject({ ok: false });
  });
});

describe('winning', () => {
  it('ends the game when the flensstok empties', () => {
    const state = scenario({
      players: [{ hand: [9], flensstok: [4] }, {}],
      centre: [[1, 2, 3]],
    });

    const next = ok(state, play(0, stok(), 0));

    expect(next.phase).toBe('finished');
    expect(next.winner).toBe(0);
  });

  it('rejects further actions once finished', () => {
    const state = scenario({
      players: [{ hand: [9], flensstok: [4] }, {}],
      centre: [[1, 2, 3]],
    });
    const finished = ok(state, play(0, stok(), 0));

    expect(reduce(finished, play(0, hand(0), 1))).toMatchObject({ ok: false, reason: 'reject.gameOver' });
  });

  it('under the allCards condition, an empty flensstok is not enough', () => {
    const state = scenario({
      players: [{ hand: [9], flensstok: [4], openPiles: [[2]] }, {}],
      centre: [[1, 2, 3]],
      config: { winCondition: 'allCards' },
    });

    const next = ok(state, play(0, stok(), 0));

    expect(next.phase).toBe('playing');
    expect(next.winner).toBeNull();
  });
});

describe('hand refill', () => {
  it('takes a fresh packet mid-turn when the hand empties', () => {
    const state = scenario({
      players: [{ hand: [4] }, {}],
      centre: [[1, 2, 3]],
      voorraad: [10, 11, 12, 13, 14, 15],
      config: { handSize: 5, refill: 'whenEmpty' },
    });

    const next = ok(state, play(0, hand(0), 0));

    expect(values(next.players[0]!.hand)).toEqual([10, 11, 12, 13, 14]);
    expect(next.currentPlayer).toBe(0); // still your turn
  });

  it('does not top up a partly-used hand under the whenEmpty rule', () => {
    const state = scenario({
      players: [{ hand: [4, 9] }, {}],
      centre: [[1, 2, 3]],
      voorraad: [10, 11],
      config: { refill: 'whenEmpty' },
    });

    const next = ok(state, play(0, hand(0), 0));

    expect(values(next.players[0]!.hand)).toEqual([9]);
  });

  it('tops up each turn under the everyTurn rule', () => {
    const state = scenario({
      players: [{ hand: [7] }, { hand: [3] }],
      voorraad: [10, 11, 12, 13, 14, 15],
      config: { refill: 'everyTurn', centrePriority: false, handSize: 5 },
    });

    const next = ok(state, { type: 'discard', player: 0, handIndex: 0, openPileIndex: 0 });

    expect(next.currentPlayer).toBe(1);
    expect(next.players[1]!.hand).toHaveLength(5);
  });

  it('recycles completed runs when the supply runs dry', () => {
    const full = Array.from({ length: 15 }, (_, i) => i + 1);
    const state = scenario({
      players: [{ hand: [16] }, {}],
      centre: [full],
      voorraad: [],
      config: { topValue: 16 },
    });

    const next = ok(state, play(0, hand(0), 0));

    expect(next.players[0]!.hand).toHaveLength(5);
    expect(next.log.some((e) => e.text.key === 'log.reshuffled')).toBe(true);
  });
});

describe('passing and stalemate', () => {
  /** Two players, empty hands, empty supply, nothing playable. */
  const stuck = () =>
    scenario({
      players: [
        { hand: [], flensstok: [16], openPiles: [[9]] },
        { hand: [], flensstok: [16], openPiles: [[9]] },
      ],
      centre: [[1, 2, 3]],
      voorraad: [],
    });

  it('lets a player with no possible action pass', () => {
    const next = ok(stuck(), { type: 'pass', player: 0 });
    expect(next.currentPlayer).toBe(1);
    expect(next.consecutivePasses).toBe(1);
  });

  it('declares a draw when everyone passes in turn', () => {
    const next = ok(ok(stuck(), { type: 'pass', player: 0 }), { type: 'pass', player: 1 });

    expect(next.phase).toBe('stalemate');
    expect(next.winner).toBeNull();
  });

  it('refuses a pass while you still hold a card', () => {
    const state = scenario({ players: [{ hand: [12] }, {}], centre: [[1, 2, 3]] });
    expect(reduce(state, { type: 'pass', player: 0 })).toMatchObject({
      ok: false,
      reason: 'reject.mustPlayOrDiscard',
    });
  });

  it('refuses a pass while a legal play exists', () => {
    const state = scenario({
      players: [{ hand: [], openPiles: [[4]] }, {}],
      centre: [[1, 2, 3]],
      voorraad: [],
    });
    expect(reduce(state, { type: 'pass', player: 0 })).toMatchObject({
      ok: false,
      reason: 'reject.mustPlay',
    });
  });

  it('a productive play resets the pass counter', () => {
    const passed = ok(stuck(), { type: 'pass', player: 0 });
    const state = scenario({
      players: [{ hand: [4] }, {}],
      centre: [[1, 2, 3]],
    });

    expect(passed.consecutivePasses).toBe(1);
    expect(ok(state, play(0, hand(0), 0)).consecutivePasses).toBe(0);
  });

  it('calls a draw when nobody reaches the centre for too long', () => {
    // Nothing anyone holds can ever start or extend a pile.
    let state = scenario({
      players: [
        { hand: [12, 13], flensstok: [16] },
        { hand: [12, 13], flensstok: [16] },
      ],
      centre: [[1, 2, 3]],
      voorraad: new Array<number>(200).fill(13),
      config: { idleTurnsBeforeStalemate: 6, centrePriority: false },
    });

    for (let i = 0; i < 6 && state.phase === 'playing'; i++) {
      state = ok(state, {
        type: 'discard',
        player: state.currentPlayer,
        handIndex: 0,
        openPileIndex: 0,
      });
    }

    expect(state.phase).toBe('stalemate');
  });
});

describe('the turn timer', () => {
  it('does nothing while there is time left', () => {
    const state = scenario({
      players: [{ hand: [12, 13] }, {}],
      centre: [[1, 2, 3]],
      config: { turnTimeoutMs: 30_000 },
    });

    const next = ok(state, { type: 'tick', ms: 29_000 });
    expect(next.currentPlayer).toBe(0);
    expect(values(next.players[0]!.hand)).toEqual([12, 13]);
  });

  it('discards for a player who stalls, and passes the turn on', () => {
    const state = scenario({
      players: [{ hand: [12, 13] }, {}],
      centre: [[1, 2, 3]],
      config: { turnTimeoutMs: 30_000, centrePriority: false },
    });

    const next = ok(state, { type: 'tick', ms: 30_000 });

    expect(next.currentPlayer).toBe(1);
    expect(values(next.players[0]!.hand)).toEqual([13]);
    expect(next.log.some((e) => e.kind === 'timeout')).toBe(true);
  });

  it('still counts as a missed play if one was available', () => {
    const state = scenario({
      players: [{ hand: [4, 13] }, {}],
      centre: [[1, 2, 3]],
      config: { turnTimeoutMs: 30_000, centrePriority: true },
    });

    const next = ok(state, { type: 'tick', ms: 30_000 });

    expect(next.pendingInfraction).toMatchObject({ kind: 'missedCentrePlay', offender: 0 });
  });

  it('plays for a stalling player who has no hand to discard from', () => {
    const state = scenario({
      players: [{ hand: [], openPiles: [[4]] }, {}],
      centre: [[1, 2, 3]],
      voorraad: [],
      config: { turnTimeoutMs: 30_000 },
    });

    const next = ok(state, { type: 'tick', ms: 30_000 });

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3, 4]);
  });

  it('passes for a stalling player who can do nothing at all', () => {
    const state = scenario({
      players: [
        { hand: [], flensstok: [16], openPiles: [[9]] },
        { hand: [], flensstok: [16], openPiles: [[9]] },
      ],
      centre: [[1, 2, 3]],
      voorraad: [],
      config: { turnTimeoutMs: 30_000 },
    });

    const next = ok(state, { type: 'tick', ms: 30_000 });
    expect(next.currentPlayer).toBe(1);
  });

  it('restarts the clock for the next player', () => {
    const state = scenario({
      players: [{ hand: [12, 13] }, { hand: [12, 13] }],
      centre: [[1, 2, 3]],
      config: { turnTimeoutMs: 30_000, centrePriority: false },
    });

    const afterFirst = ok(state, { type: 'tick', ms: 30_000 });
    expect(afterFirst.currentPlayer).toBe(1);

    // Player 1 gets a full window of their own, not the leftovers.
    const soonAfter = ok(afterFirst, { type: 'tick', ms: 29_000 });
    expect(soonAfter.currentPlayer).toBe(1);

    const later = ok(soonAfter, { type: 'tick', ms: 2_000 });
    expect(later.currentPlayer).toBe(0);
  });

  it('can be switched off entirely', () => {
    const state = scenario({
      players: [{ hand: [12, 13] }, {}],
      centre: [[1, 2, 3]],
      config: { turnTimeoutMs: null },
    });

    const next = ok(state, { type: 'tick', ms: 10_000_000 });
    expect(next.currentPlayer).toBe(0);
    expect(values(next.players[0]!.hand)).toEqual([12, 13]);
  });
});

describe('determinism', () => {
  it('produces identical states from identical action lists', () => {
    const build = () =>
      scenario({
        players: [{ hand: [4, 7] }, { hand: [3] }],
        centre: [[1, 2, 3]],
        voorraad: [10, 11, 12, 13, 14],
        config: { centrePriority: false },
      });

    const actions: Action[] = [
      play(0, hand(0), 0),
      { type: 'discard', player: 0, handIndex: 0, openPileIndex: 0 },
    ];

    expect(reduceAll(build(), actions)).toEqual(reduceAll(build(), actions));
  });
});
