import { describe, expect, it } from 'vitest';
import { reduce } from './reduce.js';
import { scenario } from './testing.js';
import { viewFor } from './views.js';
import type { GameState } from './types.js';

const table = (): GameState =>
  scenario({
    players: [
      { name: 'Ada', hand: [3, 4], flensstok: [9, 7], openPiles: [[2, 5]] },
      { name: 'Bram', hand: [1, 2, 3], flensstok: [8], openPiles: [[6]] },
    ],
    voorraad: [10, 11, 12],
  });

describe('viewFor', () => {
  it('shows you your own hand', () => {
    const view = viewFor(table(), 0);
    expect(view.players[0]!.hand?.map((c) => c.value)).toEqual([3, 4]);
  });

  it('hides other hands but reveals their size', () => {
    const view = viewFor(table(), 0);
    expect(view.players[1]!.hand).toBeNull();
    expect(view.players[1]!.handCount).toBe(3);
  });

  it('reveals only the top of a flensstok', () => {
    const view = viewFor(table(), 0);
    expect(view.players[0]!.flensstokTop?.value).toBe(7);
    expect(view.players[0]!.flensstokCount).toBe(2);
    expect(view.players[0]).not.toHaveProperty('flensstok');
  });

  it('reveals open pile tops to everyone', () => {
    const view = viewFor(table(), 1);
    expect(view.players[0]!.openPiles[0]!.top?.value).toBe(5);
    expect(view.players[0]!.openPiles[0]!.count).toBe(2);
  });

  it('counts the supply without exposing it', () => {
    const view = viewFor(table(), 0);
    expect(view.voorraadCount).toBe(3);
    expect(JSON.stringify(view)).not.toContain('voorraad"');
  });

  it('never leaks a hidden card value in the serialised payload', () => {
    // Bram holds a 1; Ada holds no 1 and nothing else on the table shows one.
    const state = scenario({
      players: [
        { name: 'Ada', hand: [3], flensstok: [4], openPiles: [[5]] },
        { name: 'Bram', hand: [1], flensstok: [6], openPiles: [[7]] },
      ],
      voorraad: [],
    });
    const payload = JSON.parse(JSON.stringify(viewFor(state, 0)));
    const hidden = payload.players[1];

    expect(hidden.hand).toBeNull();
    expect(hidden.flensstokTop.value).toBe(6);
    expect(JSON.stringify(hidden)).not.toContain('"value":1');
  });
});

describe('the Flens window in a view', () => {
  it('counts down and then disappears', () => {
    const state = scenario({
      players: [{ hand: [9] }, {}],
      centre: [[1, 2, 3]],
      config: { flensWindowMs: 6000 },
    });

    const bad = reduce(state, {
      type: 'play',
      player: 0,
      from: { kind: 'hand', index: 0 },
      to: { kind: 'centre', index: 0 },
    });
    if (!bad.ok) throw new Error(bad.reason);

    expect(viewFor(bad.state, 1).flensWindowRemainingMs).toBe(6000);

    const ticked = reduce(bad.state, { type: 'tick', ms: 2000 });
    if (!ticked.ok) throw new Error(ticked.reason);
    expect(viewFor(ticked.state, 1).flensWindowRemainingMs).toBe(4000);

    const expired = reduce(ticked.state, { type: 'tick', ms: 5000 });
    if (!expired.ok) throw new Error(expired.reason);
    expect(viewFor(expired.state, 1).pendingInfraction).toBeNull();
    expect(viewFor(expired.state, 1).flensWindowRemainingMs).toBe(0);
  });
});
