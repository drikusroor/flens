/**
 * Online play.
 *
 * Mirrors the shape of `useFlensGame` so the table renders identically whether
 * the game is local or networked. Two differences that matter:
 *
 *  - There is no local engine. The server owns the state; this only holds the
 *    last view it sent.
 *  - The server does not stream the clock. Views carry `serverNow`, and the
 *    countdowns are extrapolated locally from the moment of receipt, so a
 *    smooth timer costs no traffic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Action, GameView } from '@flens/engine';
import type { BotDifficulty, ClientMessage, LobbyInfo, ServerMessage } from '@flens/protocol';
import type { PlaySource } from '../game/useFlensGame';

const TOKEN_KEY = 'flens.token';
const CODE_KEY = 'flens.code';

/**
 * Whether this tab left a seat behind. The app checks it on boot and goes
 * straight into online mode — otherwise a refresh strands the player at the
 * menu while the server still holds their seat.
 */
export function hasStoredSession(): boolean {
  try {
    return Boolean(sessionStorage.getItem(TOKEN_KEY) && sessionStorage.getItem(CODE_KEY));
  } catch {
    return false;
  }
}

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface OnlineGame {
  readonly status: ConnectionStatus;
  readonly lobby: LobbyInfo | null;
  readonly view: GameView | null;
  readonly seat: number | null;
  readonly error: string | null;
  readonly isYourTurn: boolean;
  /** Extrapolated locally between server messages. */
  readonly turnRemainingMs: number | null;

  readonly create: (name: string, topValue: number) => void;
  readonly join: (code: string, name: string) => void;
  /** Join the room shared by a Discord Activity instance. */
  readonly joinInstance: (instanceId: string, name: string) => void;
  readonly addBot: (difficulty: BotDifficulty) => void;
  readonly removeSeat: (seat: number) => void;
  readonly start: () => void;
  readonly play: (from: PlaySource, centreIndex: number) => void;
  readonly discard: (handIndex: number, openPileIndex: number) => void;
  readonly callFlens: () => void;
  readonly pass: () => void;
  readonly leave: () => void;
}

export function useOnlineGame(url: string): OnlineGame {
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lobby, setLobby] = useState<LobbyInfo | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Wall-clock time the current view arrived, for extrapolating countdowns. */
  const receivedAtRef = useRef<number>(0);
  const [, bumpClock] = useState(0);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('open');
      // Reclaim a seat after a refresh, if we left one behind.
      const token = sessionStorage.getItem(TOKEN_KEY);
      const code = sessionStorage.getItem(CODE_KEY);
      if (token && code) socket.send(JSON.stringify({ type: 'resume', code, token }));
    };
    socket.onclose = () => setStatus('closed');
    socket.onerror = () => setError('connection problem');

    socket.onmessage = (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }

      switch (message.type) {
        case 'joined':
          sessionStorage.setItem(TOKEN_KEY, message.token);
          sessionStorage.setItem(CODE_KEY, message.code);
          setSeat(message.seat);
          setLobby(message.lobby);
          setError(null);
          break;
        case 'lobby':
          setLobby(message.lobby);
          break;
        case 'state':
          receivedAtRef.current = Date.now();
          setView(message.view);
          break;
        case 'error':
          setError(message.message);
          break;
      }
    };

    return () => socket.close();
  }, [url]);

  // Repaint a few times a second so the extrapolated countdowns move. This is
  // purely cosmetic — no traffic, no state.
  useEffect(() => {
    const id = window.setInterval(() => bumpClock((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, []);

  const turnRemainingMs = useMemo(() => {
    if (!view || view.turnRemainingMs === null) return null;
    const elapsed = Date.now() - receivedAtRef.current;
    return Math.max(0, view.turnRemainingMs - elapsed);
  }, [view, status]);

  const action = useCallback(
    (payload: Action) => {
      setError(null);
      send({ type: 'action', action: payload });
    },
    [send],
  );

  const mySeat = seat ?? 0;

  return {
    status,
    lobby,
    view,
    seat,
    error,
    isYourTurn: view !== null && view.phase === 'playing' && view.currentPlayer === mySeat,
    turnRemainingMs,

    create: (name, topValue) => send({ type: 'create', name, topValue }),
    join: (code, name) => send({ type: 'join', code: code.toUpperCase(), name }),
    joinInstance: (instanceId, name) => send({ type: 'joinInstance', instanceId, name }),
    addBot: (difficulty) => send({ type: 'addBot', difficulty }),
    removeSeat: (target) => send({ type: 'removeSeat', seat: target }),
    start: () => send({ type: 'start' }),

    play: (from, centreIndex) =>
      action({ type: 'play', player: mySeat, from, to: { kind: 'centre', index: centreIndex } }),
    discard: (handIndex, openPileIndex) =>
      action({ type: 'discard', player: mySeat, handIndex, openPileIndex }),
    callFlens: () => action({ type: 'callFlens', player: mySeat }),
    pass: () => action({ type: 'pass', player: mySeat }),

    leave: () => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(CODE_KEY);
      setView(null);
      setLobby(null);
      setSeat(null);
      send({ type: 'leave' });
    },
  };
}
