import type { MessageKey } from './catalogue/types.js';

/**
 * A thing to say, not yet said in any language.
 *
 * This is what lets the engine and the server describe what happened without
 * choosing words for it: they hand back a key and its parameters, and whoever is
 * looking at the screen renders it in their own language. It is also what makes
 * multilingual multiplayer possible at all — one table, one authoritative log,
 * six players reading it in three languages.
 */
export interface Message<K extends MessageKey = MessageKey> {
  readonly key: K;
  readonly params?: Params;
}

/**
 * A nested `Message` is rendered first and substituted as text, which is how a
 * log line quotes the infraction it is about.
 */
export type ParamValue = string | number | Message;

export type Params = Readonly<Record<string, ParamValue>>;

/** Terser than an object literal at the ~40 call sites that build one. */
export function message<K extends MessageKey>(key: K, params?: Params): Message<K> {
  return params === undefined ? { key } : { key, params };
}
