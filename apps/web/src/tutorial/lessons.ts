/**
 * The tutorial, as data.
 *
 * Each lesson is a real table built with `scenario`, played through the real
 * engine, rendered by the real `Table`. Nothing here is a mock or a mime: the
 * clicks, the sounds, the animations and the rules are the ones the player will
 * meet five minutes later in an actual game, so everything they learn transfers.
 *
 * A lesson states what the learner has to do (`goal`) and what to say when they
 * try something else (`nudge`). Anything that is not the goal is refused before
 * it reaches the engine — with one deliberate exception, `permitMistake`, where
 * being caught is the lesson.
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

/** The seat the learner occupies. The opponent is seat 1. */
export const LEARNER = 0;
export const OPPONENT = 1;

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
  readonly id: string;
  readonly title: string;
  /** Why this rule exists. Two or three sentences; nobody reads more. */
  readonly body: string;
  /** The imperative. One clause, and always a click they can find. */
  readonly task: string;
  /** Said once the goal is met. */
  readonly done: string;
  readonly goal: Goal;
  /** Said when they try something else. This is where the teaching happens. */
  readonly nudge: string;
  readonly build: () => GameState;
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
  readonly mistake?: string;
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
    title: 'The centre starts at one',
    body:
      'Four piles in the middle of the table. Every one of them starts at 1 and builds up to 16, ' +
      'and any player may add to any pile. That is the whole engine of the game.',
    task: 'Pick up your 1 and put it on an empty centre pile.',
    done: 'That pile wants a 2 now — from anybody, on any turn.',
    goal: { kind: 'play', from: { kind: 'hand', index: 0 } },
    nudge: 'The centre piles are all empty, and an empty pile only accepts a 1.',
    focus: 'centre',
    build: () =>
      scenario({
        config: TEACHING,
        players: [
          { name: 'You', hand: [1, 7, 12, 15], flensstok: [16, 9, 4] },
          { name: 'Bram', hand: IDLE_HAND, flensstok: [16, 10] },
        ],
      }),
  },

  {
    id: 'flensstok',
    title: 'Your flensstok is the race',
    body:
      'The stack on the left is your flensstok — ten cards face down, only the top one showing. ' +
      'Empty it and you win. Everything else on the table is just a way of getting at it, which ' +
      'is why you play from it whenever you can.',
    task: 'The centre wants a 5, and a 5 is sitting on your flensstok. Play it.',
    done: 'Nine to go. Every card you shift off that stack is the game getting shorter.',
    goal: { kind: 'play', from: { kind: 'flensstok' } },
    nudge: 'Nothing in your hand fits. Look at the top of your flensstok.',
    focus: 'flensstok',
    build: () =>
      scenario({
        config: TEACHING,
        players: [
          { name: 'You', hand: [8, 11, 14], flensstok: [16, 13, 5] },
          { name: 'Bram', hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [[1, 2, 3, 4]],
      }),
  },

  {
    id: 'priority',
    title: 'The flensstok goes first',
    body:
      'You are holding a 7, and there is a 7 on your flensstok. They are the same card as far as ' +
      'the centre is concerned — so the rule says the flensstok one has to go. Otherwise you could ' +
      'sit on your stack forever and never lose.',
    task: 'Play the 7 — from the right place.',
    done: 'Correct. The hand 7 keeps; the flensstok 7 could not wait.',
    goal: { kind: 'play', from: { kind: 'flensstok' } },
    nudge:
      'Both are 7s, and that is exactly the trap. Playing the one from your hand while the same ' +
      'value sits on your flensstok is an infraction — ignoring the flensstok — and it is callable.',
    focus: 'flensstok',
    build: () =>
      scenario({
        config: TEACHING,
        players: [
          { name: 'You', hand: [7, 9, 12], flensstok: [16, 7] },
          { name: 'Bram', hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [run(6)],
      }),
  },

  {
    id: 'discard',
    title: 'Ending your turn',
    body:
      'Nothing you hold fits anywhere. When you cannot play, you end your turn by putting one card ' +
      'from your hand onto one of your four open piles. Those piles are face up and you may play ' +
      'off the top of them later — so where you put a card matters.',
    task: 'Discard a card onto an open pile.',
    done: 'Turn over. Bury a card badly and you will be digging it out for the rest of the game.',
    goal: { kind: 'discard' },
    nudge: 'Nothing here reaches the centre. The only way out of this turn is a discard.',
    focus: 'openPiles',
    build: () =>
      scenario({
        config: TEACHING,
        players: [
          { name: 'You', hand: [8, 11, 14, 16], flensstok: [16, 12] },
          { name: 'Bram', hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [[1, 2, 3], run(5), [1], run(9)],
      }),
  },

  {
    id: 'voorrang',
    title: 'If you can play, you must',
    body:
      'This is the rule the whole game hangs on. Ending your turn while a legal centre play was ' +
      'still available is an infraction — and it is the call you will hear most often at a real ' +
      'table, because it is the easiest one to commit without noticing.',
    task: 'Your 6 fits the first pile. Play it instead of discarding.',
    done: 'Right. Check the centre against everything you can reach before you end a turn.',
    goal: { kind: 'play', from: { kind: 'hand', index: 0 } },
    nudge: 'Something you are holding does reach the centre. Find it before you end the turn.',
    focus: 'centre',
    permitMistake: 'discard',
    mistake:
      'And there it is. You ended your turn with a play available, Bram called it, and his open ' +
      'pile is now buried under yours for you to dig through. Again — this time play the 6.',
    build: () =>
      scenario({
        config: TEACHING,
        players: [
          { name: 'You', hand: [6, 10, 13, 15], flensstok: [16, 14] },
          { name: 'Bram', hand: IDLE_HAND, flensstok: [16, 10], openPiles: [[13, 15, 11]] },
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
    title: 'Somebody has to call it',
    body:
      'Nothing in this game stops a wrong card going down. The engine will happily let a 9 land on ' +
      'a pile waiting for a 3 — and it stays there, counting, unless another player shouts FLENS! ' +
      'within six seconds. The bar below is training wheels; there is no bar in a real game.',
    task: 'Watch Bram. The instant he plays out of sequence, hit FLENS!',
    done: 'Got him. His card comes off the pile, and your smallest open pile goes to him.',
    goal: { kind: 'flens' },
    nudge: 'Nothing to call yet — and calling wrongly costs you two cards onto your own flensstok.',
    focus: 'flens',
    arm: true,
    hints: true,
    build: () =>
      scenario({
        config: TEACHING,
        currentPlayer: OPPONENT,
        players: [
          { name: 'You', hand: [9, 12, 15, 16], flensstok: [16, 13], openPiles: [[7]] },
          { name: 'Bram', hand: [11, 12, 15], flensstok: [16, 4], openPiles: [[8]] },
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
    title: 'Now without the bar',
    body:
      'That countdown is gone, and this mistake is quieter: Bram is about to end his turn with a 6 ' +
      'on top of his flensstok while the first centre pile is asking for a 6. Comparing what people ' +
      'can reach against what the centre wants — that is the actual skill of Flens.',
    task: 'If Bram ends his turn without playing that 6, call it.',
    done:
      'That is the call that wins games. Everything you need was face up: his flensstok top and ' +
      'what the pile was asking for.',
    goal: { kind: 'flens' },
    nudge: 'Not yet. He has not ended his turn — until he does, he has done nothing wrong.',
    focus: 'opponents',
    arm: true,
    build: () =>
      scenario({
        config: TEACHING,
        currentPlayer: OPPONENT,
        players: [
          { name: 'You', hand: [11, 13, 15, 16], flensstok: [16, 14], openPiles: [[12, 12]] },
          { name: 'Bram', hand: [10, 14, 16], flensstok: [16, 6] },
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
    title: 'Pankouk!',
    body:
      'Finish a pile at 16 and the whole run is swept up and shuffled back into the supply, which ' +
      'is what keeps the game from running out of cards. Traditionally the person who lands the 16 ' +
      'shouts Pankouk — pancake. Half the names this game goes by are food.',
    task: 'Put your 16 on the finished pile.',
    done: 'Sixteen cards back into circulation, and a free pile for somebody to start at 1.',
    goal: { kind: 'play', from: { kind: 'hand', index: 0 } },
    nudge: 'One pile is one card short of complete. Look at what it is asking for.',
    focus: 'centre',
    build: () =>
      scenario({
        config: TEACHING,
        players: [
          { name: 'You', hand: [16, 9, 11], flensstok: [16, 13] },
          { name: 'Bram', hand: IDLE_HAND, flensstok: [16, 10] },
        ],
        centre: [run(15)],
      }),
  },

  {
    id: 'win',
    title: 'Flens!',
    body:
      'One card left on your flensstok, and the centre is asking for exactly it. Empty the stack ' +
      'and the game is over on the spot — no need to clear your hand or your open piles.',
    task: 'Play your last flensstok card and win.',
    done: 'Flens. That is the game.',
    goal: { kind: 'play', from: { kind: 'flensstok' } },
    nudge: 'The centre wants a 7, and there is only one place left to get one.',
    focus: 'flensstok',
    build: () =>
      scenario({
        config: TEACHING,
        players: [
          { name: 'You', hand: [9, 12, 15], flensstok: [7] },
          { name: 'Bram', hand: IDLE_HAND, flensstok: [16, 10] },
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
  | { readonly kind: 'refuse'; readonly message: string };

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
    message: 'Nothing to call — a wrong FLENS! costs you two cards onto your own flensstok.',
  } as const;

  switch (lesson.goal.kind) {
    case 'flens':
      if (action.type !== 'callFlens') return { kind: 'refuse', message: lesson.nudge };
      return state.pendingInfraction === null
        ? { kind: 'refuse', message: lesson.nudge }
        : { kind: 'accept' };

    case 'discard':
      if (action.type === 'callFlens') return wrongCall;
      if (action.type !== 'discard') return { kind: 'refuse', message: lesson.nudge };
      return { kind: 'accept' };

    case 'play': {
      if (action.type === 'callFlens') return wrongCall;
      if (action.type === 'discard') {
        return lesson.permitMistake === 'discard'
          ? { kind: 'permit' }
          : { kind: 'refuse', message: lesson.nudge };
      }
      if (action.type !== 'play') return { kind: 'refuse', message: lesson.nudge };
      if (sourceKey(action.from) !== sourceKey(lesson.goal.from)) {
        return { kind: 'refuse', message: lesson.nudge };
      }

      // Right card, wrong pile. Naming what the pile is waiting for is more use
      // than repeating the lesson's nudge.
      const pile = state.centre[action.to.index];
      if (!pile) return { kind: 'refuse', message: lesson.nudge };
      const card = cardFor(state, lesson.goal.from);
      const wants = nextValueFor(pile, state.config);
      if (card && wants !== card.value) {
        return {
          kind: 'refuse',
          message:
            wants === null
              ? 'That run is already finished. Try another pile.'
              : `That pile is waiting for a ${wants}. Find the one that wants a ${card.value}.`,
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
