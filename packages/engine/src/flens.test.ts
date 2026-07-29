/**
 * The hybrid Flens model: illegal-but-plausible plays are allowed to land, and
 * are punished only if somebody calls them in time.
 */

import { describe, expect, it } from 'vitest';
import { reduce } from './reduce.js';
import { scenario, values } from './scenario.js';
import type { Action, GameState } from './types.js';

const hand = (index: number) => ({ kind: 'hand', index }) as const;
const stok = () => ({ kind: 'flensstok' }) as const;
const playTo = (player: number, from: unknown, index: number): Action =>
  ({ type: 'play', player, from, to: { kind: 'centre', index } }) as Action;

const ok = (state: GameState, action: Action): GameState => {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`expected acceptance, got: ${result.reason}`);
  return result.state;
};

describe('out-of-sequence plays are allowed, not rejected', () => {
  const badPlay = () =>
    scenario({
      players: [{ hand: [9] }, { openPiles: [[5, 6, 7]] }],
      centre: [[1, 2, 3]],
    });

  it('lets the card land and records an infraction', () => {
    const next = ok(badPlay(), playTo(0, hand(0), 0));

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3, 9]);
    expect(next.pendingInfraction).toMatchObject({ kind: 'outOfSequence', offender: 0 });
  });

  it('does not clear a run that was completed by an illegal card', () => {
    const state = scenario({
      players: [{ hand: [16] }, {}],
      centre: [[1, 2]],
      config: { topValue: 16 },
    });

    const next = ok(state, playTo(0, hand(0), 0));

    expect(next.centre[0]!.cards).toHaveLength(3);
    expect(next.completed).toHaveLength(0);
  });
});

describe('calling FLENS!', () => {
  const setup = () => {
    const state = scenario({
      players: [{ hand: [9, 12] }, { openPiles: [[5, 6, 7]] }],
      centre: [[1, 2, 3]],
      config: { flensWindowMs: 6000 },
    });
    return ok(state, playTo(0, hand(0), 0));
  };

  it('takes the bad card back off the centre pile', () => {
    const next = ok(setup(), { type: 'callFlens', player: 1 });

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3]);
    expect(values(next.players[0]!.hand)).toEqual([12, 9]);
  });

  it('hands the caller open pile to the offender, underneath theirs', () => {
    const state = scenario({
      players: [{ hand: [9], openPiles: [[12]] }, { openPiles: [[5, 6, 7]] }],
      centre: [[1, 2, 3]],
    });
    const afterBadPlay = ok(state, playTo(0, hand(0), 0));

    const next = ok(afterBadPlay, { type: 'callFlens', player: 1 });

    // The caller's three cards go *under* the offender's deepest pile, burying
    // the 12 they were about to play.
    expect(values(next.players[0]!.openPiles[0]!)).toEqual([5, 6, 7, 12]);
    expect(next.players[1]!.openPiles[0]).toHaveLength(0);
  });

  it('clears the infraction so it cannot be called twice', () => {
    const first = ok(setup(), { type: 'callFlens', player: 1 });
    expect(first.pendingInfraction).toBeNull();

    // A second call now finds nothing pending, so it is a false call.
    const second = ok(first, { type: 'callFlens', player: 1 });
    expect(second.log.at(-1)?.message).toContain('wrongly');
  });

  it('does not let the offender call themselves', () => {
    const next = ok(setup(), { type: 'callFlens', player: 0 });

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3, 9]);
    expect(next.log.at(-1)?.message).toContain('wrongly');
  });

  it('penalises a call with no infraction pending', () => {
    const state = scenario({
      players: [{ hand: [4] }, { flensstok: [8] }],
      centre: [[1, 2, 3]],
      voorraad: [13, 14],
      config: { falseCallPenalty: 2 },
    });

    const next = ok(state, { type: 'callFlens', player: 1 });

    expect(values(next.players[1]!.flensstok)).toEqual([8, 13, 14]);
  });

  it('first valid caller wins; the second is penalised', () => {
    const state = scenario({
      players: [
        // A spare hand card, so playing the 9 does not trigger a refill that
        // would drain the small voorraad this test relies on.
        { hand: [9, 12] },
        { openPiles: [[5]] },
        { openPiles: [[6]], flensstok: [11] },
      ],
      centre: [[1, 2, 3]],
      voorraad: [13, 14],
    });
    const afterBadPlay = ok(state, playTo(0, hand(0), 0));

    const afterFirst = ok(afterBadPlay, { type: 'callFlens', player: 1 });
    const afterSecond = ok(afterFirst, { type: 'callFlens', player: 2 });

    expect(afterSecond.players[1]!.openPiles[0]).toHaveLength(0); // gave their pile away
    expect(afterSecond.players[2]!.openPiles[0]).toHaveLength(1); // kept theirs
    expect(values(afterSecond.players[2]!.flensstok)).toEqual([11, 13, 14]); // took the penalty
  });
});

describe('the Flens window', () => {
  const setup = () =>
    ok(
      scenario({
        players: [{ hand: [9] }, { openPiles: [[5, 6, 7]] }],
        centre: [[1, 2, 3]],
        config: { flensWindowMs: 6000, uncaughtErrorsStand: true },
      }),
      playTo(0, hand(0), 0),
    );

  it('still allows a call just inside the window', () => {
    const ticked = ok(setup(), { type: 'tick', ms: 5999 });
    const next = ok(ticked, { type: 'callFlens', player: 1 });

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3]);
  });

  it('closes once the window expires', () => {
    const ticked = ok(setup(), { type: 'tick', ms: 6001 });

    expect(ticked.pendingInfraction).toBeNull();

    const next = ok(ticked, { type: 'callFlens', player: 1 });
    expect(next.log.at(-1)?.message).toContain('wrongly');
  });

  it('lets an uncaught error stand, so the pile continues from the wrong value', () => {
    const ticked = ok(setup(), { type: 'tick', ms: 6001 });

    expect(values(ticked.centre[0]!.cards)).toEqual([1, 2, 3, 9]);
    expect(ticked.log.some((e) => e.message.includes('got away with it'))).toBe(true);
  });

  it('reverts an uncaught error when uncaughtErrorsStand is off', () => {
    const state = scenario({
      players: [{ hand: [9, 12] }, {}],
      centre: [[1, 2, 3]],
      config: { flensWindowMs: 6000, uncaughtErrorsStand: false },
    });
    const afterBadPlay = ok(state, playTo(0, hand(0), 0));

    const ticked = ok(afterBadPlay, { type: 'tick', ms: 6001 });

    expect(values(ticked.centre[0]!.cards)).toEqual([1, 2, 3]);
    expect(values(ticked.players[0]!.hand)).toEqual([12, 9]);
  });

  it('a second infraction settles the first, which goes unpunished', () => {
    const state = scenario({
      players: [{ hand: [9, 10] }, {}],
      centre: [
        [1, 2, 3],
        [1, 2, 3],
      ],
      config: { flensWindowMs: 6000, uncaughtErrorsStand: true },
    });

    const first = ok(state, playTo(0, hand(0), 0));
    expect(first.pendingInfraction?.revert?.centreIndex).toBe(0);

    const second = ok(first, playTo(0, hand(0), 1));

    // Only the newer one is still callable; the first one stood.
    expect(second.pendingInfraction?.revert?.centreIndex).toBe(1);
    expect(values(second.centre[0]!.cards)).toEqual([1, 2, 3, 9]);
    expect(second.log.some((e) => e.message.includes('got away with it'))).toBe(true);
  });
});

describe('the priority rule', () => {
  it('flags ending a turn while a centre play was available', () => {
    const state = scenario({
      players: [{ hand: [4, 12] }, {}],
      centre: [[1, 2, 3]],
      config: { centrePriority: true },
    });

    const next = ok(state, { type: 'discard', player: 0, handIndex: 1, openPileIndex: 0 });

    expect(next.pendingInfraction).toMatchObject({ kind: 'missedCentrePlay', offender: 0 });
  });

  it('does not flag a discard when nothing was playable', () => {
    const state = scenario({
      players: [{ hand: [12, 13] }, {}],
      centre: [[1, 2, 3]],
      config: { centrePriority: true },
    });

    const next = ok(state, { type: 'discard', player: 0, handIndex: 0, openPileIndex: 0 });

    expect(next.pendingInfraction).toBeNull();
  });

  it('can be switched off entirely', () => {
    const state = scenario({
      players: [{ hand: [4, 12] }, {}],
      centre: [[1, 2, 3]],
      config: { centrePriority: false },
    });

    const next = ok(state, { type: 'discard', player: 0, handIndex: 1, openPileIndex: 0 });

    expect(next.pendingInfraction).toBeNull();
  });

  it('still lets an opponent call FLENS! on a missed play after the turn passed', () => {
    const state = scenario({
      players: [{ hand: [4, 12], openPiles: [] }, { openPiles: [[8, 9]] }],
      centre: [[1, 2, 3]],
    });
    const afterDiscard = ok(state, { type: 'discard', player: 0, handIndex: 1, openPileIndex: 0 });

    const next = ok(afterDiscard, { type: 'callFlens', player: 1 });

    expect(next.players[1]!.openPiles[0]).toHaveLength(0);
    expect(next.players[0]!.openPiles.some((pile) => values(pile).includes(8))).toBe(true);
  });
});

describe('flensstok priority', () => {
  it('flags playing from hand while the same value topped the flensstok', () => {
    const state = scenario({
      players: [{ hand: [4], flensstok: [4, 4] }, {}],
      centre: [[1, 2, 3]],
      config: { flensstokPriority: true },
    });

    const next = ok(state, playTo(0, hand(0), 0));

    expect(values(next.centre[0]!.cards)).toEqual([1, 2, 3, 4]);
    expect(next.pendingInfraction).toMatchObject({ kind: 'ignoredFlensstok', offender: 0 });
  });

  it('does not flag playing the flensstok card itself', () => {
    const state = scenario({
      players: [{ hand: [4], flensstok: [9, 4] }, {}],
      centre: [[1, 2, 3]],
      config: { flensstokPriority: true },
    });

    const next = ok(state, playTo(0, stok(), 0));

    expect(next.pendingInfraction).toBeNull();
  });

  it('can be switched off', () => {
    const state = scenario({
      players: [{ hand: [4], flensstok: [4, 4] }, {}],
      centre: [[1, 2, 3]],
      config: { flensstokPriority: false },
    });

    const next = ok(state, playTo(0, hand(0), 0));

    expect(next.pendingInfraction).toBeNull();
  });
});
