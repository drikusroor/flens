import { useEffect, useRef } from 'react';
import type { BotDifficulty } from '@flens/protocol';
import type { TableController } from '../game/controller';
import type { DiscordSession } from '../discord/useDiscord';
import { useT } from '../i18n/locale';
import type { OnlineGame } from '../net/useOnlineGame';
import { Table } from './Table';

/**
 * Inside Discord there is no menu and no room code: everyone who launched the
 * Activity together is put at one table automatically, under their Discord name.
 */
export function DiscordTable({
  discord,
  online,
}: {
  discord: DiscordSession;
  online: OnlineGame;
}) {
  const { t, say } = useT();
  const joinedRef = useRef(false);

  useEffect(() => {
    if (joinedRef.current) return;
    if (discord.status !== 'ready' || !discord.instanceId) return;
    if (online.status !== 'open') return;
    // A resume may already have reclaimed a seat from a previous frame.
    if (online.seat !== null) return;

    joinedRef.current = true;
    online.joinInstance(discord.instanceId, discord.displayName ?? t('lobby.playerName'));
  }, [discord.status, discord.instanceId, discord.displayName, online, t]);

  if (discord.status === 'error') {
    return (
      <div className="setup">
        <h1>{t('app.name')}</h1>
        <p className="rejection">{discord.error}</p>
        <p className="setup__blurb">{t('discord.signInFailed')}</p>
      </div>
    );
  }

  if (discord.status !== 'ready' || !online.lobby) {
    return (
      <div className="setup">
        <h1>{t('app.name')}</h1>
        <p className="setup__blurb">{t('discord.connecting')}</p>
      </div>
    );
  }

  if (!online.lobby.started || !online.view) {
    const isHost = online.seat === online.lobby.hostSeat;
    const canStart = isHost && online.lobby.seats.length >= 2;

    return (
      <div className="setup">
        <h1>{t('app.name')}</h1>
        <p className="setup__blurb">{t('discord.sameTable')}</p>

        <ul className="lobby__seats">
          {online.lobby.seats.map((s) => (
            <li key={s.seat} className="lobby__seat">
              <span>
                {s.name}
                {s.seat === online.seat && <em> {t('lobby.you')}</em>}
              </span>
              <span className="lobby__tag">
                {s.kind === 'bot'
                  ? t('lobby.botTag', { difficulty: t(`difficulty.${s.difficulty ?? 'normal'}`) })
                  : s.connected
                    ? t('lobby.ready')
                    : t('lobby.away')}
              </span>
            </li>
          ))}
        </ul>

        {isHost ? (
          <>
            <div className="lobby__bots">
              {(['easy', 'normal', 'hard'] as BotDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => online.addBot(d)}
                >
                  {t('lobby.addBot', { difficulty: t(`difficulty.${d}`) })}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={online.start}
              disabled={!canStart}
            >
              {canStart ? t('lobby.start') : t('lobby.needTwo')}
            </button>
          </>
        ) : (
          <p className="setup__blurb">{t('lobby.waitingHost')}</p>
        )}

        {online.error && <p className="rejection">{say(online.error)}</p>}
      </div>
    );
  }

  const controller: TableController = {
    view: online.view,
    seat: online.seat ?? 0,
    isYourTurn: online.isYourTurn,
    turnRemainingMs: online.turnRemainingMs,
    infractionVisible: false,
    hints: false,
    flensTarget: null,
    lastError: online.error,
    play: online.play,
    discard: online.discard,
    callFlens: online.callFlens,
    pass: online.pass,
  };

  return <Table game={controller} result={<DiscordResult game={controller} />} />;
}

function DiscordResult({ game }: { game: TableController }) {
  const { t } = useT();
  const { view } = game;
  if (view.phase === 'playing') return null;

  return (
    <div className="result">
      <h2>
        {view.phase === 'stalemate'
          ? t('result.draw')
          : view.winner === game.seat
            ? t('result.youWin')
            : t('result.wins', { name: view.players[view.winner ?? 0]?.name ?? '' })}
      </h2>
    </div>
  );
}
