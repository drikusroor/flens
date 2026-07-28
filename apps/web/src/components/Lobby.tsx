import { useState } from 'react';
import type { BotDifficulty } from '@flens/protocol';
import type { OnlineGame } from '../net/useOnlineGame';

export function Lobby({ game, onBack }: { game: OnlineGame; onBack: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [topValue, setTopValue] = useState(16);

  if (game.status === 'connecting') {
    return <Shell title="Connecting…" onBack={onBack} error={game.error} />;
  }

  if (game.status === 'closed') {
    return (
      <Shell title="Disconnected" onBack={onBack} error={game.error}>
        <p className="setup__blurb">
          Lost the connection to the server. Is it running? Try{' '}
          <code>npm run dev --workspace @flens/server</code>, then reload.
        </p>
      </Shell>
    );
  }

  // In a room, waiting to start.
  if (game.lobby) {
    const isHost = game.seat === game.lobby.hostSeat;
    const canStart = isHost && game.lobby.seats.length >= 2;

    return (
      <Shell title={`Room ${game.lobby.code}`} onBack={game.leave} backLabel="Leave" error={game.error}>
        <p className="setup__blurb">
          Share the code <strong>{game.lobby.code}</strong> with whoever is playing.
        </p>

        <ul className="lobby__seats">
          {game.lobby.seats.map((s) => (
            <li key={s.seat} className="lobby__seat">
              <span>
                {s.name}
                {s.seat === game.seat && <em> (you)</em>}
                {s.seat === game.lobby!.hostSeat && <em> · host</em>}
              </span>
              <span className="lobby__tag">
                {s.kind === 'bot' ? `bot · ${s.difficulty}` : s.connected ? 'ready' : 'away'}
              </span>
              {isHost && s.kind === 'bot' && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => game.removeSeat(s.seat)}
                >
                  remove
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && (
          <>
            <div className="lobby__bots">
              {(['easy', 'normal', 'hard'] as BotDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => game.addBot(d)}
                >
                  + {d} bot
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={game.start}
              disabled={!canStart}
            >
              {canStart ? 'Start the game' : 'Need at least two players'}
            </button>
          </>
        )}
        {!isHost && <p className="setup__blurb">Waiting for the host to start…</p>}
      </Shell>
    );
  }

  // Not in a room yet.
  return (
    <Shell title="Play online" onBack={onBack} error={game.error}>
      <label className="setup__field">
        Your name
        <input
          value={name}
          maxLength={16}
          placeholder="Drikus"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="setup__field">
        Build up to
        <select value={topValue} onChange={(e) => setTopValue(Number(e.target.value))}>
          <option value={16}>16</option>
          <option value={15}>15</option>
        </select>
      </label>

      <button
        type="button"
        className="btn btn--primary"
        onClick={() => game.create(name || 'Host', topValue)}
      >
        Create a room
      </button>

      <div className="lobby__divider">or</div>

      <label className="setup__field">
        Room code
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
        onClick={() => game.join(code, name || 'Player')}
        disabled={code.length !== 4}
      >
        Join
      </button>
    </Shell>
  );
}

function Shell({
  title,
  children,
  onBack,
  backLabel = 'Back',
  error,
}: {
  title: string;
  children?: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
  error: string | null;
}) {
  return (
    <div className="setup">
      <h1>{title}</h1>
      {error && <p className="rejection">{error}</p>}
      {children}
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        {backLabel}
      </button>
    </div>
  );
}
