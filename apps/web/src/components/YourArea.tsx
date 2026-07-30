import type { GameView } from '@flens/engine';
import type { PlaySource } from '../game/useFlensGame';
import { useT } from '../i18n/locale';
import { Card } from './Card';

interface YourAreaProps {
  view: GameView;
  seat: number;
  selected: PlaySource | null;
  isYourTurn: boolean;
  onSelect: (source: PlaySource | null) => void;
  onPileClick: (index: number) => void;
  onPass: () => void;
}

export function YourArea({
  view,
  seat,
  selected,
  isYourTurn,
  onSelect,
  onPileClick,
  onPass,
}: YourAreaProps) {
  const { t } = useT();
  const you = view.players[seat];
  if (!you) return null;

  const isSelected = (source: PlaySource) =>
    selected?.kind === source.kind &&
    (source.kind === 'flensstok' ||
      (selected as { index?: number }).index === (source as { index: number }).index);

  return (
    <section className={`you ${isYourTurn ? 'you--active' : ''}`}>
      <h2 className="section-title">
        {t('you.title')}
        <span className="you__turn">{isYourTurn ? t('you.yourTurn') : t('you.waiting')}</span>
      </h2>

      <div className="you__row">
        <div className="you__group" data-zone="flensstok">
          <span className="you__label">
            {t('you.flensstok', { count: you.flensstokCount })}
          </span>
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

        <div className="you__group" data-zone="openPiles">
          <span className="you__label">{t('you.openPiles')}</span>
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

      <div className="you__group" data-zone="hand">
        <span className="you__label">{t('you.hand')}</span>
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
              {t('you.pass')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
