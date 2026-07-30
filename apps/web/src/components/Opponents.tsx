import type { GameView } from '@flens/engine';
import { useT } from '../i18n/locale';
import { Card, CardBack } from './Card';

export function Opponents({ view, seat }: { view: GameView; seat: number }) {
  const { t } = useT();
  const others = view.players.filter((p) => p.id !== seat);

  return (
    <section className="opponents" data-zone="opponents">
      {others.map((player) => (
        <div
          key={player.id}
          className={`seat ${view.currentPlayer === player.id ? 'seat--active' : ''}`}
        >
          <div className="seat__name">
            {player.name}
            <span className="seat__stok">
              {t('seat.flensstok', { count: player.flensstokCount })}
            </span>
          </div>
          <div className="seat__cards">
            <Card
              card={player.flensstokTop}
              depth={player.flensstokCount}
              label={t('card.stok')}
            />
            <CardBack count={player.handCount} label={t('card.hand')} />
            <div className="seat__piles">
              {player.openPiles.map((pile, index) => (
                <Card key={index} card={pile.top} depth={pile.count} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
