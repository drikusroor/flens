import { describe, expect, it } from 'vitest';
import {
  availableCentrePlays,
  newGame,
  reduce,
  type Action,
  type GameState,
  type NewGameOptions,
} from '@flens/engine';
import { PROFILES, botAction, botCallsFlens } from './index.js';

/**
 * These harnesses jump the clock forward to expire Flens windows, which would
 * trip the turn timer on every move. The timer exists to stop a human stalling;
 * bots answer instantly.
 */
function game(options: NewGameOptions): GameState {
  return newGame({ ...options, config: { ...options.config, turnTimeoutMs: null } });
}

/** Deterministic stand-in for Math.random. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const never = () => 0.999;
const always = () => 0;

function playOut(state: GameState, profileKey: keyof typeof PROFILES, rand: () => number) {
  let current = state;
  for (let i = 0; i < 5_000 && current.phase === 'playing'; i++) {
    const action = botAction(current, current.currentPlayer, PROFILES[profileKey], rand);
    const result = reduce(current, action);
    if (!result.ok) throw new Error(`bot produced a rejected action: ${result.reason}`);
    current = result.state;
    const ticked = reduce(current, { type: 'tick', ms: 10_000 });
    if (ticked.ok) current = ticked.state;
  }
  return current;
}

describe('botAction', () => {
  it('never produces an action the engine rejects', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const start = game({ playerNames: ['Ada', 'Bram', 'Cato'], seed });
      expect(() => playOut(start, 'easy', seeded(seed))).not.toThrow();
    }
  });

  it('finishes games', () => {
    const state = playOut(game({ playerNames: ['Ada', 'Bram'], seed: 4 }), 'normal', seeded(4));
    expect(state.phase).not.toBe('playing');
  });

  it('prefers the flensstok, since emptying it is how you win', () => {
    const start = game({ playerNames: ['Ada', 'Bram'], seed: 2 });
    // Find a state where the flensstok top is playable.
    let state = start;
    for (let i = 0; i < 300 && state.phase === 'playing'; i++) {
      const plays = availableCentrePlays(state, state.currentPlayer);
      if (plays.some((p) => p.from.kind === 'flensstok')) {
        const action = botAction(state, state.currentPlayer, PROFILES.hard, never);
        expect(action.type).toBe('play');
        expect((action as Extract<Action, { type: 'play' }>).from.kind).toBe('flensstok');
        return;
      }
      const result = reduce(state, botAction(state, state.currentPlayer, PROFILES.hard, never));
      if (!result.ok) break;
      state = result.state;
    }
  });

  it('makes mistakes when its error rate says so', () => {
    const start = game({ playerNames: ['Ada', 'Bram'], seed: 6 });
    const state = playOut(start, 'easy', seeded(9));

    expect(state.log.some((e) => e.kind === 'infraction')).toBe(true);
  });

  it('plays clean when told never to err', () => {
    const start = game({ playerNames: ['Ada', 'Bram'], seed: 6 });
    const state = playOut(start, 'hard', never);

    expect(state.log.some((e) => e.kind === 'infraction')).toBe(false);
  });
});

describe('botCallsFlens', () => {
  const withInfraction = (): GameState => {
    let state = game({ playerNames: ['Ada', 'Bram'], seed: 8 });
    // Drive Ada into an out-of-sequence play.
    for (let i = 0; i < 200 && state.pendingInfraction === null; i++) {
      const result = reduce(state, botAction(state, state.currentPlayer, PROFILES.easy, always));
      if (!result.ok) break;
      state = result.state;
    }
    return state;
  };

  it('stays silent before its reaction time has elapsed', () => {
    const state = withInfraction();
    expect(state.pendingInfraction).not.toBeNull();

    const other = state.pendingInfraction!.offender === 0 ? 1 : 0;
    expect(botCallsFlens(state, other, PROFILES.normal, 100, always)).toBe(false);
  });

  it('calls once it has had time to notice', () => {
    const state = withInfraction();
    const other = state.pendingInfraction!.offender === 0 ? 1 : 0;

    expect(botCallsFlens(state, other, PROFILES.normal, 3_000, always)).toBe(true);
  });

  it('never calls on its own mistake', () => {
    const state = withInfraction();
    const offender = state.pendingInfraction!.offender;

    expect(botCallsFlens(state, offender, PROFILES.hard, 10_000, always)).toBe(false);
  });

  it('misses it entirely when unobservant', () => {
    const state = withInfraction();
    const other = state.pendingInfraction!.offender === 0 ? 1 : 0;

    expect(botCallsFlens(state, other, PROFILES.easy, 5_000, never)).toBe(false);
  });

  it('says nothing when there is no infraction', () => {
    const clean = game({ playerNames: ['Ada', 'Bram'], seed: 1 });
    expect(botCallsFlens(clean, 1, PROFILES.hard, 10_000, always)).toBe(false);
  });
});
