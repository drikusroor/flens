import type { LogEntry } from '@flens/engine';
import { useT } from '../i18n/locale';

/**
 * Styling keys off `kind` rather than off the words, which is the only way it
 * can work once the same entry renders in three languages.
 */
const CLASSES: Partial<Record<LogEntry['kind'], string>> = {
  flens: 'log__flens',
  falseCall: 'log__flens',
  infraction: 'log__infraction',
};

export function Log({ entries }: { entries: readonly LogEntry[] }) {
  const { t, say } = useT();
  const recent = entries.slice(-14).reverse();

  return (
    <section className="log">
      <h2 className="section-title">{t('log.title')}</h2>
      <ul>
        {recent.map((entry, index) => (
          <li key={`${entry.at}-${index}`} className={CLASSES[entry.kind]}>
            {say(entry.text)}
          </li>
        ))}
      </ul>
    </section>
  );
}
