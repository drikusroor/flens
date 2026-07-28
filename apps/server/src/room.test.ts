import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Room } from './room.js';
import { RoomRegistry } from './rooms.js';

const noop = { onBroadcast: () => {} };

/** Every object key appearing anywhere in a payload. */
function allKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, found);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      found.add(key);
      allKeys(child, found);
    }
  }
  return found;
}

function seatedRoom(humans = 2): { room: Room; tokens: string[] } {
  const room = new Room('TEST', 16, noop);
  const tokens: string[] = [];
  for (let i = 0; i < humans; i++) {
    const token = `token-${i}`;
    tokens.push(token);
    room.addHuman(`P${i}`, token);
  }
  return { room, tokens };
}

describe('lobby', () => {
  it('seats players in order and makes the first one host', () => {
    const { room } = seatedRoom(3);
    const lobby = room.lobby();

    expect(lobby.seats.map((s) => s.seat)).toEqual([0, 1, 2]);
    expect(lobby.hostSeat).toBe(0);
    expect(lobby.started).toBe(false);
  });

  it('refuses a seventh player', () => {
    const { room } = seatedRoom(6);
    expect(room.addHuman('Late', 'token-late')).toMatchObject({ error: 'that room is full' });
  });

  it('strips control characters and markup from names', () => {
    const room = new Room('TEST', 16, noop);
    room.addHuman('<script>alert(1)</script>', 'token');
    // Angle brackets and slashes are stripped; names cap at 16 characters.
    expect(room.lobby().seats[0]!.name).toBe('scriptalert1scri');
  });

  it('falls back to a default when a name sanitises to nothing', () => {
    const room = new Room('TEST', 16, noop);
    room.addHuman('!!!', 'token');
    expect(room.lobby().seats[0]!.name).toBe('Player 1');
  });

  it('lets the host add and remove bots', () => {
    const { room, tokens } = seatedRoom(1);
    room.addBot('hard');

    expect(room.lobby().seats).toHaveLength(2);
    expect(room.lobby().seats[1]).toMatchObject({ kind: 'bot', difficulty: 'hard' });

    expect(room.removeSeat(1, tokens[0]!)).toBeNull();
    expect(room.lobby().seats).toHaveLength(1);
  });

  it('does not let a non-host remove seats', () => {
    const { room, tokens } = seatedRoom(2);
    room.addBot('easy');

    expect(room.removeSeat(2, tokens[1]!)).toMatchObject({ error: 'only the host can do that' });
    expect(room.lobby().seats).toHaveLength(3);
  });

  it('does not let anyone remove a human', () => {
    const { room, tokens } = seatedRoom(2);
    expect(room.removeSeat(1, tokens[0]!)).toMatchObject({ error: 'cannot remove a player' });
  });

  it('keeps seat numbers contiguous after a removal', () => {
    const { room, tokens } = seatedRoom(1);
    room.addBot('easy');
    room.addBot('normal');
    room.removeSeat(1, tokens[0]!);

    expect(room.lobby().seats.map((s) => s.seat)).toEqual([0, 1]);
  });
});

describe('starting', () => {
  it('needs two players', () => {
    const { room, tokens } = seatedRoom(1);
    expect(room.start(tokens[0]!)).toMatchObject({ error: 'need at least two players' });
  });

  it('only the host may start', () => {
    const { room, tokens } = seatedRoom(2);
    expect(room.start(tokens[1]!)).toMatchObject({ error: 'only the host can start' });
  });

  it('deals once started', () => {
    const { room, tokens } = seatedRoom(2);
    expect(room.start(tokens[0]!)).toBeNull();

    expect(room.started).toBe(true);
    const view = room.viewForSeat(0);
    expect(view?.players).toHaveLength(2);
    expect(view?.players[0]!.hand).toHaveLength(5);
  });

  it('refuses to start twice', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);
    expect(room.start(tokens[0]!)).toMatchObject({ error: 'already started' });
  });

  it('refuses new players once dealt', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);
    expect(room.addHuman('Late', 'late')).toMatchObject({
      error: 'that game has already started',
    });
  });
});

describe('per-seat views never leak', () => {
  it('hides other players hands', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);

    const view = room.viewForSeat(0)!;
    expect(view.players[0]!.hand).not.toBeNull();
    expect(view.players[1]!.hand).toBeNull();
  });

  it('never serialises the hidden zones at all', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);

    // The face-down piles must not appear as keys anywhere in the payload —
    // only their counts and exposed tops do.
    const keys = allKeys(JSON.parse(JSON.stringify(room.viewForSeat(0))));
    expect(keys.has('voorraad')).toBe(false);
    expect(keys.has('flensstok')).toBe(false);
    expect(keys.has('completed')).toBe(false);
    expect(keys.has('flensstokCount')).toBe(true);
  });

  it('withholds infractions, so a client cannot cheat the FLENS call', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);

    // Force an out-of-sequence play from seat 0.
    const view = room.viewForSeat(0)!;
    const bad = view.players[0]!.hand!.find((c) => c.value !== 1);
    if (bad) {
      const index = view.players[0]!.hand!.indexOf(bad);
      room.submit(0, {
        type: 'play',
        player: 0,
        from: { kind: 'hand', index },
        to: { kind: 'centre', index: 0 },
      });
    }

    const opponent = JSON.stringify(room.viewForSeat(1));
    expect(opponent).not.toContain('infraction');
  });
});

describe('acting', () => {
  it('rejects actions before the game starts', () => {
    const { room } = seatedRoom(2);
    expect(
      room.submit(0, { type: 'discard', player: 0, handIndex: 0, openPileIndex: 0 }),
    ).toMatchObject({ error: 'the game has not started' });
  });

  it('rejects a client trying to drive the clock', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);

    expect(room.submit(0, { type: 'tick', ms: 999_999 })).toMatchObject({
      error: 'clients do not control the clock',
    });
  });

  it('forces the action onto the seat that submitted it', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);

    // Seat 1 claims to be seat 0. The claim is overwritten, so it becomes an
    // out-of-turn action by seat 1 and is refused.
    const failed = room.submit(1, {
      type: 'discard',
      player: 0,
      handIndex: 0,
      openPileIndex: 0,
    });

    expect(failed).toMatchObject({ error: 'not your turn' });
    expect(room.viewForSeat(1)!.players[1]!.hand).toHaveLength(5);
  });

  it('maps a token to its seat and nothing else', () => {
    const { room, tokens } = seatedRoom(2);
    expect(room.seatFor(tokens[0]!)).toBe(0);
    expect(room.seatFor(tokens[1]!)).toBe(1);
    expect(room.seatFor('not-a-token')).toBeNull();
  });
});

describe('disconnects', () => {
  it('frees a seat when someone drops before the deal', () => {
    const { room, tokens } = seatedRoom(2);
    room.disconnect(tokens[1]!);
    expect(room.lobby().seats).toHaveLength(1);
  });

  it('keeps the seat once the game is under way', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);
    room.disconnect(tokens[1]!);

    const lobby = room.lobby();
    expect(lobby.seats).toHaveLength(2);
    expect(lobby.seats[1]!.connected).toBe(false);
  });

  it('lets a dropped player reclaim their seat with their token', () => {
    const { room, tokens } = seatedRoom(2);
    room.start(tokens[0]!);
    room.disconnect(tokens[1]!);

    expect(room.resume(tokens[1]!)).toEqual({ seat: 1 });
    expect(room.lobby().seats[1]!.connected).toBe(true);
  });

  it('refuses a resume with an unknown token', () => {
    const { room } = seatedRoom(2);
    expect(room.resume('stolen')).toMatchObject({ error: 'no seat here matches that token' });
  });
});

describe('the heartbeat', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  // Without this the stubbed Math.random leaks into later suites and the room
  // registry hands out the same code every time.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing before the game starts', () => {
    const onBroadcast = vi.fn();
    const room = new Room('TEST', 16, { onBroadcast });
    room.addHuman('A', 'a');
    for (let i = 0; i < 50; i++) room.tick();

    expect(onBroadcast).not.toHaveBeenCalled();
  });

  it('does not broadcast for a bare clock tick', () => {
    const onBroadcast = vi.fn();
    const room = new Room('TEST', 16, { onBroadcast });
    room.addHuman('A', 'a');
    room.addHuman('B', 'b');
    room.start('a');
    onBroadcast.mockClear();

    room.tick(); // 100ms — nothing happens at the table
    expect(onBroadcast).not.toHaveBeenCalled();
  });

  it('drives bots, which does broadcast', () => {
    const onBroadcast = vi.fn();
    const room = new Room('TEST', 16, { onBroadcast });
    room.addHuman('A', 'a');
    room.addBot('hard');
    room.start('a');

    // Run past seat 0's turn timeout so play reaches the bot.
    for (let i = 0; i < 1_200; i++) room.tick();

    expect(onBroadcast).toHaveBeenCalled();
    expect(room.viewForSeat(0)!.log.length).toBeGreaterThan(1);
  });
});

describe('RoomRegistry', () => {
  it('issues distinct codes of the right shape', () => {
    const registry = new RoomRegistry();
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) codes.add(registry.create(16, noop).code);

    expect(codes.size).toBe(50);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
  });

  it('looks up case-insensitively', () => {
    const registry = new RoomRegistry();
    const room = registry.create(16, noop);
    expect(registry.get(room.code.toLowerCase())).toBe(room);
  });

  it('sweeps away rooms nobody is left in', () => {
    const registry = new RoomRegistry();
    const room = registry.create(16, noop);
    room.addHuman('A', 'a');
    expect(registry.size).toBe(1);

    room.disconnect('a');
    registry.sweep();
    expect(registry.size).toBe(0);
  });
});
