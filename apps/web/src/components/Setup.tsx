import { useState } from 'react';
import type { Difficulty } from '@flens/bot';
import { LanguagePicker, T, useT } from '../i18n/locale';

export interface SetupChoices {
  opponents: number;
  difficulty: Difficulty;
  topValue: number;
  hints: boolean;
  seed: number;
}

interface SetupProps {
  onStart: (choices: SetupChoices) => void;
  onLearn: () => void;
  /** Omitted in offline-only builds, where there is no server to reach. */
  onOnline?: (() => void) | undefined;
}

export function Setup({ onStart, onLearn, onOnline }: SetupProps) {
  const { t } = useT();
  const [opponents, setOpponents] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [topValue, setTopValue] = useState(16);
  const [hints, setHints] = useState(false);

  return (
    <div className="setup">
      <h1>{t('app.name')}</h1>
      <p className="setup__blurb">
        <T k="setup.blurb.origin" /> <T k="setup.blurb.goal" params={{ top: topValue }} />{' '}
        <T k="setup.blurb.warning" />
      </p>

      <LanguagePicker />

      <label className="setup__field">
        {t('setup.opponents')}
        <select value={opponents} onChange={(e) => setOpponents(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="setup__field">
        {t('setup.difficulty')}
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
          <option value="easy">{t('setup.difficulty.easy')}</option>
          <option value="normal">{t('setup.difficulty.normal')}</option>
          <option value="hard">{t('setup.difficulty.hard')}</option>
        </select>
      </label>

      <label className="setup__field">
        {t('setup.buildUpTo')}
        <select value={topValue} onChange={(e) => setTopValue(Number(e.target.value))}>
          <option value={16}>{t('setup.topValue.16')}</option>
          <option value={15}>{t('setup.topValue.15')}</option>
        </select>
      </label>

      <label className="setup__check">
        <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} />
        <span>
          {t('setup.hints')}
          <small>{t('setup.hints.help')}</small>
        </span>
      </label>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() =>
          onStart({ opponents, difficulty, topValue, hints, seed: Math.floor(Math.random() * 1e9) })
        }
      >
        {t('setup.playBots')}
      </button>

      {onOnline && (
        <button type="button" className="btn" onClick={onOnline}>
          {t('setup.playOnline')}
        </button>
      )}

      <button type="button" className="btn" onClick={onLearn}>
        {t('setup.learn')}
      </button>
    </div>
  );
}
