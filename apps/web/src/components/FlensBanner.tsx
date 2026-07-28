import type { TableController } from '../game/controller';

/**
 * The FLENS! button is *always* live.
 *
 * That is the point: nothing tells you a mistake happened. You watch the table,
 * you decide, and a wrong call costs you two cards. With hints on the countdown
 * appears — handy for learning, but it turns the game into "press when the bar
 * shows up", which is not the game.
 */
export function FlensBanner({ game }: { game: TableController }) {
  const { view, hints, infractionVisible, flensTarget } = game;
  const live = hints && infractionVisible;
  const pct = live
    ? Math.max(0, Math.min(100, (view.flensWindowRemainingMs / view.config.flensWindowMs) * 100))
    : 0;

  return (
    <div className={`flens ${live ? 'flens--live' : 'flens--idle'}`}>
      <button
        type="button"
        className={`btn btn--flens ${live ? 'btn--armed' : ''}`}
        onClick={game.callFlens}
        disabled={view.phase !== 'playing'}
      >
        FLENS!
      </button>

      {live ? (
        <>
          <div className="flens__meter">
            <div className="flens__bar" style={{ width: `${pct}%` }} />
          </div>
          <span className="flens__count">
            {flensTarget} slipped up &middot; {(view.flensWindowRemainingMs / 1000).toFixed(1)}s
          </span>
        </>
      ) : (
        <span className="flens__hint">
          Call it when someone plays out of sequence, or ends a turn with a play still
          available. Wrong call: two cards onto your own flensstok.
        </span>
      )}
    </div>
  );
}
