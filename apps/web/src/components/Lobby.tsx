import { useState } from 'react';
import type { Message } from '@flens/i18n';
import type { BotDifficulty, ErrorReason } from '@flens/protocol';
import { LanguagePicker, T, useT } from '../i18n/locale';
import type { OnlineGame } from '../net/useOnlineGame';

/** Bot difficulties, as keys — the wire values are not words. */
const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'normal', 'hard'];
const difficultyKey = (difficulty: BotDifficulty) => `difficulty.${difficulty}` as const;

export function Lobby({ game, onBack }: { game: OnlineGame; onBack: () => void }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [topValue, setTopValue] = useState(16);

  if (game.status === 'connecting') {
    return <Shell title={t('lobby.connecting')} onBack={onBack} error={game.error} />;
  }

  if (game.status === 'closed') {
    return (
      <Shell title={t('lobby.disconnected')} onBack={onBack} error={game.error}>
        <p className="setup__blurb">
          <T k="lobby.disconnected.body" />
        </p>
      </Shell>
    );
  }

  // In a room, waiting to start.
  if (game.lobby) {
    const isHost = game.seat === game.lobby.hostSeat;
    const canStart = isHost && game.lobby.seats.length >= 2;

    return (
      <Shell
        title={t('lobby.room', { code: game.lobby.code })}
        onBack={game.leave}
        backLabel={t('lobby.leave')}
        error={game.error}
      >
        <p className="setup__blurb">
          <T k="lobby.share" params={{ code: game.lobby.code }} />
        </p>

        <ul className="lobby__seats">
          {game.lobby.seats.map((s) => (
            <li key={s.seat} className="lobby__seat">
              <span>
                {s.name}
                {s.seat === game.seat && <em> {t('lobby.you')}</em>}
                {s.seat === game.lobby!.hostSeat && <em> · {t('lobby.host')}</em>}
              </span>
              <span className="lobby__tag">
                {s.kind === 'bot'
                  ? t('lobby.botTag', { difficulty: t(difficultyKey(s.difficulty ?? 'normal')) })
                  : s.connected
                    ? t('lobby.ready')
                    : t('lobby.away')}
              </span>
              {isHost && s.kind === 'bot' && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => game.removeSeat(s.seat)}
                >
                  {t('lobby.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && (
          <>
            <div className="lobby__bots">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => game.addBot(d)}
                >
                  {t('lobby.addBot', { difficulty: t(difficultyKey(d)) })}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={game.start}
              disabled={!canStart}
            >
              {canStart ? t('lobby.start') : t('lobby.needTwo')}
            </button>
          </>
        )}
        {!isHost && <p className="setup__blurb">{t('lobby.waitingHost')}</p>}
      </Shell>
    );
  }

  // Not in a room yet.
  return (
    <Shell title={t('lobby.title')} onBack={onBack} error={game.error}>
      <LanguagePicker />

      <label className="setup__field">
        {t('lobby.yourName')}
        <input
          value={name}
          maxLength={16}
          placeholder="Drikus"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="setup__field">
        {t('lobby.buildUpTo')}
        <select value={topValue} onChange={(e) => setTopValue(Number(e.target.value))}>
          <option value={16}>16</option>
          <option value={15}>15</option>
        </select>
      </label>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() => game.create(name || t('lobby.hostName'), topValue)}
      >
        {t('lobby.create')}
      </button>

      <div className="lobby__divider">{t('lobby.or')}</div>

      <label className="setup__field">
        {t('lobby.roomCode')}
        <input
          value={code}
          maxLength={4}
          placeholder="ABCD"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </label>
      <button
        type="button"
        className="btn"
        onClick={() => game.join(code, name || t('lobby.playerName'))}
        disabled={code.length !== 4}
      >
        {t('lobby.join')}
      </button>
    </Shell>
  );
}

function Shell({
  title,
  children,
  onBack,
  backLabel,
  error,
}: {
  title: string;
  children?: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
  error: Message<ErrorReason> | null;
}) {
  const { t, say } = useT();

  return (
    <div className="setup">
      <h1>{title}</h1>
      {error && <p className="rejection">{say(error)}</p>}
      {children}
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        {backLabel ?? t('lobby.back')}
      </button>
    </div>
  );
}
