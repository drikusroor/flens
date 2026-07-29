/**
 * Sound effects, synthesised at runtime with the Web Audio API.
 *
 * No audio files. The whole game ships to GitHub Pages as static assets with no
 * server, and every sound here is a few oscillators and a noise burst — cheaper
 * to generate than to download, trivially tweakable, and free of any licensing
 * question about where a sample came from.
 *
 * Browsers refuse to start audio before a user gesture, so the context is
 * created lazily and resumed on the first interaction.
 */

export type SoundName =
  | 'pickup'
  | 'place'
  | 'discard'
  | 'shuffle'
  | 'pankouk'
  | 'flens'
  | 'penalty'
  | 'win'
  | 'lose'
  | 'error';

const STORAGE_KEY = 'flens.muted';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Private browsing; the setting just will not persist.
  }
  if (master && context) master.gain.setTargetAtTime(value ? 0 : 0.9, context.currentTime, 0.01);
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(context.destination);
  }
  // Autoplay policy parks the context until a gesture unlocks it.
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** Call once from a real user gesture so later sounds are allowed to play. */
export function unlockAudio(): void {
  ensureContext();
}

function whiteNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

interface NoiseOptions {
  at: number;
  duration: number;
  gain: number;
  frequency: number;
  q?: number;
  type?: BiquadFilterType;
}

/** A filtered burst of noise — the basis of every card sound. */
function noise(ctx: AudioContext, out: AudioNode, o: NoiseOptions): void {
  const source = ctx.createBufferSource();
  source.buffer = whiteNoise(ctx);
  source.playbackRate.value = 0.8 + Math.random() * 0.4;

  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.frequency.value = o.frequency;
  filter.Q.value = o.q ?? 1;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, o.at);
  envelope.gain.linearRampToValueAtTime(o.gain, o.at + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, o.at + o.duration);

  source.connect(filter).connect(envelope).connect(out);
  source.start(o.at);
  source.stop(o.at + o.duration + 0.02);
}

interface ToneOptions {
  at: number;
  duration: number;
  gain: number;
  frequency: number;
  /** Slide to this frequency over the note, for stabs and drops. */
  to?: number;
  type?: OscillatorType;
}

function tone(ctx: AudioContext, out: AudioNode, o: ToneOptions): void {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.frequency, o.at);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, o.at + o.duration);

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, o.at);
  envelope.gain.linearRampToValueAtTime(o.gain, o.at + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, o.at + o.duration);

  osc.connect(envelope).connect(out);
  osc.start(o.at);
  osc.stop(o.at + o.duration + 0.02);
}

export function playSound(name: SoundName): void {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || !master) return;

  const t = ctx.currentTime;

  switch (name) {
    // A fingernail catching the edge of a card.
    case 'pickup':
      noise(ctx, master, { at: t, duration: 0.05, gain: 0.18, frequency: 2600, q: 1.4 });
      break;

    // Card slapped onto the table: bright snap over a low thump.
    case 'place':
      noise(ctx, master, { at: t, duration: 0.09, gain: 0.4, frequency: 1700, q: 0.8 });
      tone(ctx, master, { at: t, duration: 0.1, gain: 0.16, frequency: 180, to: 90 });
      break;

    // Softer — it is only going onto your own pile.
    case 'discard':
      noise(ctx, master, { at: t, duration: 0.07, gain: 0.28, frequency: 1200, q: 0.7 });
      tone(ctx, master, { at: t, duration: 0.08, gain: 0.1, frequency: 140, to: 80 });
      break;

    // A riffle: a scatter of tiny clicks.
    case 'shuffle':
      for (let i = 0; i < 18; i++) {
        const at = t + i * 0.022 + Math.random() * 0.012;
        noise(ctx, master, { at, duration: 0.03, gain: 0.13, frequency: 2000 + Math.random() * 1800, q: 2 });
      }
      break;

    // Completing a run deserves something bright and pleased.
    case 'pankouk': {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) =>
        tone(ctx, master!, { at: t + i * 0.075, duration: 0.3, gain: 0.2, frequency: f, type: 'triangle' }),
      );
      break;
    }

    // The call itself: a sharp accusatory stab under the shout.
    case 'flens':
      tone(ctx, master, { at: t, duration: 0.28, gain: 0.3, frequency: 880, to: 220, type: 'sawtooth' });
      noise(ctx, master, { at: t, duration: 0.16, gain: 0.3, frequency: 900, q: 0.6 });
      break;

    // Cards landing on you.
    case 'penalty':
      tone(ctx, master, { at: t, duration: 0.35, gain: 0.28, frequency: 220, to: 70, type: 'square' });
      for (let i = 0; i < 4; i++) {
        noise(ctx, master, { at: t + i * 0.06, duration: 0.08, gain: 0.2, frequency: 900, q: 1 });
      }
      break;

    case 'win': {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) =>
        tone(ctx, master!, { at: t + i * 0.1, duration: 0.42, gain: 0.22, frequency: f, type: 'triangle' }),
      );
      break;
    }

    case 'lose': {
      const notes = [392, 349.23, 293.66];
      notes.forEach((f, i) =>
        tone(ctx, master!, { at: t + i * 0.16, duration: 0.5, gain: 0.2, frequency: f, type: 'triangle' }),
      );
      break;
    }

    // A rejected action — the engine said no.
    case 'error':
      tone(ctx, master, { at: t, duration: 0.16, gain: 0.16, frequency: 160, to: 120, type: 'square' });
      break;
  }
}
