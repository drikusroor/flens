/** Mutable working copy of `GameState`, used inside `reduce` and discarded after. */

import type { Params } from '@flens/i18n';
import type { Card, GameState, Infraction, LogEntry, LogKind, LogMessage } from './types.js';

export interface DraftPlayer {
  id: number;
  name: string;
  flensstok: Card[];
  hand: Card[];
  openPiles: Card[][];
}

export interface Draft {
  config: GameState['config'];
  rng: number;
  now: number;
  players: DraftPlayer[];
  centre: { cards: Card[] }[];
  voorraad: Card[];
  completed: Card[];
  currentPlayer: number;
  phase: GameState['phase'];
  winner: number | null;
  consecutivePasses: number;
  idleTurns: number;
  turnStartedAt: number;
  pendingInfraction: Infraction | null;
  log: LogEntry[];
}

export function toDraft(state: GameState): Draft {
  return {
    config: state.config,
    rng: state.rng,
    now: state.now,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      flensstok: [...p.flensstok],
      hand: [...p.hand],
      openPiles: p.openPiles.map((pile) => [...pile]),
    })),
    centre: state.centre.map((pile) => ({ cards: [...pile.cards] })),
    voorraad: [...state.voorraad],
    completed: [...state.completed],
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    winner: state.winner,
    consecutivePasses: state.consecutivePasses,
    idleTurns: state.idleTurns,
    turnStartedAt: state.turnStartedAt,
    pendingInfraction: state.pendingInfraction,
    log: [...state.log],
  };
}

export function fromDraft(draft: Draft): GameState {
  return {
    config: draft.config,
    rng: draft.rng,
    now: draft.now,
    players: draft.players.map((p) => ({
      id: p.id,
      name: p.name,
      flensstok: p.flensstok,
      hand: p.hand,
      openPiles: p.openPiles,
    })),
    centre: draft.centre,
    voorraad: draft.voorraad,
    completed: draft.completed,
    currentPlayer: draft.currentPlayer,
    phase: draft.phase,
    winner: draft.winner,
    consecutivePasses: draft.consecutivePasses,
    idleTurns: draft.idleTurns,
    turnStartedAt: draft.turnStartedAt,
    pendingInfraction: draft.pendingInfraction,
    log: draft.log,
  };
}

/**
 * Records what happened without wording it. `kind` is the coarse category a UI
 * keys sound and styling off; `key` picks the actual line, since one kind can
 * have several (a turn can time out into a play, a pass or a discard).
 */
export function note(
  draft: Draft,
  kind: LogKind,
  key: LogMessage['key'],
  params?: Params,
  secret = false,
): void {
  const entry: LogEntry = {
    at: draft.now,
    kind,
    text: params === undefined ? { key } : { key, params },
  };
  draft.log.push(secret ? { ...entry, secret: true } : entry);
}
