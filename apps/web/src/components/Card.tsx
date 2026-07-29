import type { Card as CardType } from '@flens/engine';

interface CardProps {
  card: CardType | null;
  /** Number of cards underneath, drawn as a stack edge. */
  depth?: number | undefined;
  selected?: boolean | undefined;
  playable?: boolean | undefined;
  label?: string | undefined;
  /** Omitted or undefined renders the card inert. */
  onClick?: (() => void) | undefined;
}

export function Card({ card, depth = 0, selected, playable, label, onClick }: CardProps) {
  const classes = [
    'card',
    card ? '' : 'card--empty',
    selected ? 'card--selected' : '',
    playable ? 'card--playable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={!onClick}
      // Lets the FLIP layer follow this exact card as it moves between places.
      data-card-id={card ? String(card.id) : undefined}
    >
      <span className="card__value">{card ? card.value : ''}</span>
      {depth > 1 && <span className="card__depth">{depth}</span>}
      {label && <span className="card__label">{label}</span>}
    </button>
  );
}

/** Face-down stack, for a flensstok seen from the outside. */
export function CardBack({ count, label }: { count: number; label?: string }) {
  return (
    <div className="card card--back">
      <span className="card__value">{count}</span>
      {label && <span className="card__label">{label}</span>}
    </div>
  );
}
