import { makeConfig, validateConfig } from './config.js';
import { shuffle } from './rng.js';
import type { Card, FlensConfig, GameState, PlayerState } from './types.js';

export function buildDeck(config: FlensConfig): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (let series = 0; series < config.seriesCount; series++) {
    for (let value = 1; value <= config.topValue; value++) {
      cards.push({ id: id++, value });
    }
  }
  return cards;
}

export interface NewGameOptions {
  readonly playerNames: readonly string[];
  readonly seed?: number;
  readonly config?: Partial<FlensConfig>;
}

/**
 * Only the top card of a flensstok is reachable, so a deal that buries every
 * single `1` below a flensstok top is unplayable: no centre pile can ever be
 * started and the game is dead on arrival. Rare, but it happens — roughly one
 * six-player deal in three hundred. Cheaper to reject the deal than to play it.
 */
function hasReachableOne(deck: readonly Card[], config: FlensConfig, playerCount: number): boolean {
  const stok = config.flensstokSize;
  for (let p = 0; p < playerCount; p++) {
    const start = p * (stok + config.handSize);
    // The dealt flensstok is deck[start .. start+stok); its last card is the
    // exposed top. Everything before it is buried and unreachable.
    const top = deck[start + stok - 1];
    if (top?.value === 1) return true;
  }
  // Hands and the remaining supply are all reachable in the normal run of play.
  const buried = new Set<number>();
  for (let p = 0; p < playerCount; p++) {
    const start = p * (stok + config.handSize);
    for (let i = start; i < start + stok - 1; i++) buried.add(i);
  }
  return deck.some((card, index) => card.value === 1 && !buried.has(index));
}

export function newGame({ playerNames, seed = 1, config: overrides }: NewGameOptions): GameState {
  const config = makeConfig(overrides);
  validateConfig(config, playerNames.length);

  let { items: deck, rng } = shuffle(buildDeck(config), seed);
  for (let attempt = 0; attempt < 50; attempt++) {
    if (hasReachableOne(deck, config, playerNames.length)) break;
    ({ items: deck, rng } = shuffle(deck, rng));
  }

  let cursor = 0;
  const take = (n: number): Card[] => deck.slice(cursor, (cursor += n));

  const players: PlayerState[] = playerNames.map((name, id) => ({
    id,
    name,
    flensstok: take(config.flensstokSize),
    hand: take(config.handSize),
    openPiles: Array.from({ length: config.openPileCount }, () => [] as Card[]),
  }));

  return {
    config,
    rng,
    now: 0,
    players,
    centre: Array.from({ length: config.centrePileCount }, () => ({ cards: [] })),
    voorraad: deck.slice(cursor),
    completed: [],
    currentPlayer: 0,
    phase: 'playing',
    winner: null,
    consecutivePasses: 0,
    idleTurns: 0,
    turnStartedAt: 0,
    pendingInfraction: null,
    log: [{ at: 0, message: `Game started with ${playerNames.length} players`, kind: 'start' }],
  };
}
