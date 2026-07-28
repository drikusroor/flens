import { CODE_ALPHABET, CODE_LENGTH } from '@flens/protocol';
import { Room, type RoomEvents } from './room.js';

/** In-memory room registry. Rooms die with the process; that is fine for now. */
export class RoomRegistry {
  private rooms = new Map<string, Room>();

  create(topValue: number, events: RoomEvents): Room {
    const code = this.freshCode();
    const room = new Room(code, topValue, events);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Drops rooms nobody is connected to, so abandoned games don't accumulate. */
  sweep(): void {
    for (const [code, room] of this.rooms) {
      if (room.isEmpty) this.rooms.delete(code);
    }
  }

  private freshCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('could not allocate a room code');
  }
}
