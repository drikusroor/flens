import { useT } from '../i18n/locale';
import type { TableController } from '../game/controller';

/**
 * The FLENS! button is *always* live.
 *
 * That is the point: nothing tells you a mistake happened. You watch the table,
 * you decide, and a wrong call costs you two cards. With hints on the countdown
 * appears — handy for learning, but it turns the game into "press when the bar
 * shows up", which is not the game.
 */
export function FlensBanner({ game, onCall }: { game: TableController; onCall: () => void }) {
  const { t, locale } = useT();
  const { view, hints, infractionVisible, flensTarget } = game;
  const live = hints && infractionVisible;
  const pct = live
    ? Math.max(0, Math.min(100, (view.flensWindowRemainingMs / view.config.flensWindowMs) * 100))
    : 0;

  return (
    <div className={`flens ${live ? 'flens--live' : 'flens--idle'}`} data-zone="flens">
      <button
        type="button"
        className={`btn btn--flens ${live ? 'btn--armed' : ''}`}
        onClick={onCall}
        disabled={view.phase !== 'playing'}
      >
        {t('flens.call')}
      </button>

      {live ? (
        <>
          <div className="flens__meter">
            <div className="flens__bar" style={{ width: `${pct}%` }} />
          </div>
          <span className="flens__count">
            {t('flens.slipped', {
              name: flensTarget ?? '',
              // Dutch and Spanish want a comma where English wants a point.
              seconds: new Intl.NumberFormat(locale, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }).format(view.flensWindowRemainingMs / 1000),
            })}
          </span>
        </>
      ) : (
        <span className="flens__hint">{t('flens.hint')}</span>
      )}
    </div>
  );
}
