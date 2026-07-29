import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { LogKind } from '@flens/engine';
import { useCardFlip } from '../animation/useCardFlip';
import { isMuted, playSound, setMuted, unlockAudio } from '../audio/sfx';
import { primeVoices, shoutFlens } from '../audio/speech';
import { useTableAudio } from '../audio/useTableAudio';
import type { TableController } from '../game/controller';
import type { PlaySource } from '../game/useFlensGame';
import { Centre } from './Centre';
import { FlensBanner } from './FlensBanner';
import { Log } from './Log';
import { Opponents } from './Opponents';
import { YourArea } from './YourArea';

interface TableProps {
  game: TableController;
  /** Buttons that differ between local and online play. */
  controls?: ReactNode;
  result?: ReactNode;
}

export function Table({ game, controls, result }: TableProps) {
  const [selected, setSelected] = useState<PlaySource | null>(null);
  const [muted, setMutedState] = useState(isMuted);
  const { view, seat } = game;

  // A brief jolt on the big moments, so they land even if you looked away.
  const [jolt, setJolt] = useState<'flens' | 'pankouk' | null>(null);
  const onEvent = useCallback((kind: LogKind) => {
    // Someone else called it — react to the log.
    if (kind === 'flens') {
      setJolt('flens');
      shoutFlens(isMuted());
    } else if (kind === 'pankouk') {
      setJolt('pankouk');
    }
  }, []);

  /**
   * Your own call reacts to the press, not to the outcome: you shouted whether
   * or not you turn out to be right, and waiting for the server to answer would
   * make the most urgent button in the game feel laggy. `shoutFlens` dedupes, so
   * the log entry this produces does not shout a second time.
   */
  const handleFlensCall = useCallback(() => {
    shoutFlens(isMuted());
    playSound('flens');
    setJolt('flens');
    game.callFlens();
  }, [game]);

  // Only re-measure when the table actually changed; see useCardFlip.
  useCardFlip(
    `${view.log.length}:${view.phase}:${view.currentPlayer}:${view.voorraadCount}:${seat}`,
  );
  useTableAudio(view, seat, onEvent);

  useEffect(() => {
    if (!jolt) return;
    const id = window.setTimeout(() => setJolt(null), 700);
    return () => window.clearTimeout(id);
  }, [jolt]);

  // Browsers hold audio until a gesture, and speech voices load late; getting
  // both ready at the table means the first sound is not the one that is missed.
  useEffect(() => {
    unlockAudio();
    primeVoices();
  }, []);

  // A rejected action should be audible — it is easy to miss the red text.
  const lastError = useRef<string | null>(null);
  useEffect(() => {
    if (game.lastError && game.lastError !== lastError.current) playSound('error');
    lastError.current = game.lastError;
  }, [game.lastError]);

  const select = (source: PlaySource | null) => {
    if (source) playSound('pickup');
    setSelected(source);
  };

  const onCentreClick = (index: number) => {
    if (!selected || !game.isYourTurn) return;
    game.play(selected, index);
    setSelected(null);
  };

  const onOwnPileClick = (index: number) => {
    if (!game.isYourTurn) return;
    // A hand card dropped on your own pile is a discard, which ends your turn.
    // Otherwise you meant to pick that pile up and play from it.
    if (selected?.kind === 'hand') {
      game.discard(selected.index, index);
      setSelected(null);
      return;
    }
    const pile = view.players[seat]?.openPiles[index];
    if (pile && pile.count > 0) select({ kind: 'openPile', index });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playSound('pickup');
  };

  return (
    <div className={`table ${jolt ? `table--${jolt}` : ''}`}>
      <header className="table__header">
        <h1>Flens</h1>
        <div className="table__meta">
          <span>
            Building 1&ndash;{view.config.topValue} &middot; {view.voorraadCount} in the supply
          </span>
          {game.turnRemainingMs !== null && view.phase === 'playing' && (
            <span className={game.turnRemainingMs < 10_000 ? 'clock clock--low' : 'clock'}>
              {Math.ceil(game.turnRemainingMs / 1000)}s
            </span>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Sound off' : 'Sound on'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {controls}
        </div>
      </header>

      <FlensBanner game={game} onCall={handleFlensCall} />
      <Opponents view={view} seat={seat} />
      <Centre view={view} armed={selected !== null && game.isYourTurn} onPick={onCentreClick} />

      <YourArea
        view={view}
        seat={seat}
        selected={selected}
        isYourTurn={game.isYourTurn}
        onSelect={select}
        onPileClick={onOwnPileClick}
        onPass={game.pass}
      />

      {game.lastError && <p className="rejection">{game.lastError}</p>}
      {result}

      <Log entries={view.log} />
    </div>
  );
}
