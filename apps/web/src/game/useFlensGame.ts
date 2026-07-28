/**
 * Drives a local game: one human (seat 0) against bots.
 *
 * The engine has no clock of its own — it only moves when fed a `tick` — so this
 * hook is what turns it into a real-time game. That matters because the Flens
 * window is the point of the prototype: a six-second countdown you have to
 * notice and react to.
 *
 * The authoritative state lives in a ref rather than in `useState`, so the
 * interval callback always sees the current game instead of a stale closure.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newGame, reduce, viewFor, type Action, type GameState, type GameView } from '@flens/engine';
import { PROFILES, botAction, botCallsFlens, type Difficulty } from '@flens/bot';

const TICK_MS = 100;
export const HUMAN_SEAT = 0;

/** How long a bot mulls its turn, so you can watch it and catch mistakes. */
const BOT_THINK_MIN_MS = 700;
const BOT_THINK_VARIANCE_MS = 900;

export interface GameOptions {
  readonly opponents: number;
  readonly difficulty: Difficulty;
  readonly topValue: number;
  readonly seed: number;
  /**
   * Training wheels. Off by default: the engine withholds the pending
   * infraction precisely so that spotting it stays the player's job. Turning it
   * on shows the countdown and names the mistake — useful for learning the rules
   * or debugging, useless as a test of whether the mechanic is fun.
   */
  readonly hints: boolean;
}

export interface FlensGame {
  readonly view: GameView;
  readonly hints: boolean;
  /** Only ever true with hints on — otherwise nobody tells you. */
  readonly infractionVisible: boolean;
  /** Whose mistake is on the table. Null without hints. */
  readonly flensTarget: string | null;
  readonly isYourTurn: boolean;
  readonly play: (from: Action extends never ? never : PlaySource, centreIndex: number) => void;
  readonly discard: (handIndex: number, openPileIndex: number) => void;
  readonly callFlens: () => void;
  readonly pass: () => void;
  readonly restart: (options?: Partial<GameOptions>) => void;
  readonly lastRejection: string | null;
}

export type PlaySource =
  | { kind: 'hand'; index: number }
  | { kind: 'flensstok' }
  | { kind: 'openPile'; index: number };

/** Per-infraction decisions, so a bot doesn't re-roll its reaction every tick. */
interface FlensIntent {
  readonly infractionAt: number;
  readonly callers: Map<number, number>;
}

export function useFlensGame(initial: GameOptions): FlensGame {
  const gameRef = useRef<GameState>(createGame(initial));
  const optionsRef = useRef<GameOptions>(initial);
  const nextBotMoveRef = useRef<number>(BOT_THINK_MIN_MS);
  const intentRef = useRef<FlensIntent | null>(null);
  const rejectionRef = useRef<string | null>(null);

  const [, bumpVersion] = useState(0);
  const rerender = useCallback(() => bumpVersion((v) => v + 1), []);

  const apply = useCallback(
    (action: Action): boolean => {
      const result = reduce(gameRef.current, action);
      if (!result.ok) {
        rejectionRef.current = result.reason;
        rerender();
        return false;
      }
      gameRef.current = result.state;
      rejectionRef.current = null;
      return true;
    },
    [rerender],
  );

  // The heartbeat: advance the engine clock, let bots act, let bots call FLENS!
  useEffect(() => {
    const id = window.setInterval(() => {
      const before = gameRef.current;
      apply({ type: 'tick', ms: TICK_MS });

      if (gameRef.current.phase === 'playing') {
        runBotFlensCalls(gameRef, intentRef, optionsRef.current, apply);
        runBotTurn(gameRef, nextBotMoveRef, optionsRef.current, apply);
      }

      if (gameRef.current !== before) rerender();
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [apply, rerender]);

  const state = gameRef.current;
  const options = optionsRef.current;
  const view = useMemo(
    () => viewFor(state, HUMAN_SEAT, { revealInfractions: options.hints }),
    [state, options.hints],
  );

  const infraction = view.pendingInfraction;
  const infractionVisible =
    state.phase === 'playing' && infraction !== null && infraction.offender !== HUMAN_SEAT;

  return {
    view,
    hints: options.hints,
    infractionVisible,
    flensTarget: infractionVisible ? (state.players[infraction!.offender]?.name ?? null) : null,
    isYourTurn: state.currentPlayer === HUMAN_SEAT && state.phase === 'playing',
    lastRejection: rejectionRef.current,

    play: (from, centreIndex) => {
      apply({
        type: 'play',
        player: HUMAN_SEAT,
        from,
        to: { kind: 'centre', index: centreIndex },
      });
      rerender();
    },

    discard: (handIndex, openPileIndex) => {
      apply({ type: 'discard', player: HUMAN_SEAT, handIndex, openPileIndex });
      rerender();
    },

    callFlens: () => {
      apply({ type: 'callFlens', player: HUMAN_SEAT });
      rerender();
    },

    pass: () => {
      apply({ type: 'pass', player: HUMAN_SEAT });
      rerender();
    },

    restart: (overrides) => {
      const options = { ...optionsRef.current, ...overrides, seed: Math.floor(Math.random() * 1e9) };
      optionsRef.current = options;
      gameRef.current = createGame(options);
      nextBotMoveRef.current = BOT_THINK_MIN_MS;
      intentRef.current = null;
      rejectionRef.current = null;
      rerender();
    },
  };
}

function createGame(options: GameOptions): GameState {
  const botNames = ['Bram', 'Cato', 'Dirk', 'Eef', 'Fokke'];
  return newGame({
    playerNames: ['You', ...botNames.slice(0, options.opponents)],
    seed: options.seed,
    config: { topValue: options.topValue },
  });
}

function runBotTurn(
  gameRef: React.MutableRefObject<GameState>,
  nextMoveRef: React.MutableRefObject<number>,
  options: GameOptions,
  apply: (action: Action) => boolean,
): void {
  const state = gameRef.current;
  if (state.currentPlayer === HUMAN_SEAT) return;
  if (state.now < nextMoveRef.current) return;

  const profile = PROFILES[options.difficulty];
  apply(botAction(state, state.currentPlayer, profile, Math.random));

  nextMoveRef.current =
    gameRef.current.now + BOT_THINK_MIN_MS + Math.random() * BOT_THINK_VARIANCE_MS;
}

function runBotFlensCalls(
  gameRef: React.MutableRefObject<GameState>,
  intentRef: React.MutableRefObject<FlensIntent | null>,
  options: GameOptions,
  apply: (action: Action) => boolean,
): void {
  const state = gameRef.current;
  const infraction = state.pendingInfraction;
  if (!infraction) {
    intentRef.current = null;
    return;
  }

  // Roll each bot's reaction once per infraction, not once per tick.
  if (intentRef.current?.infractionAt !== infraction.at) {
    const profile = PROFILES[options.difficulty];
    const callers = new Map<number, number>();
    for (const player of state.players) {
      if (player.id === HUMAN_SEAT || player.id === infraction.offender) continue;
      if (Math.random() >= profile.spotChance) continue;
      // Spread reaction times a little so they don't all pounce in lockstep.
      callers.set(player.id, profile.spotDelayMs * (0.7 + Math.random() * 0.6));
    }
    intentRef.current = { infractionAt: infraction.at, callers };
  }

  const elapsed = state.now - infraction.at;
  for (const [playerId, delay] of intentRef.current.callers) {
    if (elapsed < delay) continue;
    if (!botCallsFlens(state, playerId, PROFILES[options.difficulty], elapsed, () => 0)) continue;
    apply({ type: 'callFlens', player: playerId });
    intentRef.current = null;
    return;
  }
}
