import type { Entry } from '../entry.js';
import type { en } from './en.js';

/**
 * Every key the game can say something with.
 *
 * Derived from the English catalogue rather than written out, so adding a line
 * there is all it takes — and forgetting to translate it is a type error rather
 * than a string that silently falls back at runtime.
 */
export type MessageKey = keyof typeof en;

/** Keys under a prefix, e.g. `Keys<'log.'>` for everything the log can say. */
export type Keys<Prefix extends string> = Extract<MessageKey, `${Prefix}${string}`>;

export type Catalogue = { readonly [K in MessageKey]: Entry };
