import type { GameView } from '@flens/engine';
import { Card } from './Card';

interface CentreProps {
  view: GameView;
  armed: boolean;
  onPick: (index: number) => void;
}

export function Centre({ view, armed, onPick }: CentreProps) {
  return (
    // `data-zone` lets the tutorial ring the part of the table it is talking
    // about without knowing anything about this component's markup.
    <section className="centre" data-zone="centre">
      <h2 className="section-title">Centre</h2>
      <div className="centre__piles">
        {view.centre.map((pile, index) => {
          const top = pile.cards.at(-1) ?? null;
          const wants = top ? top.value + 1 : 1;
          return (
            <div key={index} className="centre__pile">
              <Card
                card={top}
                depth={pile.cards.length}
                playable={armed}
                onClick={armed ? () => onPick(index) : undefined}
              />
              <span className="centre__wants">
                {wants > view.config.topValue ? 'done' : `needs ${wants}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
