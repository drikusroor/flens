/**
 * Drives the tutorial.
 *
 * Structurally a sibling of `useFlensGame`: same 100ms heartbeat, same
 * `TableController` on the way out, so the tutorial renders through the real
 * `Table` with the real sounds and the real animations. The differences are that
 * every action passes the lesson gate first, and the opponent follows a script
 * rather than a bot policy.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reduce, viewFor, type Action, type GameState } from '@flens/engine';
import type { TableController } from '../game/controller';
import type { PlaySource } from '../game/useFlensGame';
import { judge, LESSONS, LEARNER, type Lesson, type Zone } from './lessons';

const TICK_MS = 100;

/** How long the opponent mulls, so a scripted move is watchable rather than instant. */
const OPPONENT_PACE_MS = 1400;
/** Longer after the learner acts — they are looking at what they just did. */
const OPPONENT_AFTER_PLAYER_MS = 1100;
/** Beat between the punishment landing and the lesson being dealt again. */
const RESET_AFTER_MS = 3400;

export type Stage =
  /** Reading, clock stopped, opponent held. Only for lessons that must be watched. */
  | 'briefing'
  | 'doing'
  | 'done'
  /** Caught out on purpose; the lesson is about to restart. */
  | 'punished'
  | 'graduated';

export interface TutorialController extends TableController {
  readonly lesson: Lesson;
  readonly lessonIndex: number;
  readonly lessonCount: number;
  readonly stage: Stage;
  readonly focus: Zone | null;
  /** Nudge, or the explanation after a punishment. Cleared as soon as they act. */
  readonly coach: string | null;
  readonly arm: () => void;
  readonly next: () => void;
  readonly restartLesson: () => void;
}

const openingStage = (lesson: Lesson | undefined): Stage =>
  lesson?.arm === true ? 'briefing' : 'doing';

export function useTutorial(): TutorialController {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>(() => openingStage(LESSONS[0]));
  const [coach, setCoach] = useState<string | null>(null);

  const lesson = LESSONS[index] as Lesson;

  const stateRef = useRef<GameState>(lesson.build());
  const opponentAtRef = useRef(OPPONENT_PACE_MS);
  /** True once an infraction has existed in this attempt, so a miss is detectable. */
  const sawInfractionRef = useRef(false);
  const resetAtRef = useRef<number | null>(null);

  /**
   * The stage is read inside the heartbeat, which can fire before React has
   * re-rendered from a `setStage`. Keeping a ref in step means a lesson that has
   * just been completed is never also treated as still running.
   */
  const stageRef = useRef<Stage>(stage);
  const enter = useCallback((next: Stage) => {
    stageRef.current = next;
    setStage(next);
  }, []);

  const [, bump] = useState(0);
  const rerender = useCallback(() => bump((v) => v + 1), []);

  const loadLesson = useCallback(
    (next: Lesson, message: string | null = null) => {
      stateRef.current = next.build();
      opponentAtRef.current = OPPONENT_PACE_MS;
      sawInfractionRef.current = false;
      resetAtRef.current = null;
      enter(openingStage(next));
      setCoach(message);
    },
    [enter],
  );

  const apply = useCallback((action: Action): boolean => {
    const result = reduce(stateRef.current, action);
    if (!result.ok) return false;
    stateRef.current = result.state;
    return true;
  }, []);

  /**
   * Everything the learner clicks comes through here. The gate answers before
   * the engine sees it, so a beginner's misclick produces an explanation rather
   * than an infraction nobody has taught them about yet.
   */
  const attempt = useCallback(
    (action: Action) => {
      if (stageRef.current !== 'doing') return;

      const verdict = judge(lesson, stateRef.current, action);
      if (verdict.kind === 'refuse') {
        setCoach(verdict.message);
        rerender();
        return;
      }

      if (!apply(action)) {
        // Something the gate allowed but the engine refused is a tutorial bug,
        // not a player mistake. Say so rather than leaving them clicking.
        setCoach('That should have worked — skip on, and mention what you clicked.');
        rerender();
        return;
      }

      setCoach(null);
      // Don't let the opponent answer in the same instant.
      opponentAtRef.current = stateRef.current.now + OPPONENT_AFTER_PLAYER_MS;
      if (verdict.kind === 'accept') enter('done');
      rerender();
    },
    [apply, enter, lesson, rerender],
  );

  // The heartbeat: advance the clock, run the opponent's script, and notice when
  // a Flens window closes unused.
  useEffect(() => {
    const id = window.setInterval(() => {
      const stage = stageRef.current;
      // Briefings stop the clock, so a Flens window never starts running while
      // the learner is still reading about it.
      if (stage === 'briefing' || stage === 'graduated') return;

      const before = stateRef.current;
      apply({ type: 'tick', ms: TICK_MS });

      if (stateRef.current.pendingInfraction) sawInfractionRef.current = true;

      if (lesson.opponent && stateRef.current.now >= opponentAtRef.current) {
        const action = lesson.opponent(stateRef.current);
        if (action && apply(action)) {
          opponentAtRef.current = stateRef.current.now + OPPONENT_PACE_MS;
        }
      }

      // An infraction that has come and gone while the lesson was still running.
      if (stage === 'doing' && sawInfractionRef.current && !stateRef.current.pendingInfraction) {
        if (lesson.permitMistake) {
          // They ended the turn badly and the opponent called it: the lesson.
          enter('punished');
          setCoach(lesson.mistake ?? null);
          resetAtRef.current = stateRef.current.now + RESET_AFTER_MS;
        } else {
          loadLesson(lesson, 'Gone — the window is six seconds wide. Once more.');
        }
      }

      if (resetAtRef.current !== null && stateRef.current.now >= resetAtRef.current) {
        loadLesson(lesson, lesson.mistake ?? null);
      }

      if (stateRef.current !== before) rerender();
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [apply, enter, lesson, loadLesson, rerender]);

  const state = stateRef.current;
  const view = useMemo(
    () => viewFor(state, LEARNER, { revealInfractions: lesson.hints === true }),
    [state, lesson.hints],
  );

  const infraction = view.pendingInfraction;
  const infractionVisible =
    state.phase === 'playing' && infraction !== null && infraction.offender !== LEARNER;

  const advance = useCallback(() => {
    const next = LESSONS[index + 1];
    if (!next) {
      enter('graduated');
      return;
    }
    setIndex(index + 1);
    loadLesson(next);
  }, [enter, index, loadLesson]);

  return {
    view,
    seat: LEARNER,
    hints: lesson.hints === true,
    infractionVisible,
    flensTarget: infractionVisible ? (state.players[infraction!.offender]?.name ?? null) : null,
    isYourTurn: state.currentPlayer === LEARNER && state.phase === 'playing' && stage === 'doing',
    // No turn clock while learning; the wrap-up explains the real one.
    turnRemainingMs: null,
    // The coach line says everything a rejection would, in words a beginner has met.
    lastError: null,

    play: (from: PlaySource, centreIndex: number) =>
      attempt({ type: 'play', player: LEARNER, from, to: { kind: 'centre', index: centreIndex } }),
    discard: (handIndex: number, openPileIndex: number) =>
      attempt({ type: 'discard', player: LEARNER, handIndex, openPileIndex }),
    callFlens: () => attempt({ type: 'callFlens', player: LEARNER }),
    pass: () => attempt({ type: 'pass', player: LEARNER }),

    lesson,
    lessonIndex: index,
    lessonCount: LESSONS.length,
    stage,
    focus: stage === 'doing' || stage === 'briefing' ? (lesson.focus ?? null) : null,
    coach,

    arm: () => {
      // The clock was stopped, so pace the opponent from the moment they say go.
      opponentAtRef.current = stateRef.current.now + OPPONENT_PACE_MS;
      enter('doing');
    },
    next: advance,
    restartLesson: () => loadLesson(lesson),
  };
}
