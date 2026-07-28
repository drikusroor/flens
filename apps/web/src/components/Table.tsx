import { useState, type ReactNode } from 'react';
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
  const { view, seat } = game;

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
    if (pile && pile.count > 0) setSelected({ kind: 'openPile', index });
  };

  return (
    <div className="table">
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
          {controls}
        </div>
      </header>

      <FlensBanner game={game} />
      <Opponents view={view} seat={seat} />
      <Centre view={view} armed={selected !== null && game.isYourTurn} onPick={onCentreClick} />

      <YourArea
        view={view}
        seat={seat}
        selected={selected}
        isYourTurn={game.isYourTurn}
        onSelect={setSelected}
        onPileClick={onOwnPileClick}
        onPass={game.pass}
      />

      {game.lastError && <p className="rejection">{game.lastError}</p>}
      {result}

      <Log entries={view.log} />
    </div>
  );
}
