import type { LogEntry } from '@flens/engine';

export function Log({ entries }: { entries: readonly LogEntry[] }) {
  const recent = entries.slice(-14).reverse();

  return (
    <section className="log">
      <h2 className="section-title">Table talk</h2>
      <ul>
        {recent.map((entry, index) => (
          <li
            key={`${entry.at}-${index}`}
            className={
              entry.message.includes('FLENS')
                ? 'log__flens'
                : entry.message.includes('infraction')
                  ? 'log__infraction'
                  : undefined
            }
          >
            {entry.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
