/**
 * Turns what happens at the table into sound.
 *
 * Driven off the *view's* log rather than off click handlers, so a bot playing a
 * card sounds exactly like a person playing one, in both local and online games.
 *
 * This is also why it is safe: `viewFor` strips `secret` entries, so the
 * `infraction` and `gotAway` kinds never reach a view and therefore can never
 * make a noise. A sound on someone's mistake would give away the very thing the
 * player is supposed to notice for themselves.
 */

import { useEffect, useRef } from 'react';
import type { GameView, LogKind } from '@flens/engine';
import { isMuted, playSound, type SoundName } from './sfx';
import { shoutFlens } from './speech';

/** Kinds that are simply a sound. Anything absent here is deliberately silent. */
const SOUNDS: Partial<Record<LogKind, SoundName>> = {
  start: 'shuffle',
  play: 'place',
  discard: 'discard',
  timeout: 'discard',
  falseCall: 'penalty',
  pankouk: 'pankouk',
  recycle: 'shuffle',
};

/**
 * @param onEvent Fired for each fresh log entry, so the table can react
 * visually without diffing the log a second time.
 */
export function useTableAudio(
  view: GameView | null,
  seat: number,
  onEvent?: (kind: LogKind) => void,
): void {
  const seenRef = useRef(0);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!view) return;

    // A new deal resets the log; start listening from the top again.
    if (view.log.length < seenRef.current) {
      seenRef.current = 0;
      endedRef.current = false;
    }

    const fresh = view.log.slice(seenRef.current);
    seenRef.current = view.log.length;

    // On first mount we are catching up on history, not witnessing it — playing
    // twenty sounds at once would be a mess.
    const catchingUp = fresh.length > 6;

    for (const entry of fresh) {
      if (!entry.kind) continue;
      if (!catchingUp) onEvent?.(entry.kind);

      if (entry.kind === 'flens') {
        // The shout is the point. The stab underneath carries it if the
        // platform has no speech voices.
        playSound('flens');
        if (!catchingUp) shoutFlens(isMuted());
        continue;
      }

      if (catchingUp && entry.kind !== 'win') continue;

      const sound = SOUNDS[entry.kind];
      if (sound) playSound(sound);
    }
  }, [view, onEvent]);

  // Win and draw come from the phase, which is unambiguous about who won.
  useEffect(() => {
    if (!view || view.phase === 'playing') {
      endedRef.current = false;
      return;
    }
    if (endedRef.current) return;
    endedRef.current = true;

    playSound(view.phase === 'stalemate' ? 'lose' : view.winner === seat ? 'win' : 'lose');
  }, [view, seat]);
}
