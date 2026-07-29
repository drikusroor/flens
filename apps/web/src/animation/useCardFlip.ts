/**
 * Cards that visibly travel between places.
 *
 * A FLIP animation (First, Last, Invert, Play): after every render, measure
 * where each card is now, compare against where it was last render, and if it
 * moved, transform it back to the old position and let it slide to the new one.
 *
 * Doing it this way rather than animating specific interactions means it works
 * for everything at once — your card flying from hand to centre, a bot's card
 * landing on a pile, a whole open pile being dumped on you after a FLENS! call —
 * without any of those code paths knowing animation exists. Cards are matched by
 * `data-card-id`, so the same physical card is followed even when it moves
 * between components.
 */

import { useLayoutEffect, useRef } from 'react';

const DURATION_MS = 320;
const EASING = 'cubic-bezier(0.22, 0.68, 0.35, 1)';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

interface Snapshot {
  x: number;
  y: number;
  width: number;
}

/**
 * Call once from the table.
 *
 * `signature` must change only when something actually happened at the table —
 * *not* on every render. The engine clock advances every 100ms, so a hook keyed
 * on the view object alone would re-measure ten times a second, read positions
 * that are mid-animation (`getBoundingClientRect` includes transforms), and feed
 * its own transforms back in as new deltas. That loop animated ~34 cards a
 * second on a table where nothing was moving.
 */
export function useCardFlip(signature: string): void {
  const previous = useRef(new Map<string, Snapshot>());

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-card-id]'),
    );
    const next = new Map<string, Snapshot>();
    const reduced = prefersReducedMotion();

    for (const element of elements) {
      const id = element.dataset['cardId'];
      if (!id) continue;

      // Measure layout, not the current frame of an animation. Cancelling first
      // drops any transform still in flight so the rect is the real position.
      for (const animation of element.getAnimations()) animation.cancel();

      const rect = element.getBoundingClientRect();
      next.set(id, { x: rect.left, y: rect.top, width: rect.width });
      if (reduced) continue;

      const before = previous.current.get(id);
      if (!before) {
        // Newly on screen: a small pop, so drawn cards do not just blink in.
        element.animate(
          [
            { transform: 'scale(0.72)', opacity: 0.2 },
            { transform: 'scale(1)', opacity: 1 },
          ],
          { duration: 200, easing: EASING },
        );
        continue;
      }

      const dx = before.x - rect.left;
      const dy = before.y - rect.top;
      // Piles render at different sizes in different places, so scale too.
      const scale = rect.width > 0 ? before.width / rect.width : 1;

      // Sub-pixel jitter from layout is not movement worth animating.
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(scale - 1) < 0.02) continue;

      element.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, zIndex: 40 },
          { transform: 'translate(0, 0) scale(1)', zIndex: 40 },
        ],
        { duration: DURATION_MS, easing: EASING },
      );
    }

    previous.current = next;
  }, [signature]);
}
