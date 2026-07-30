/**
 * Turning a `Message` into words.
 *
 * Deliberately small: `{placeholders}`, a `one`/`other` plural chosen by a
 * `count` parameter, and two inline marks (`*emphasis*`, `` `code` ``) that the
 * UI turns into elements. No ICU parser, no dependency — the game says a few
 * dozen things and none of them need gender or ordinals.
 */

import type { Entry } from './entry.js';
import type { Message, Params } from './message.js';
import type { MessageKey } from './catalogue/types.js';
import { CATALOGUES, DEFAULT_LOCALE, type Locale } from './locales.js';

const PLACEHOLDER = /\{(\w+)\}/g;

/** Picks the plural form. English, Dutch and Spanish all split at exactly one. */
function chooseForm(entry: Entry, params: Params | undefined): string {
  if (typeof entry === 'string') return entry;
  const count = params?.['count'];
  return typeof count === 'number' && Math.abs(count) === 1 ? entry.one : entry.other;
}

function lookup(locale: Locale, key: MessageKey): Entry | undefined {
  return CATALOGUES[locale][key] ?? CATALOGUES[DEFAULT_LOCALE][key];
}

/**
 * Says one line.
 *
 * An unknown parameter leaves its placeholder in the output rather than
 * blanking it: a visible `{name}` is a bug report, an empty gap is a mystery.
 */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const entry = lookup(locale, key);
  if (entry === undefined) return key;

  return chooseForm(entry, params).replace(PLACEHOLDER, (whole, name: string) => {
    const value = params?.[name];
    if (value === undefined) return whole;
    if (typeof value === 'object') return render(locale, value);
    return String(value);
  });
}

/** Says a message the engine, the server or a lesson handed over. */
export function render(locale: Locale, message: Message): string {
  return translate(locale, message.key, message.params);
}

// ---------------------------------------------------------------------------
// Inline marks
// ---------------------------------------------------------------------------

export type Segment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'emphasis'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string };

const MARKED = /\*([^*]+)\*|`([^`]+)`/g;

/**
 * Splits rendered text on its inline marks, so a translator can put the
 * emphasis where their language wants it instead of where the English markup
 * happened to fall. The web app maps these onto `<strong>` and `<code>`.
 */
export function segments(text: string): readonly Segment[] {
  const out: Segment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MARKED)) {
    const at = match.index;
    if (at > cursor) out.push({ kind: 'text', text: text.slice(cursor, at) });
    const [, emphasis, code] = match;
    out.push(
      emphasis === undefined
        ? { kind: 'code', text: code as string }
        : { kind: 'emphasis', text: emphasis },
    );
    cursor = at + match[0].length;
  }

  if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) });
  return out;
}
