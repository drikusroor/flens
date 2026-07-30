/**
 * The single state transition function. `reduce(state, action) -> ReduceResult`.
 *
 * Pure and deterministic: given the same state and action list you always get
 * the same result, which makes replays and AI self-play free.
 */

import { type Draft, fromDraft, note, toDraft } from './draft.js';
import {
  availableCentrePlays,
  cardAt,
  followsSequence,
  isCompleteRun,
  topOf,
  violatesFlensstokPriority,
} from './legality.js';
import { shuffle } from './rng.js';
import type {
  Action,
  Card,
  CardSource,
  GameState,
  Infraction,
  ReduceResult,
  RejectionReason,
} from './types.js';

export function reduce(state: GameState, action: Action): ReduceResult {
  switch (action.type) {
    case 'play':
      return handlePlay(state, action);
    case 'discard':
      return handleDiscard(state, action);
    case 'callFlens':
      return handleCallFlens(state, action);
    case 'pass':
      return handlePass(state, action);
    case 'tick':
      return handleTick(state, action);
  }
}

/** Convenience for tests and bots: apply a list of actions, throwing on rejection. */
export function reduceAll(state: GameState, actions: readonly Action[]): GameState {
  let current = state;
  for (const action of actions) {
    const result = reduce(current, action);
    if (!result.ok) throw new Error(`action rejected: ${result.reason}`);
    current = result.state;
  }
  return current;
}

const reject = (state: GameState, reason: RejectionReason): ReduceResult => ({
  ok: false,
  state,
  reason,
});
const accept = (draft: Draft): ReduceResult => ({ ok: true, state: fromDraft(draft) });

// ---------------------------------------------------------------------------
// play
// ---------------------------------------------------------------------------

function handlePlay(
  state: GameState,
  action: Extract<Action, { type: 'play' }>,
): ReduceResult {
  if (state.phase !== 'playing') return reject(state, 'reject.gameOver');
  if (action.player !== state.currentPlayer) return reject(state, 'reject.notYourTurn');

  const player = state.players[action.player];
  if (!player) return reject(state, 'reject.noSuchPlayer');

  const card = cardAt(player, action.from);
  if (!card) return reject(state, 'reject.noCardThere');

  const centrePile = state.centre[action.to.index];
  if (!centrePile) return reject(state, 'reject.noSuchCentrePile');

  const draft = toDraft(state);
  draft.consecutivePasses = 0;
  const dp = draft.players[action.player]!;
  const target = draft.centre[action.to.index]!;

  const legal = followsSequence(card, centrePile, state.config);
  const ignoredStok =
    legal && violatesFlensstokPriority(state, player, action.from, card.value);

  removeFrom(dp, action.from);
  target.cards.push(card);
  note(draft, 'play', 'log.play', { name: dp.name, value: card.value, pile: action.to.index });

  if (!legal) {
    openInfraction(draft, {
      kind: 'outOfSequence',
      offender: action.player,
      at: draft.now,
      detail: {
        key: 'infraction.outOfSequence',
        params: { value: card.value, expected: (topOf(centrePile.cards)?.value ?? 0) + 1 },
      },
      revert: { centreIndex: action.to.index, card, source: action.from },
    });
  } else if (ignoredStok) {
    openInfraction(draft, {
      kind: 'ignoredFlensstok',
      offender: action.player,
      at: draft.now,
      detail: { key: 'infraction.ignoredFlensstok', params: { value: card.value } },
    });
  }

  if (legal) {
    draft.idleTurns = 0;
    clearCompletedRuns(draft);
  }
  refillIfNeeded(draft, dp);
  checkWin(draft, dp.id);

  return accept(draft);
}

// ---------------------------------------------------------------------------
// discard — ends the turn
// ---------------------------------------------------------------------------

function handleDiscard(
  state: GameState,
  action: Extract<Action, { type: 'discard' }>,
): ReduceResult {
  if (state.phase !== 'playing') return reject(state, 'reject.gameOver');
  if (action.player !== state.currentPlayer) return reject(state, 'reject.notYourTurn');

  const player = state.players[action.player];
  if (!player) return reject(state, 'reject.noSuchPlayer');
  if (!player.hand[action.handIndex]) return reject(state, 'reject.noCardInHand');
  if (!player.openPiles[action.openPileIndex]) return reject(state, 'reject.noSuchOpenPile');

  // The priority rule: ending your turn with a legal centre play still on the
  // table is an infraction. This is the most common Flens call in real play.
  const missed = state.config.centrePriority && availableCentrePlays(state, action.player).length > 0;

  const draft = toDraft(state);
  draft.consecutivePasses = 0;
  const dp = draft.players[action.player]!;
  const card = dp.hand.splice(action.handIndex, 1)[0]!;
  dp.openPiles[action.openPileIndex]!.push(card);
  note(draft, 'discard', 'log.discard', {
    name: dp.name,
    value: card.value,
    pile: action.openPileIndex,
  });

  if (missed) {
    openInfraction(draft, {
      kind: 'missedCentrePlay',
      offender: action.player,
      at: draft.now,
      detail: { key: 'infraction.missedCentrePlay' },
    });
  }

  checkWin(draft, dp.id);
  if (draft.phase === 'playing') {
    draft.idleTurns += 1;
    if (!checkStalemate(draft)) advanceTurn(draft);
  }

  return accept(draft);
}

// ---------------------------------------------------------------------------
// callFlens
// ---------------------------------------------------------------------------

function handleCallFlens(
  state: GameState,
  action: Extract<Action, { type: 'callFlens' }>,
): ReduceResult {
  if (state.phase !== 'playing') return reject(state, 'reject.gameOver');
  const caller = state.players[action.player];
  if (!caller) return reject(state, 'reject.noSuchPlayer');

  const draft = toDraft(state);
  const dc = draft.players[action.player]!;
  const infraction = draft.pendingInfraction;

  const valid =
    infraction !== null &&
    infraction.offender !== action.player &&
    draft.now - infraction.at <= draft.config.flensWindowMs;

  if (!valid) {
    // Wrong call. Without a cost, everyone would just mash the button.
    const penalty = drawCards(draft, draft.config.falseCallPenalty);
    dc.flensstok.push(...penalty);
    note(draft, 'falseCall', 'log.falseCall', { name: dc.name, count: penalty.length });
    return accept(draft);
  }

  const offender = draft.players[infraction.offender]!;

  // A caught out-of-sequence card is taken back off the centre pile.
  if (infraction.kind === 'outOfSequence' && infraction.revert) {
    const pile = draft.centre[infraction.revert.centreIndex];
    const top = pile ? topOf(pile.cards) : null;
    if (pile && top && top.id === infraction.revert.card.id) {
      pile.cards.pop();
      offender.hand.push(top);
    }
  }

  // The reward: hand your open pile to the offender, who must play through it.
  const fromPile = action.fromPile ?? largestOpenPile(dc.openPiles);
  const given = fromPile !== null ? dc.openPiles[fromPile] : undefined;
  if (given && given.length > 0) {
    // "under the discard pile of the player who made the mistake" — the point
    // is to bury, so they go beneath the offender's deepest pile rather than
    // onto an empty one, which would cost the offender nothing.
    const target = largestOpenPile(offender.openPiles) ?? 0;
    offender.openPiles[target] = [...given, ...offender.openPiles[target]!];
    dc.openPiles[fromPile!] = [];
    note(draft, 'flens', 'log.flensCards', {
      caller: dc.name,
      offender: offender.name,
      detail: infraction.detail,
      count: given.length,
    });
  } else {
    note(draft, 'flens', 'log.flens', {
      caller: dc.name,
      offender: offender.name,
      detail: infraction.detail,
    });
  }

  draft.pendingInfraction = null;
  return accept(draft);
}

// ---------------------------------------------------------------------------
// pass
// ---------------------------------------------------------------------------

/**
 * The deadlock valve.
 *
 * Cards only return to the supply when a 1..topValue run completes, so the
 * voorraad can run dry while runs are still half-built. A player who then
 * empties their hand has no legal action at all: nothing to draw, nothing to
 * discard, nothing playable. At a real table you would simply say "pass" and
 * wait for someone else to open up a pile — so the engine allows exactly that,
 * and calls a draw if a full round of players can all do nothing.
 */
function handlePass(state: GameState, action: Extract<Action, { type: 'pass' }>): ReduceResult {
  if (state.phase !== 'playing') return reject(state, 'reject.gameOver');
  if (action.player !== state.currentPlayer) return reject(state, 'reject.notYourTurn');

  const player = state.players[action.player];
  if (!player) return reject(state, 'reject.noSuchPlayer');
  if (player.hand.length > 0) return reject(state, 'reject.mustPlayOrDiscard');
  if (availableCentrePlays(state, action.player).length > 0) {
    return reject(state, 'reject.mustPlay');
  }

  const draft = toDraft(state);
  note(draft, 'pass', 'log.pass', { name: player.name });
  draft.consecutivePasses += 1;

  if (draft.consecutivePasses >= draft.players.length) {
    draft.phase = 'stalemate';
    note(draft, 'draw', 'log.drawNoMoves');
    return accept(draft);
  }

  draft.idleTurns += 1;
  if (!checkStalemate(draft)) advanceTurn(draft);
  return accept(draft);
}

// ---------------------------------------------------------------------------
// tick — advances the engine clock
// ---------------------------------------------------------------------------

function handleTick(state: GameState, action: Extract<Action, { type: 'tick' }>): ReduceResult {
  if (action.ms < 0) return reject(state, 'reject.backwardsTick');

  const draft = toDraft(state);
  draft.now += action.ms;
  settleExpiredInfraction(draft);
  enforceTurnTimeout(draft);
  return accept(draft);
}

/**
 * Stops a turn hanging forever when nobody acts.
 *
 * The engine has no wall clock, so this only fires when someone feeds it ticks —
 * which is exactly what a server (or the local game loop) does. Timing out is
 * treated as an ordinary turn ending, so a player who times out with a legal
 * play still on the table commits the usual `missedCentrePlay` infraction.
 */
function enforceTurnTimeout(draft: Draft): void {
  const limit = draft.config.turnTimeoutMs;
  if (limit === null || draft.phase !== 'playing') return;
  if (draft.now - draft.turnStartedAt < limit) return;

  const player = draft.players[draft.currentPlayer];
  if (!player) return;

  // With an empty hand you cannot discard, so make a play if one exists —
  // otherwise there is genuinely nothing to do but pass.
  if (player.hand.length === 0) {
    const plays = availableCentrePlays(fromDraft(draft), draft.currentPlayer);
    const play = plays[0];
    if (play) {
      note(draft, 'timeout', 'log.timeoutPlay', { name: player.name, value: play.card.value });
      removeFrom(player, play.from);
      draft.centre[play.centreIndex]!.cards.push(play.card);
      draft.idleTurns = 0;
      clearCompletedRuns(draft);
      refillIfNeeded(draft, player);
      draft.turnStartedAt = draft.now;
      checkWin(draft, player.id);
      return;
    }

    note(draft, 'timeout', 'log.timeoutPass', { name: player.name });
    draft.consecutivePasses += 1;
    if (draft.consecutivePasses >= draft.players.length) {
      draft.phase = 'stalemate';
      note(draft, 'draw', 'log.drawNoMoves');
      return;
    }
    draft.idleTurns += 1;
    if (!checkStalemate(draft)) advanceTurn(draft);
    return;
  }

  const missed =
    draft.config.centrePriority &&
    availableCentrePlays(fromDraft(draft), draft.currentPlayer).length > 0;

  let target = 0;
  player.openPiles.forEach((pile, index) => {
    if (pile.length < player.openPiles[target]!.length) target = index;
  });
  const card = player.hand.splice(0, 1)[0]!;
  player.openPiles[target]!.push(card);
  note(draft, 'timeout', 'log.timeoutDiscard', { name: player.name, value: card.value });
  draft.consecutivePasses = 0;

  if (missed) {
    openInfraction(draft, {
      kind: 'missedCentrePlay',
      offender: player.id,
      at: draft.now,
      detail: { key: 'infraction.missedCentrePlay' },
    });
  }

  checkWin(draft, player.id);
  if (draft.phase === 'playing') {
    draft.idleTurns += 1;
    if (!checkStalemate(draft)) advanceTurn(draft);
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function removeFrom(player: Draft['players'][number], source: CardSource): void {
  switch (source.kind) {
    case 'hand':
      player.hand.splice(source.index, 1);
      return;
    case 'flensstok':
      player.flensstok.pop();
      return;
    case 'openPile':
      player.openPiles[source.index]!.pop();
      return;
  }
}

/**
 * Only one infraction is open at a time. Opening a new one settles the previous
 * one as unpunished — nobody spotted it in time.
 */
function openInfraction(draft: Draft, infraction: Infraction): void {
  if (draft.pendingInfraction) settleInfraction(draft, draft.pendingInfraction);
  draft.pendingInfraction = infraction;
  note(
    draft,
    'infraction',
    'log.infraction',
    { name: draft.players[infraction.offender]!.name, detail: infraction.detail },
    true,
  );
}

function settleExpiredInfraction(draft: Draft): void {
  const infraction = draft.pendingInfraction;
  if (!infraction) return;
  if (draft.now - infraction.at <= draft.config.flensWindowMs) return;
  settleInfraction(draft, infraction);
  draft.pendingInfraction = null;
}

/** Nobody called in time. Either the error stands, or we quietly undo it. */
function settleInfraction(draft: Draft, infraction: Infraction): void {
  if (draft.config.uncaughtErrorsStand) {
    note(
      draft,
      'gotAway',
      'log.gotAway',
      { name: draft.players[infraction.offender]!.name },
      true,
    );
    return;
  }
  if (infraction.kind === 'outOfSequence' && infraction.revert) {
    const pile = draft.centre[infraction.revert.centreIndex];
    const top = pile ? topOf(pile.cards) : null;
    if (pile && top && top.id === infraction.revert.card.id) {
      pile.cards.pop();
      draft.players[infraction.offender]!.hand.push(top);
      note(draft, 'gotAway', 'log.reverted', { detail: infraction.detail }, true);
    }
  }
}

function clearCompletedRuns(draft: Draft): void {
  draft.centre.forEach((pile, index) => {
    if (!isCompleteRun(pile, draft.config)) return;
    draft.completed.push(...pile.cards);
    draft.centre[index] = { cards: [] };
    note(draft, 'pankouk', 'log.pankouk', { pile: index });
  });
}

function refillIfNeeded(draft: Draft, player: Draft['players'][number]): void {
  if (player.hand.length > 0) return;
  player.hand.push(...drawCards(draft, draft.config.handSize));
}

function refillForTurn(draft: Draft, player: Draft['players'][number]): void {
  if (draft.config.refill === 'whenEmpty') {
    refillIfNeeded(draft, player);
    return;
  }
  const missing = draft.config.handSize - player.hand.length;
  if (missing > 0) player.hand.push(...drawCards(draft, missing));
}

/**
 * Draws up to `count`. When the supply runs dry it refills, first from
 * completed runs and then — if enabled — from cards buried in open piles.
 */
function drawCards(draft: Draft, count: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (draft.voorraad.length === 0 && !replenish(draft)) break;
    const card = draft.voorraad.pop();
    if (!card) break;
    drawn.push(card);
  }
  return drawn;
}

/** Refills an empty supply. Returns false when there is genuinely nothing left. */
function replenish(draft: Draft): boolean {
  if (draft.completed.length > 0) {
    const { items, rng } = shuffle(draft.completed, draft.rng);
    draft.voorraad = items;
    draft.completed = [];
    draft.rng = rng;
    note(draft, 'recycle', 'log.reshuffled');
    return true;
  }

  if (!draft.config.recycleBuriedCards) return false;

  // Everything below a visible top card is unreachable by anyone. Rather than
  // let the game grind to a draw, put those cards back into circulation.
  const buried: Card[] = [];
  for (const player of draft.players) {
    player.openPiles.forEach((pile, index) => {
      if (pile.length <= 1) return;
      buried.push(...pile.slice(0, -1));
      player.openPiles[index] = [pile[pile.length - 1] as Card];
    });
  }
  if (buried.length === 0) return false;

  const { items, rng } = shuffle(buried, draft.rng);
  draft.voorraad = items;
  draft.rng = rng;
  note(draft, 'recycle', 'log.recycled', { count: buried.length });
  return true;
}

function advanceTurn(draft: Draft): void {
  draft.currentPlayer = (draft.currentPlayer + 1) % draft.players.length;
  draft.turnStartedAt = draft.now;
  refillForTurn(draft, draft.players[draft.currentPlayer]!);
}

/**
 * Ends the game if nobody has managed a centre play for a long time. See
 * `idleTurnsBeforeStalemate` — this is what stops a dead position spinning
 * forever.
 */
function checkStalemate(draft: Draft): boolean {
  if (draft.idleTurns < draft.config.idleTurnsBeforeStalemate) return false;
  draft.phase = 'stalemate';
  note(draft, 'draw', 'log.drawIdle', { count: draft.idleTurns });
  return true;
}

function checkWin(draft: Draft, playerId: number): void {
  const player = draft.players[playerId];
  if (!player || draft.phase !== 'playing') return;

  const won =
    draft.config.winCondition === 'flensstok'
      ? player.flensstok.length === 0
      : player.flensstok.length === 0 &&
        player.hand.length === 0 &&
        player.openPiles.every((pile) => pile.length === 0);

  if (!won) return;
  draft.phase = 'finished';
  draft.winner = playerId;
  note(draft, 'win', 'log.win', { name: player.name });
}

function largestOpenPile(piles: readonly Card[][]): number | null {
  let best: number | null = null;
  piles.forEach((pile, index) => {
    if (pile.length === 0) return;
    if (best === null || pile.length > piles[best]!.length) best = index;
  });
  return best;
}

