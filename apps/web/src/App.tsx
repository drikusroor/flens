import { useState } from 'react';
import type { Difficulty } from '@flens/bot';
import type { TableController } from './game/controller';
import { useFlensGame } from './game/useFlensGame';
import { hasStoredSession, useOnlineGame } from './net/useOnlineGame';
import { isRunningInDiscord, useDiscord } from './discord/useDiscord';
import { DiscordTable } from './components/DiscordTable';
import { Lobby } from './components/Lobby';
import { Setup, type SetupChoices } from './components/Setup';
import { Table } from './components/Table';
import { useT } from './i18n/locale';
import { Tutorial } from './tutorial/Tutorial';

const DISCORD_CLIENT_ID = import.meta.env['VITE_DISCORD_CLIENT_ID'] as string | undefined;

/**
 * Builds with no server behind them — GitHub Pages, an itch.io zip, a file:// copy.
 * The engine and the bots run entirely in the browser, so single-player needs
 * nothing else; this flag simply hides the parts that would reach for a server
 * and fail.
 */
const OFFLINE_ONLY = ['true', '1'].includes(
  String(import.meta.env['VITE_OFFLINE_ONLY'] ?? '').toLowerCase(),
);

/**
 * Inside Discord the page is served from Discord's own origin and every request
 * is routed through `/.proxy`, so the socket must be same-origin and prefixed.
 * The exact path depends on the URL mapping configured for the application,
 * hence the override. On the open web it points at the standalone server.
 */
const DISCORD_WS_PATH = (import.meta.env['VITE_DISCORD_WS_PATH'] as string | undefined) ?? '/.proxy/ws';

const SERVER_URL = isRunningInDiscord()
  ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${DISCORD_WS_PATH}`
  : (import.meta.env['VITE_FLENS_SERVER'] ?? 'ws://localhost:8787');

type Mode =
  | { kind: 'menu' }
  | { kind: 'local'; choices: SetupChoices }
  | { kind: 'online' }
  | { kind: 'tutorial' };

/** What "Play against bots" off the back of the tutorial deals. */
const AFTER_TUTORIAL: SetupChoices = {
  opponents: 2,
  difficulty: 'normal',
  topValue: 16,
  hints: false,
  seed: 0,
};

export function App() {
  // A refresh mid-game should land back at the table, not at the menu.
  const [mode, setMode] = useState<Mode>(() =>
    !OFFLINE_ONLY && hasStoredSession() ? { kind: 'online' } : { kind: 'menu' },
  );

  if (!OFFLINE_ONLY && isRunningInDiscord()) return <DiscordApp />;

  switch (mode.kind) {
    case 'menu':
      return (
        <Setup
          onStart={(choices) => setMode({ kind: 'local', choices })}
          onLearn={() => setMode({ kind: 'tutorial' })}
          {...(OFFLINE_ONLY ? {} : { onOnline: () => setMode({ kind: 'online' }) })}
        />
      );
    case 'local':
      return <LocalTable choices={mode.choices} onQuit={() => setMode({ kind: 'menu' })} />;
    case 'online':
      return <OnlineTable onQuit={() => setMode({ kind: 'menu' })} />;
    case 'tutorial':
      return (
        <Tutorial
          onQuit={() => setMode({ kind: 'menu' })}
          onPlay={() =>
            setMode({
              kind: 'local',
              choices: { ...AFTER_TUTORIAL, seed: Math.floor(Math.random() * 1e9) },
            })
          }
        />
      );
  }
}

/** The Activity has no menu: it drops straight into the shared table. */
function DiscordApp() {
  const discord = useDiscord(DISCORD_CLIENT_ID);
  const online = useOnlineGame(SERVER_URL);
  return <DiscordTable discord={discord} online={online} />;
}

function LocalTable({ choices, onQuit }: { choices: SetupChoices; onQuit: () => void }) {
  const { t } = useT();
  const game = useFlensGame({
    opponents: choices.opponents,
    difficulty: choices.difficulty as Difficulty,
    topValue: choices.topValue,
    seed: choices.seed,
    hints: choices.hints,
    youName: t('you.title'),
  });

  return (
    <Table
      game={game}
      controls={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => game.restart()}>
            {t('table.newDeal')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onQuit}>
            {t('table.changeSetup')}
          </button>
        </>
      }
      result={<Result game={game} onAgain={() => game.restart()} />}
    />
  );
}

function OnlineTable({ onQuit }: { onQuit: () => void }) {
  const { t } = useT();
  const online = useOnlineGame(SERVER_URL);

  // Until the deal lands, the lobby is the whole screen.
  if (!online.view || !online.lobby?.started) {
    return <Lobby game={online} onBack={onQuit} />;
  }

  const controller: TableController = {
    view: online.view,
    seat: online.seat ?? 0,
    isYourTurn: online.isYourTurn,
    turnRemainingMs: online.turnRemainingMs,
    // The server never reveals infractions, so there is nothing to show and no
    // hint mode online — spotting them is the game.
    infractionVisible: false,
    hints: false,
    flensTarget: null,
    lastError: online.error,
    play: online.play,
    discard: online.discard,
    callFlens: online.callFlens,
    pass: online.pass,
  };

  return (
    <Table
      game={controller}
      controls={
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            online.leave();
            onQuit();
          }}
        >
          {t('table.leave')}
        </button>
      }
      result={<Result game={controller} />}
    />
  );
}

function Result({ game, onAgain }: { game: TableController; onAgain?: () => void }) {
  const { t } = useT();
  const { view } = game;
  if (view.phase === 'playing') return null;

  const heading =
    view.phase === 'stalemate'
      ? t('result.draw')
      : view.winner === game.seat
        ? t('result.youWin')
        : t('result.wins', { name: view.players[view.winner ?? 0]?.name ?? '' });

  return (
    <div className="result">
      <h2>{heading}</h2>
      {onAgain && (
        <button type="button" className="btn" onClick={onAgain}>
          {t('result.playAgain')}
        </button>
      )}
    </div>
  );
}
