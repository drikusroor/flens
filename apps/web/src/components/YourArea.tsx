import type { GameView } from '@flens/engine';
import { HUMAN_SEAT, type PlaySource } from '../game/useFlensGame';
import { Card } from './Card';

interface YourAreaProps {
  view: GameView;
  selected: PlaySource | null;
  isYourTurn: boolean;
  onSelect: (source: PlaySource | null) => void;
  onPileClick: (index: number) => void;
  onPass: () => void;
}

export function YourArea({
  view,
  selected,
  isYourTurn,
  onSelect,
  onPileClick,
  onPass,
}: YourAreaProps) {
  const you = view.players[HUMAN_SEAT];
  if (!you) return null;

  const isSelected = (source: PlaySource) =>
    selected?.kind === source.kind &&
    (source.kind === 'flensstok' ||
      (selected as { index?: number }).index === (source as { index: number }).index);

  return (
    <section className={`you ${isYourTurn ? 'you--active' : ''}`}>
      <h2 className="section-title">
        You
        <span className="you__turn">{isYourTurn ? 'your turn' : 'waiting…'}</span>
      </h2>

      <div className="you__row">
        <div className="you__group">
          <span className="you__label">Flensstok ({you.flensstokCount})</span>
          <Card
            card={you.flensstokTop}
            depth={you.flensstokCount}
            selected={isSelected({ kind: 'flensstok' })}
            playable={isYourTurn && you.flensstokCount > 0}
            onClick={
              isYourTurn && you.flensstokCount > 0
                ? () => onSelect(isSelected({ kind: 'flensstok' }) ? null : { kind: 'flensstok' })
                : undefined
            }
          />
        </div>

        <div className="you__group">
          <span className="you__label">Open piles — click one to discard</span>
          <div className="you__piles">
            {you.openPiles.map((pile, index) => (
              <Card
                key={index}
                card={pile.top}
                depth={pile.count}
                selected={isSelected({ kind: 'openPile', index })}
                playable={isYourTurn}
                onClick={isYourTurn ? () => onPileClick(index) : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="you__group">
        <span className="you__label">Hand</span>
        <div className="you__hand">
          {(you.hand ?? []).map((card, index) => (
            <Card
              key={card.id}
              card={card}
              selected={isSelected({ kind: 'hand', index })}
              playable={isYourTurn}
              onClick={
                isYourTurn
                  ? () => onSelect(isSelected({ kind: 'hand', index }) ? null : { kind: 'hand', index })
                  : undefined
              }
            />
          ))}
          {(you.hand ?? []).length === 0 && (
            <button type="button" className="btn btn--ghost" onClick={onPass} disabled={!isYourTurn}>
              Nothing to play — pass
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
