import type { GameView } from '@flens/engine';
import type { PlaySource } from './useFlensGame';

/**
 * What the table needs in order to render, regardless of whether the game is
 * running in this tab or on a server. Keeping both sources behind one shape is
 * what stops the online and offline UIs drifting apart.
 */
export interface TableController {
  readonly view: GameView;
  /** Which seat *you* are. Not always 0 online. */
  readonly seat: number;
  readonly isYourTurn: boolean;
  readonly turnRemainingMs: number | null;
  /** True only when hints are on; nothing announces a mistake otherwise. */
  readonly infractionVisible: boolean;
  readonly hints: boolean;
  readonly flensTarget: string | null;
  readonly lastError: string | null;

  readonly play: (from: PlaySource, centreIndex: number) => void;
  readonly discard: (handIndex: number, openPileIndex: number) => void;
  readonly callFlens: () => void;
  readonly pass: () => void;
}
