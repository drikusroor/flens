import { useState } from 'react';
import type { Difficulty } from '@flens/bot';
import { HUMAN_SEAT, useFlensGame, type PlaySource } from './game/useFlensGame';
import { Centre } from './components/Centre';
import { FlensBanner } from './components/FlensBanner';
import { Opponents } from './components/Opponents';
import { YourArea } from './components/YourArea';
import { Log } from './components/Log';
import { Setup, type SetupChoices } from './components/Setup';

export function App() {
  const [choices, setChoices] = useState<SetupChoices | null>(null);

  if (!choices) return <Setup onStart={setChoices} />;
  return <Table choices={choices} onQuit={() => setChoices(null)} />;
}

function Table({ choices, onQuit }: { choices: SetupChoices; onQuit: () => void }) {
  const game = useFlensGame({
    opponents: choices.opponents,
    difficulty: choices.difficulty as Difficulty,
    topValue: choices.topValue,
    seed: choices.seed,
    hints: choices.hints,
  });

  const [selected, setSelected] = useState<PlaySource | null>(null);
  const { view } = game;

  const onCentreClick = (index: number) => {
    if (!selected || !game.isYourTurn) return;
    game.play(selected, index);
    setSelected(null);
  };

  const onOwnPileClick = (index: number) => {
    if (!game.isYourTurn) return;
    // A selected hand card dropped on your own pile is a discard, which ends
    // your turn. Anything else means you meant to pick that pile up.
    if (selected?.kind === 'hand') {
      game.discard(selected.index, index);
      setSelected(null);
      return;
    }
    const pile = view.players[HUMAN_SEAT]?.openPiles[index];
    if (pile && pile.count > 0) setSelected({ kind: 'openPile', index });
  };

  const finished = view.phase !== 'playing';

  return (
    <div className="table">
      <header className="table__header">
        <h1>Flens</h1>
        <div className="table__meta">
          <span>
            Building 1&ndash;{view.config.topValue} &middot; {view.voorraadCount} in the supply
          </span>
          {view.turnRemainingMs !== null && view.phase === 'playing' && (
            <span className={view.turnRemainingMs < 10_000 ? 'clock clock--low' : 'clock'}>
              {Math.ceil(view.turnRemainingMs / 1000)}s
            </span>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => game.restart()}>
            New deal
          </button>
          <button type="button" className="btn btn--ghost" onClick={onQuit}>
            Change setup
          </button>
        </div>
      </header>

      <FlensBanner game={game} />

      <Opponents view={view} />

      <Centre
        view={view}
        armed={selected !== null && game.isYourTurn}
        onPick={onCentreClick}
      />

      <YourArea
        view={view}
        selected={selected}
        isYourTurn={game.isYourTurn}
        onSelect={setSelected}
        onPileClick={onOwnPileClick}
        onPass={game.pass}
      />

      {game.lastRejection && <p className="rejection">{game.lastRejection}</p>}

      {finished && (
        <div className="result">
          <h2>
            {view.phase === 'stalemate'
              ? 'Draw — nobody could move'
              : view.winner === HUMAN_SEAT
                ? 'You win!'
                : `${view.players[view.winner ?? 0]?.name} wins`}
          </h2>
          <button type="button" className="btn" onClick={() => game.restart()}>
            Play again
          </button>
        </div>
      )}

      <Log entries={view.log} />
    </div>
  );
}
