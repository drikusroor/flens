/**
 * WebSocket transport.
 *
 * Everything gameplay-related lives in `Room`; this file only moves messages
 * and decides which seat a connection owns. That boundary is the security
 * boundary: a client's claimed seat is never trusted, only its token.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { isClientMessage, type ClientMessage, type ServerMessage } from '@flens/protocol';
import { Room, TICK_MS } from './room.js';
import { RoomRegistry } from './rooms.js';

const PORT = Number(process.env.PORT ?? 8787);

interface Session {
  socket: WebSocket;
  token: string;
  room: Room | null;
  seat: number | null;
}

const registry = new RoomRegistry();
const sessions = new Set<Session>();

const httpServer = createServer((req, res) => {
  // Discord serves the Activity through its own proxy, which prefixes every
  // request path with /.proxy — so each route has to answer on both.
  const path = (req.url ?? '').replace(/^\/\.proxy/, '');

  if (path === '/health') {
    return json(res, 200, { ok: true, rooms: registry.size });
  }
  if (path === '/api/discord/token' && req.method === 'POST') {
    return discordToken(req, res);
  }

  res.writeHead(404);
  res.end();
});

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Exchanges a Discord OAuth code for an access token.
 *
 * This has to happen server-side: the client secret must never reach the
 * browser, and Discord will not issue a token without it.
 */
async function discordToken(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const clientId = process.env['DISCORD_CLIENT_ID'];
  const clientSecret = process.env['DISCORD_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    return json(res, 501, {
      error: 'DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET are not set on the server',
    });
  }

  let code: string | undefined;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    code = JSON.parse(Buffer.concat(chunks).toString()).code;
  } catch {
    return json(res, 400, { error: 'malformed body' });
  }
  if (!code) return json(res, 400, { error: 'missing code' });

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
      }),
    });

    const payload = (await response.json()) as { access_token?: string; error?: string };
    if (!response.ok || !payload.access_token) {
      return json(res, 502, { error: payload.error ?? 'discord rejected the code' });
    }
    // Only the access token goes back — never the secret, never the raw body.
    return json(res, 200, { access_token: payload.access_token });
  } catch {
    return json(res, 502, { error: 'could not reach discord' });
  }
}

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (socket) => {
  const session: Session = { socket, token: randomUUID(), room: null, seat: null };
  sessions.add(session);

  socket.on('message', (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return send(socket, { type: 'error', message: 'malformed message' });
    }
    if (!isClientMessage(parsed)) {
      return send(socket, { type: 'error', message: 'unrecognised message' });
    }
    handle(session, parsed);
  });

  socket.on('close', () => {
    if (session.room) {
      session.room.disconnect(session.token);
      broadcastLobby(session.room);
    }
    sessions.delete(session);
    registry.sweep();
  });
});

function handle(session: Session, message: ClientMessage): void {
  switch (message.type) {
    case 'create': {
      const room = registry.create(message.topValue ?? 16, {
        onBroadcast: () => broadcastState(room),
      });
      const added = room.addHuman(message.name, session.token);
      if ('error' in added) return send(session.socket, { type: 'error', message: added.error });

      session.room = room;
      session.seat = added.seat;
      send(session.socket, {
        type: 'joined',
        code: room.code,
        seat: added.seat,
        token: session.token,
        lobby: room.lobby(),
      });
      return;
    }

    case 'joinInstance': {
      // Everyone who launched the same Discord Activity lands in one room, with
      // no code to type. The first arrival creates it.
      // The callback is only used if this call creates the room; an existing
      // one keeps the callback it was made with, bound to the same object.
      const room: Room = registry.forInstance(message.instanceId, 16, {
        onBroadcast: () => broadcastState(room),
      });

      const added = room.addHuman(message.name, session.token);
      if ('error' in added) return send(session.socket, { type: 'error', message: added.error });

      session.room = room;
      session.seat = added.seat;
      send(session.socket, {
        type: 'joined',
        code: room.code,
        seat: added.seat,
        token: session.token,
        lobby: room.lobby(),
      });
      broadcastLobby(room);
      return;
    }

    case 'join': {
      const room = registry.get(message.code);
      if (!room) return send(session.socket, { type: 'error', message: 'no room with that code' });

      const added = room.addHuman(message.name, session.token);
      if ('error' in added) return send(session.socket, { type: 'error', message: added.error });

      session.room = room;
      session.seat = added.seat;
      send(session.socket, {
        type: 'joined',
        code: room.code,
        seat: added.seat,
        token: session.token,
        lobby: room.lobby(),
      });
      broadcastLobby(room);
      return;
    }

    case 'resume': {
      const room = registry.get(message.code);
      if (!room) return send(session.socket, { type: 'error', message: 'no room with that code' });

      const resumed = room.resume(message.token);
      if ('error' in resumed) {
        return send(session.socket, { type: 'error', message: resumed.error });
      }

      // Adopt the old token so this connection owns the original seat.
      session.token = message.token;
      session.room = room;
      session.seat = resumed.seat;
      send(session.socket, {
        type: 'joined',
        code: room.code,
        seat: resumed.seat,
        token: message.token,
        lobby: room.lobby(),
      });
      sendState(session);
      broadcastLobby(room);
      return;
    }

    case 'addBot': {
      const room = requireRoom(session);
      if (!room) return;
      const failed = room.addBot(message.difficulty);
      if (failed) return send(session.socket, { type: 'error', message: failed.error });
      broadcastLobby(room);
      return;
    }

    case 'removeSeat': {
      const room = requireRoom(session);
      if (!room) return;
      const failed = room.removeSeat(message.seat, session.token);
      if (failed) return send(session.socket, { type: 'error', message: failed.error });
      broadcastLobby(room);
      return;
    }

    case 'start': {
      const room = requireRoom(session);
      if (!room) return;
      const failed = room.start(session.token);
      if (failed) return send(session.socket, { type: 'error', message: failed.error });
      broadcastLobby(room);
      broadcastState(room);
      return;
    }

    case 'action': {
      const room = requireRoom(session);
      if (!room) return;

      // The seat comes from the token, not the message.
      const seat = room.seatFor(session.token);
      if (seat === null) {
        return send(session.socket, { type: 'error', message: 'you do not hold a seat here' });
      }

      const failed = room.submit(seat, message.action);
      if (failed) send(session.socket, { type: 'error', message: failed.error });
      return;
    }

    case 'leave': {
      if (session.room) {
        session.room.disconnect(session.token);
        broadcastLobby(session.room);
      }
      session.room = null;
      session.seat = null;
      registry.sweep();
      return;
    }
  }
}

function requireRoom(session: Session): Room | null {
  if (!session.room) {
    send(session.socket, { type: 'error', message: 'you are not in a room' });
    return null;
  }
  return session.room;
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function sendState(session: Session): void {
  if (!session.room || session.seat === null) return;
  const view = session.room.viewForSeat(session.seat);
  if (!view) return;
  send(session.socket, { type: 'state', view, serverNow: session.room.now });
}

function broadcastState(room: Room): void {
  for (const session of sessions) {
    if (session.room === room) sendState(session);
  }
}

function broadcastLobby(room: Room): void {
  const lobby = room.lobby();
  for (const session of sessions) {
    if (session.room === room) send(session.socket, { type: 'lobby', lobby });
  }
}

// One heartbeat for every room. Rooms decide whether anything worth sending
// happened; a bare clock tick never becomes a message.
setInterval(() => {
  const seen = new Set<Room>();
  for (const session of sessions) {
    if (session.room && !seen.has(session.room)) {
      seen.add(session.room);
      session.room.tick();
    }
  }
}, TICK_MS);

setInterval(() => registry.sweep(), 60_000);

httpServer.listen(PORT, () => {
  console.log(`flens server listening on :${PORT}`);
});
