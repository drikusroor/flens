import { en } from './catalogue/en.js';
import { es } from './catalogue/es.js';
import { nl } from './catalogue/nl.js';
import type { Catalogue } from './catalogue/types.js';

export type Locale = 'en' | 'nl' | 'es';

/** Falls back to this when nothing better can be worked out. */
export const DEFAULT_LOCALE: Locale = 'en';

export const CATALOGUES: Readonly<Record<Locale, Catalogue>> = { en, nl, es };

export interface LocaleInfo {
  readonly code: Locale;
  /** Key of this language's own name, for a switcher that reads as a switcher. */
  readonly nameKey: 'language.en' | 'language.nl' | 'language.es';
  /** Value for `<html lang>`, so screen readers pronounce the page. */
  readonly htmlLang: string;
}

export const LOCALES: readonly LocaleInfo[] = [
  { code: 'en', nameKey: 'language.en', htmlLang: 'en' },
  { code: 'nl', nameKey: 'language.nl', htmlLang: 'nl' },
  { code: 'es', nameKey: 'language.es', htmlLang: 'es' },
];

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'nl' || value === 'es';
}

/**
 * `en-GB`, `NL`, `es-419` — anything a browser or a stored preference might
 * offer. Returns null rather than a default so callers can keep looking down
 * their list of candidates.
 */
export function parseLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : null;
}

/**
 * First candidate we speak, in the order the caller prefers them.
 *
 * Kept pure: the web app passes `navigator.languages` and whatever it has in
 * storage, which keeps this package free of browser globals and testable.
 */
export function pickLocale(candidates: readonly (string | null | undefined)[]): Locale {
  for (const candidate of candidates) {
    const locale = parseLocale(candidate);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}
