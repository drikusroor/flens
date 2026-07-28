import { describe, expect, it } from 'vitest';
import { makeConfig, validateConfig } from './config.js';
import { buildDeck, newGame } from './setup.js';

describe('deck', () => {
  it('contains seriesCount copies of every value', () => {
    const config = makeConfig({ topValue: 16, seriesCount: 8 });
    const deck = buildDeck(config);

    expect(deck).toHaveLength(128);
    for (let value = 1; value <= 16; value++) {
      expect(deck.filter((c) => c.value === value)).toHaveLength(8);
    }
  });

  it('gives every card a unique id', () => {
    const deck = buildDeck(makeConfig());
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
  });

  it('supports the 1..15 variant', () => {
    const deck = buildDeck(makeConfig({ topValue: 15 }));
    expect(deck).toHaveLength(120);
    expect(deck.some((c) => c.value === 16)).toBe(false);
  });
});

describe('newGame', () => {
  it('deals a flensstok and a hand to every player', () => {
    const state = newGame({ playerNames: ['Ada', 'Bram', 'Cato'] });

    for (const player of state.players) {
      expect(player.flensstok).toHaveLength(state.config.flensstokSize);
      expect(player.hand).toHaveLength(state.config.handSize);
      expect(player.openPiles).toHaveLength(state.config.openPileCount);
      expect(player.openPiles.every((pile) => pile.length === 0)).toBe(true);
    }
  });

  it('conserves the deck across all zones', () => {
    const state = newGame({ playerNames: ['Ada', 'Bram'] });
    const dealt =
      state.players.reduce((sum, p) => sum + p.flensstok.length + p.hand.length, 0) +
      state.voorraad.length;

    expect(dealt).toBe(state.config.topValue * state.config.seriesCount);
  });

  it('deals no card twice', () => {
    const state = newGame({ playerNames: ['Ada', 'Bram', 'Cato', 'Dirk'] });
    const ids = [
      ...state.players.flatMap((p) => [...p.flensstok, ...p.hand]),
      ...state.voorraad,
    ].map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is reproducible from its seed', () => {
    const a = newGame({ playerNames: ['Ada', 'Bram'], seed: 42 });
    const b = newGame({ playerNames: ['Ada', 'Bram'], seed: 42 });
    const c = newGame({ playerNames: ['Ada', 'Bram'], seed: 43 });

    expect(a.players).toEqual(b.players);
    expect(a.players).not.toEqual(c.players);
  });

  it('never deals a position where every 1 is buried in a flensstok', () => {
    // Such a deal can never start a centre pile, so the game is unplayable.
    for (let seed = 1; seed <= 200; seed++) {
      const state = newGame({ playerNames: ['Ada', 'Bram', 'Cato', 'Dirk'], seed });

      const reachable = [
        ...state.players.flatMap((p) => [
          ...p.hand,
          ...p.flensstok.slice(-1), // only the exposed top is reachable
        ]),
        ...state.voorraad,
      ];

      expect(
        reachable.some((c) => c.value === 1),
        `seed ${seed} dealt an unplayable position`,
      ).toBe(true);
    }
  });

  it('starts empty in the centre with no infraction open', () => {
    const state = newGame({ playerNames: ['Ada', 'Bram'] });
    expect(state.centre.every((pile) => pile.cards.length === 0)).toBe(true);
    expect(state.pendingInfraction).toBeNull();
    expect(state.phase).toBe('playing');
  });
});

describe('validateConfig', () => {
  it('rejects a deal that cannot fit in the deck', () => {
    expect(() => validateConfig(makeConfig({ seriesCount: 1, topValue: 5 }), 4)).toThrow(
      /cannot deal/,
    );
  });

  it('accepts the defaults for a full table', () => {
    expect(() => validateConfig(makeConfig(), 6)).not.toThrow();
  });
});
