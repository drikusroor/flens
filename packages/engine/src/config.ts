import type { FlensConfig } from './types.js';

/**
 * Defaults per `docs/spec-draft.md`.
 *
 * `topValue` is 16 following Perry's Spel van 16 and the user's recollection;
 * the "Pang" write-ups say 15. Flip it here if 15 turns out to be right.
 */
export const DEFAULT_CONFIG: FlensConfig = {
  topValue: 16,
  seriesCount: 8,
  flensstokSize: 10,
  handSize: 5,
  refill: 'whenEmpty',
  openPileCount: 4,
  centrePileCount: 4,

  centrePriority: true,
  flensstokPriority: true,

  winCondition: 'flensstok',

  flensWindowMs: 6_000,
  turnTimeoutMs: 45_000,
  falseCallPenalty: 2,
  recycleBuriedCards: true,
  idleTurnsBeforeStalemate: 50,

  uncaughtErrorsStand: true,
};

export function makeConfig(overrides: Partial<FlensConfig> = {}): FlensConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** Throws if a config cannot produce a dealable game. */
export function validateConfig(config: FlensConfig, playerCount: number): void {
  if (config.topValue < 2) throw new Error('topValue must be at least 2');
  if (config.seriesCount < 1) throw new Error('seriesCount must be at least 1');
  if (config.openPileCount < 1) throw new Error('openPileCount must be at least 1');
  if (config.centrePileCount < 1) throw new Error('centrePileCount must be at least 1');
  if (playerCount < 1) throw new Error('need at least one player');

  const deckSize = config.topValue * config.seriesCount;
  const dealt = playerCount * (config.flensstokSize + config.handSize);
  if (dealt > deckSize) {
    throw new Error(
      `cannot deal ${dealt} cards to ${playerCount} players from a ${deckSize}-card deck`,
    );
  }
}
