/**
 * The tutorial is data, and data rots quietly.
 *
 * A lesson that asks for a card the learner does not hold, or a play the engine
 * refuses, leaves a beginner clicking at a table that will not respond — and
 * nothing else in the build would notice. So every lesson is played through the
 * real engine here: the position it deals, the action it asks for, the opponent
 * script it runs, and the mistakes it promises to punish.
 */

import { describe, expect, it } from 'vitest';
import { availableCentrePlays, reduce, type Action, type GameState } from '@flens/engine';
import { judge, isCompletable, LEARNER, LESSONS, OPPONENT, solutionFor } from './lessons';

const apply = (state: GameState, action: Action): GameState => {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(`engine refused: ${result.reason}`);
  return result.state;
};

/** Run the opponent's script until it has nothing left to do. */
const runOpponent = (lesson: (typeof LESSONS)[number], state: GameState): GameState => {
  let current = state;
  for (let i = 0; i < 4; i++) {
    const action = lesson.opponent?.(current);
    if (!action) return current;
    current = apply(current, action);
  }
  throw new Error('opponent script never stopped');
};

describe.each(LESSONS.map((lesson, index) => [index + 1, lesson.id, lesson] as const))(
  'lesson %i (%s)',
  (_index, _id, lesson) => {
    it('deals a position the learner can act in', () => {
      const state = lesson.build();
      expect(state.phase).toBe('playing');
      expect(state.players.length).toBeGreaterThanOrEqual(2);
      expect(isCompletable(lesson, state)).toBe(true);
    });

    it('turns off the clock, so reading is never punished', () => {
      expect(lesson.build().config.turnTimeoutMs).toBeNull();
    });

    it('can be finished by the action it asks for', () => {
      const dealt = lesson.build();
      const state = runOpponent(lesson, dealt);

      const solution = solutionFor(lesson, state);
      expect(solution).not.toBeNull();

      expect(judge(lesson, state, solution as Action)).toEqual({ kind: 'accept' });
      const result = reduce(state, solution as Action);
      expect(result.ok).toBe(true);
    });

    it('refuses everything else with something to read', () => {
      const state = runOpponent(lesson, lesson.build());
      const candidates: Action[] = [
        { type: 'play', player: LEARNER, from: { kind: 'hand', index: 2 }, to: { kind: 'centre', index: 3 } },
        { type: 'discard', player: LEARNER, handIndex: 1, openPileIndex: 1 },
        { type: 'callFlens', player: LEARNER },
        { type: 'pass', player: LEARNER },
      ];

      /** Would the gate be right to take this? Then it is not a wrong move. */
      const isTheGoal = (action: Action): boolean =>
        (lesson.goal.kind === 'discard' && action.type === 'discard') ||
        (lesson.goal.kind === 'flens' && action.type === 'callFlens') ||
        (lesson.goal.kind === 'play' &&
          action.type === 'play' &&
          JSON.stringify(action.from) === JSON.stringify(lesson.goal.from));

      for (const action of candidates.filter((a) => !isTheGoal(a))) {
        const verdict = judge(lesson, state, action);
        // `permit` is a lesson deliberately letting a mistake land; anything
        // else must come back with a sentence explaining why not.
        if (verdict.kind === 'refuse') expect(verdict.message.length).toBeGreaterThan(20);
        else expect(verdict.kind).toBe('permit');
      }
    });
  },
);

describe('the lessons that need an opponent', () => {
  const byId = (id: string) => LESSONS.find((l) => l.id === id)!;

  it('holds the scripted opponent until the learner is watching', () => {
    for (const lesson of LESSONS) {
      if (lesson.goal.kind === 'flens') expect(lesson.arm).toBe(true);
    }
  });

  it('makes Bram play out of sequence, exactly once', () => {
    const lesson = byId('spot');
    const dealt = lesson.build();
    const after = runOpponent(lesson, dealt);

    expect(after.pendingInfraction?.kind).toBe('outOfSequence');
    expect(after.pendingInfraction?.offender).toBe(OPPONENT);
    // A script that fired twice would bury the first mistake before it could be
    // called: `openInfraction` settles the previous one.
    expect(lesson.opponent?.(after)).toBeNull();
  });

  it('makes Bram end a turn with his flensstok top playable', () => {
    const lesson = byId('watch');
    const dealt = lesson.build();

    // The whole lesson rests on this being spottable from public information.
    const bram = dealt.players[OPPONENT]!;
    const stokTop = bram.flensstok.at(-1)!;
    expect(dealt.centre.some((pile) => pile.cards.at(-1)?.value === stokTop.value - 1)).toBe(true);

    const after = runOpponent(lesson, dealt);
    expect(after.pendingInfraction?.kind).toBe('missedCentrePlay');
    expect(after.pendingInfraction?.offender).toBe(OPPONENT);
  });

  it('punishes the discard it invites, rather than merely warning about it', () => {
    const lesson = byId('voorrang');
    const dealt = lesson.build();

    const discard: Action = { type: 'discard', player: LEARNER, handIndex: 1, openPileIndex: 0 };
    expect(judge(lesson, dealt, discard).kind).toBe('permit');

    const afterDiscard = apply(dealt, discard);
    expect(afterDiscard.pendingInfraction?.kind).toBe('missedCentrePlay');
    expect(afterDiscard.pendingInfraction?.offender).toBe(LEARNER);

    // And Bram must actually pounce, or the lesson is a rule with no teeth.
    const called = runOpponent(lesson, afterDiscard);
    expect(called.pendingInfraction).toBeNull();
    expect(called.log.some((e) => e.kind === 'flens' || e.message.includes('FLENS!'))).toBe(true);
    expect(lesson.mistake).toBeTruthy();
  });
});

describe('the lessons that must not have a distraction in them', () => {
  it('leaves no legal centre play in the discard lesson', () => {
    const lesson = LESSONS.find((l) => l.goal.kind === 'discard')!;
    // Otherwise the tutorial teaches a discard that is itself an infraction.
    expect(availableCentrePlays(lesson.build(), LEARNER)).toEqual([]);
  });

  it('completes a run in the Pankouk lesson', () => {
    const lesson = LESSONS.find((l) => l.id === 'pankouk')!;
    const state = lesson.build();
    const after = apply(state, solutionFor(lesson, state) as Action);
    expect(after.log.some((e) => e.kind === 'pankouk')).toBe(true);
  });

  it('ends the last lesson with the learner winning', () => {
    const lesson = LESSONS.at(-1)!;
    const state = lesson.build();
    const after = apply(state, solutionFor(lesson, state) as Action);
    expect(after.phase).toBe('finished');
    expect(after.winner).toBe(LEARNER);
  });
});

describe('the whole tutorial, played end to end', () => {
  it('gets from the first lesson to a win without the engine refusing anything', () => {
    for (const lesson of LESSONS) {
      const state = runOpponent(lesson, lesson.build());
      const solution = solutionFor(lesson, state);
      expect(solution, `${lesson.id} has no solution`).not.toBeNull();
      expect(() => apply(state, solution as Action)).not.toThrow();
    }
  });

  it('says something in every slot the panel renders', () => {
    for (const lesson of LESSONS) {
      for (const field of ['title', 'body', 'task', 'done', 'nudge'] as const) {
        expect(lesson[field]?.length, `${lesson.id}.${field}`).toBeGreaterThan(0);
      }
    }
  });
});
