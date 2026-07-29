/**
 * The "FLENS!" outcry.
 *
 * Uses the browser's built-in `SpeechSynthesis` — no service, no API key, no
 * audio files, and it keeps working on a static host with no network. The
 * trade-off is that voices come from the operating system, so quality varies
 * and on some platforms there are none at all. Every call is therefore
 * best-effort: the accompanying stab sound in `sfx.ts` carries the moment on its
 * own if speech never arrives.
 */

const DUTCH = 'nl-NL';
/** Your own press and the log entry it produces must not shout twice. */
const DEDUPE_MS = 1200;

let voicesReady = false;
let lastShoutAt = 0;

/**
 * Voice lists load asynchronously in most browsers and come back empty on the
 * first call. Nudging them early means the first shout is not silent.
 */
export function primeVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (voicesReady) return;

  const load = () => {
    if (window.speechSynthesis.getVoices().length > 0) voicesReady = true;
  };
  load();
  window.speechSynthesis.addEventListener('voiceschanged', load, { once: true });
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // A Dutch voice says "Flens" properly; an English one turns it into "flenz".
  return (
    voices.find((v) => v.lang === DUTCH) ??
    voices.find((v) => v.lang.startsWith('nl')) ??
    null
  );
}

/**
 * Shout it. Pitched up and slightly fast so it reads as a call across a table
 * rather than a screen reader announcing a word.
 */
export function shoutFlens(muted: boolean): void {
  if (muted) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const now = Date.now();
  if (now - lastShoutAt < DEDUPE_MS) return;
  lastShoutAt = now;

  try {
    // Never let calls queue up behind each other; the newest shout wins.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance('Flens!');
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? DUTCH;
    utterance.rate = 1.15;
    utterance.pitch = 1.4;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech is a bonus, never a requirement.
  }
}
