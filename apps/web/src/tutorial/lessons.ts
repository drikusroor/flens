/**
 * The tutorial, as data.
 *
 * Each lesson is a real table built with `scenario`, played through the real
 * engine, rendered by the real `Table`. Nothing here is a mock or a mime: the
 * clicks, the sounds, the animations and the rules are the ones the player will
 * meet five minutes later in an actual game, so everything they learn transfers.
 *
 * A lesson states what the learner has to do (`goal`) and, in the catalogue,
 * what to say when they try something else (its `nudge`). Anything that is not
 * the goal is refused before it reaches the engine — with one deliberate
 * exception, `permitMistake`, where being caught is the lesson.
 *
 * The words live in `@flens/i18n` under `lesson.<id>.*`, so the tutorial is
 * taught in the learner's own language; a lesson here is the *position* and the
 * *rule*, and carries only the key of what to say about them.
 *
 * This module is free of React on purpose: `lessons.test.ts` plays the whole
 * tutorial through the engine, so a lesson that asks for something the rules do
 * not allow fails the build rather than stranding a beginner.
 */

import {
  nextValueFor,
  scenario,
  type Action,
  type CardSource,
  type FlensConfig,
  type GameState,
} from '@flens/engine';
import type { Message, MessageKey } from '@flens/i18n';

/** The seat the learner occupies. The opponent is seat 1. */
export const LEARNER = 0;
export const OPPONENT = 1;

/**
 * The opponent's name, passed into every lesson line as `{opponent}`.
 *
 * A translator needs it as a parameter rather than baked into the sentence:
 * Spanish wants "Vigila a Bram", and the name has to be somewhere the grammar
 * around it can move.
 */
export const OPPONENT_NAME = 'Bram';

/**
 * What the learner's seat is called when nobody says otherwise. The coach panel
 * has its own heading, but the *log* prints seat names, and a Dutch learner
 * reading "You speelde 1 op middenstapel 0" is being taught in two languages at
 * once — so `build` takes the name and `useTutorial` passes the translated one.
 */
export const DEFAULT_LEARNER_NAME = 'You';

export type LessonId =
  | 'centre'
  | 'flensstok'
  | 'priority'
  | 'discard'
  | 'voorrang'
  | 'spot'
  | 'watch'
  | 'pankouk'
  | 'win';

/** Which of a lesson's five paragraphs. */
export type LessonPart = 'title' | 'body' | 'task' | 'done' | 'nudge';

/**
 * The catalogue key for one paragraph of one lesson. Typed as a template
 * literal, so a lesson id with no text behind it will not compile.
 */
export const lessonKey = <Id extends LessonId, Part extends LessonPart>(
  id: Id,
  part: Part,
): `lesson.${Id}.${Part}` => `lesson.${id}.${part}`;

/** What the coach panel says, including the opponent's name. */
export const lessonText = (id: LessonId, part: LessonPart): Message => ({
  key: lessonKey(id, part),
  params: { opponent: OPPONENT_NAME },
});

/**
 * No turn clock while learning. A beginner reading a paragraph should not have
 * the table discard for them halfway through it; the wrap-up mentions the real
 * 45-second limit instead.
 */
const TEACHING: Partial<FlensConfig> = { turnTimeoutMs: null };

/** What the learner has to do to finish a lesson. */
export type Goal =
  /** Play the card at `from` onto whichever centre pile accepts it. */
  | { readonly kind: 'play'; readonly from: CardSource }
  /** Any hand card onto any open pile. */
  | { readonly kind: 'discard' }
  /** Catch the opponent out. */
  | { readonly kind: 'flens' };

/** Which part of the table to ring while the lesson is running. */
export type Zone = 'centre' | 'flensstok' | 'openPiles' | 'hand' | 'flens' | 'opponents';

export interface Lesson {
  /**
   * Also the catalogue prefix: `lesson.<id>.title`, `.body`, `.task`, `.done`
   * and `.nudge` are what the coach panel reads out. `.nudge` is where the
   * teaching happens — it answers the wrong click a beginner just made.
   */
  readonly id: LessonId;
  readonly goal: Goal;
  /** Deals the position. Takes the learner's name so the log can be localised. */
  readonly build: (learnerName?: string) => GameState;
  readonly focus?: Zone;

  /**
   * Opponent behaviour, consulted on every tick and paced so it is watchable.
   * Must be idempotent-by-inspection: it is asked repeatedly and has to return
   * null once it has done its bit.
   */
  readonly opponent?: (state: GameState) => Action | null;

  /**
   * Hold the opponent until the learner says they are watching. Only for
   * lessons where the whole point is catching something as it happens — being
   * asked to spot a mistake you were still reading about teaches nothing.
   */
  readonly arm?: boolean;

  /** Show the Flens countdown, as the real game's hint mode does. */
  readonly hints?: boolean;

  /**
   * Let one specific wrong action through instead of refusing it, because the
   * punishment is the lesson. The opponent is expected to pounce.
   */
  readonly permitMistake?: 'discard';
  /** Shown after the punishment lands, before the lesson restarts. */
  readonly mistake?: MessageKey;
}

const run = (to: number): number[] => Array.from({ length: to }, (_, i) => i + 1);

/**
 * Cards for an opponent who is not doing anything this lesson. Face down and
 * never played, so the values are arbitrary — but a seat holding nothing reads
 * as a bug rather than as a player waiting their turn.
 */
const IDLE_HAND = [12, 3, 9];

export const LESSONS: readonly Lesson[] = [
  {
    id: 'centre',
    goal: { kind: 'play', from: { kind: 'hand', index: 0 } },
    focus: 'centre',
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        players: [
          { name: learner, hand: [1, 7, 12, 15], flensstok: [16, 9, 4] },
          { name: OPPONENT_NAME, hand: IDLE_HAND, flensstok: [16, 10] },
        ],
      }),
  },

  {
    id: 'flensstok',
    goal: { kind: 'play', from: { kind: 'flensstok' } },
    focus: 'flensstok',
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        players: [
          { name: learner, hand: [8, 11, 14], flensstok: [16, 13, 5] },
          { name: OPPONENT_NAME, hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [[1, 2, 3, 4]],
      }),
  },

  {
    id: 'priority',
    goal: { kind: 'play', from: { kind: 'flensstok' } },
    focus: 'flensstok',
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        players: [
          { name: learner, hand: [7, 9, 12], flensstok: [16, 7] },
          { name: OPPONENT_NAME, hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [run(6)],
      }),
  },

  {
    id: 'discard',
    goal: { kind: 'discard' },
    focus: 'openPiles',
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        players: [
          { name: learner, hand: [8, 11, 14, 16], flensstok: [16, 12] },
          { name: OPPONENT_NAME, hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [[1, 2, 3], run(5), [1], run(9)],
      }),
  },

  {
    id: 'voorrang',
    goal: { kind: 'play', from: { kind: 'hand', index: 0 } },
    focus: 'centre',
    permitMistake: 'discard',
    mistake: 'lesson.voorrang.mistake',
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        players: [
          { name: learner, hand: [6, 10, 13, 15], flensstok: [16, 14] },
          { name: OPPONENT_NAME, hand: IDLE_HAND, flensstok: [16, 10], openPiles: [[13, 15, 11]] },
        ],
        centre: [run(5), [1, 2], run(7), [1, 2, 3]],
      }),
    // Pounce the moment the learner ends the turn badly — nobody else will.
    opponent: (state) =>
      state.pendingInfraction?.offender === LEARNER
        ? { type: 'callFlens', player: OPPONENT }
        : null,
  },

  {
    id: 'spot',
    goal: { kind: 'flens' },
    focus: 'flens',
    arm: true,
    hints: true,
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        currentPlayer: OPPONENT,
        players: [
          { name: learner, hand: [9, 12, 15, 16], flensstok: [16, 13], openPiles: [[7]] },
          { name: OPPONENT_NAME, hand: [11, 12, 15], flensstok: [16, 4], openPiles: [[8]] },
        ],
        centre: [run(5), [1, 2], [], [1, 2, 3]],
      }),
    // Once, and only once: the pile it lands on is what tells us it has happened.
    opponent: (state) =>
      state.centre[1]?.cards.length === 2
        ? {
            type: 'play',
            player: OPPONENT,
            from: { kind: 'hand', index: 0 },
            to: { kind: 'centre', index: 1 },
          }
        : null,
  },

  {
    id: 'watch',
    goal: { kind: 'flens' },
    focus: 'opponents',
    arm: true,
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        currentPlayer: OPPONENT,
        players: [
          { name: learner, hand: [11, 13, 15, 16], flensstok: [16, 14], openPiles: [[12, 12]] },
          { name: OPPONENT_NAME, hand: [10, 14, 16], flensstok: [16, 6] },
        ],
        centre: [run(5), run(8), [1, 2], [1]],
      }),
    opponent: (state) =>
      state.currentPlayer === OPPONENT
        ? { type: 'discard', player: OPPONENT, handIndex: 0, openPileIndex: 0 }
        : null,
  },

  {
    id: 'pankouk',
    goal: { kind: 'play', from: { kind: 'hand', index: 0 } },
    focus: 'centre',
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        players: [
          { name: learner, hand: [16, 9, 11], flensstok: [16, 13] },
          { name: OPPONENT_NAME, hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [run(15)],
      }),
  },

  {
    id: 'win',
    goal: { kind: 'play', from: { kind: 'flensstok' } },
    focus: 'flensstok',
    build: (learner = DEFAULT_LEARNER_NAME) =>
      scenario({
        config: TEACHING,
        players: [
          { name: learner, hand: [9, 12, 15], flensstok: [7] },
          { name: OPPONENT_NAME, hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [run(6)],
      }),
  },
];

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

export type Verdict =
  | { readonly kind: 'accept' }
  /** A wrong move the lesson wants to let through, because it teaches. */
  | { readonly kind: 'permit' }
  | { readonly kind: 'refuse'; readonly message: Message };

const sourceKey = (s: CardSource): string =>
  s.kind === 'flensstok' ? s.kind : `${s.kind}:${s.index}`;

/**
 * Should this action reach the engine?
 *
 * Refusals are the tutorial's voice, so they explain rather than scold — a
 * beginner clicking the wrong card is asking a question, and the answer is the
 * rule they have not met yet.
 */
export function judge(lesson: Lesson, state: GameState, action: Action): Verdict {
  if (action.type === 'tick') return { kind: 'accept' };
  if (action.player !== LEARNER) return { kind: 'accept' };

  const wrongCall = {
    kind: 'refuse',
    message: { key: 'tutorial.wrongCall' },
  } as const;

  const nudge = { kind: 'refuse', message: lessonText(lesson.id, 'nudge') } as const;

  switch (lesson.goal.kind) {
    case 'flens':
      if (action.type !== 'callFlens') return nudge;
      return state.pendingInfraction === null ? nudge : { kind: 'accept' };

    case 'discard':
      if (action.type === 'callFlens') return wrongCall;
      if (action.type !== 'discard') return nudge;
      return { kind: 'accept' };

    case 'play': {
      if (action.type === 'callFlens') return wrongCall;
      if (action.type === 'discard') {
        return lesson.permitMistake === 'discard' ? { kind: 'permit' } : nudge;
      }
      if (action.type !== 'play') return nudge;
      if (sourceKey(action.from) !== sourceKey(lesson.goal.from)) return nudge;

      // Right card, wrong pile. Naming what the pile is waiting for is more use
      // than repeating the lesson's nudge.
      const pile = state.centre[action.to.index];
      if (!pile) return nudge;
      const card = cardFor(state, lesson.goal.from);
      const wants = nextValueFor(pile, state.config);
      if (card && wants !== card.value) {
        return {
          kind: 'refuse',
          message:
            wants === null
              ? { key: 'tutorial.runFinished' }
              : { key: 'tutorial.pileWants', params: { wants, value: card.value } },
        };
      }
      return { kind: 'accept' };
    }
  }
}

function cardFor(state: GameState, source: CardSource) {
  const player = state.players[LEARNER];
  if (!player) return null;
  switch (source.kind) {
    case 'hand':
      return player.hand[source.index] ?? null;
    case 'flensstok':
      return player.flensstok.at(-1) ?? null;
    case 'openPile':
      return player.openPiles[source.index]?.at(-1) ?? null;
  }
}

/**
 * The action that finishes a lesson.
 *
 * Derived from the position rather than written down beside the goal, so a
 * lesson cannot disagree with itself about which pile the card belongs on. The
 * tests use this to play the whole tutorial through.
 */
export function solutionFor(lesson: Lesson, state: GameState): Action | null {
  switch (lesson.goal.kind) {
    case 'flens':
      return { type: 'callFlens', player: LEARNER };
    case 'discard':
      return { type: 'discard', player: LEARNER, handIndex: 0, openPileIndex: 0 };
    case 'play': {
      const card = cardFor(state, lesson.goal.from);
      if (!card) return null;
      const index = state.centre.findIndex(
        (pile) => nextValueFor(pile, state.config) === card.value,
      );
      if (index < 0) return null;
      return {
        type: 'play',
        player: LEARNER,
        from: lesson.goal.from,
        to: { kind: 'centre', index },
      };
    }
  }
}

/**
 * Can the goal actually be reached from the position the lesson deals?
 *
 * The one thing a lesson may never get wrong: a learner clicking at a table that
 * cannot respond has no way of telling a rule they misunderstood from a bug.
 *
 * Note there is no matching `isComplete`. A lesson is finished when the gate
 * accepted an action and the engine took it — reading completion back off the
 * table would need a different rule for each lesson, since the winning play
 * empties a flensstok, the Pankouk play empties a *centre* pile, and a discard
 * refills a hand.
 */
export function isCompletable(lesson: Lesson, state: GameState): boolean {
  switch (lesson.goal.kind) {
    case 'flens':
      // The infraction has to come from somewhere; the opponent tests check that
      // the script really produces one.
      return typeof lesson.opponent === 'function';
    case 'discard': {
      const player = state.players[LEARNER];
      return player !== undefined && player.hand.length > 0 && player.openPiles.length > 0;
    }
    case 'play':
      return solutionFor(lesson, state) !== null;
  }
}
