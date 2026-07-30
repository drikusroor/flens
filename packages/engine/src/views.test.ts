import { describe, expect, it } from 'vitest';
import { reduce } from './reduce.js';
import { scenario } from './scenario.js';
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

describe('infractions are withheld by default', () => {
  const afterBadPlay = (): GameState => {
    const state = scenario({
      players: [{ hand: [9, 12] }, {}],
      centre: [[1, 2, 3]],
    });
    const result = reduce(state, {
      type: 'play',
      player: 0,
      from: { kind: 'hand', index: 0 },
      to: { kind: 'centre', index: 0 },
    });
    if (!result.ok) throw new Error(result.reason);
    return result.state;
  };

  it('hides the pending infraction from an ordinary seat', () => {
    const state = afterBadPlay();
    expect(state.pendingInfraction).not.toBeNull();

    const view = viewFor(state, 1);
    expect(view.pendingInfraction).toBeNull();
    expect(view.flensWindowRemainingMs).toBe(0);
  });

  it('keeps the mistake out of the log too', () => {
    const view = viewFor(afterBadPlay(), 1);
    expect(view.log.some((e) => e.kind === 'infraction')).toBe(false);
  });

  it('leaks nothing about it in the serialised payload', () => {
    const payload = JSON.stringify(viewFor(afterBadPlay(), 1));
    expect(payload).not.toContain('infraction');
    expect(payload).not.toContain('expecting');
  });

  it('still shows the played card, since that is on the table for all to see', () => {
    const view = viewFor(afterBadPlay(), 1);
    expect(view.centre[0]!.cards.at(-1)?.value).toBe(9);
  });

  it('never exposes a secret log kind, which a UI could turn into a sound', () => {
    // The client keys sound and animation off `kind`. If an infraction kind
    // reached an ordinary view, the game would announce the very mistake the
    // player is supposed to spot for themselves.
    const view = viewFor(afterBadPlay(), 1);
    const kinds = view.log.map((e) => e.kind);

    expect(kinds).not.toContain('infraction');
    expect(kinds).not.toContain('gotAway');
  });

  it('tags entries with a kind so a UI need not parse messages', () => {
    const view = viewFor(afterBadPlay(), 1);
    // The out-of-sequence card still looks like an ordinary play from outside.
    expect(view.log.some((e) => e.kind === 'play')).toBe(true);
  });

  it('reveals everything when explicitly asked', () => {
    const view = viewFor(afterBadPlay(), 1, { revealInfractions: true });

    expect(view.pendingInfraction).toMatchObject({ kind: 'outOfSequence', offender: 0 });
    expect(view.flensWindowRemainingMs).toBeGreaterThan(0);
    expect(view.log.some((e) => e.kind === 'infraction')).toBe(true);
  });
});

describe('the Flens window in a view', () => {
  const reveal = { revealInfractions: true } as const;

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

    expect(viewFor(bad.state, 1, reveal).flensWindowRemainingMs).toBe(6000);

    const ticked = reduce(bad.state, { type: 'tick', ms: 2000 });
    if (!ticked.ok) throw new Error(ticked.reason);
    expect(viewFor(ticked.state, 1, reveal).flensWindowRemainingMs).toBe(4000);

    const expired = reduce(ticked.state, { type: 'tick', ms: 5000 });
    if (!expired.ok) throw new Error(expired.reason);
    expect(viewFor(expired.state, 1, reveal).pendingInfraction).toBeNull();
    expect(viewFor(expired.state, 1, reveal).flensWindowRemainingMs).toBe(0);
  });
});
