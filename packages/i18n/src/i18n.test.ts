/**
 * The catalogues are typed against English, so a *missing* key cannot compile.
 * What types cannot catch is a translation that drops a placeholder, keeps a
 * plural form it does not need, or leaves an inline mark unclosed — and each of
 * those breaks a line only for the players reading that language, which is
 * exactly the kind of bug nobody notices. Hence these.
 */

import { describe, expect, it } from 'vitest';
import { en } from './catalogue/en.js';
import type { Entry } from './entry.js';
import { CATALOGUES, LOCALES, pickLocale, parseLocale, DEFAULT_LOCALE } from './locales.js';
import { render, segments, translate } from './format.js';
import { message } from './message.js';

const forms = (entry: Entry): readonly string[] =>
  typeof entry === 'string' ? [entry] : [entry.one, entry.other];

const placeholders = (entry: Entry): Set<string> => {
  const found = new Set<string>();
  for (const form of forms(entry)) {
    for (const match of form.matchAll(/\{(\w+)\}/g)) found.add(match[1] as string);
  }
  return found;
};

const keys = Object.keys(en) as (keyof typeof en)[];

describe('catalogue parity', () => {
  for (const { code } of LOCALES) {
    const catalogue = CATALOGUES[code];

    it(`${code} uses the same placeholders as English`, () => {
      for (const key of keys) {
        expect([...placeholders(catalogue[key])].sort(), key).toEqual(
          [...placeholders(en[key])].sort(),
        );
      }
    });

    it(`${code} pluralises exactly where English does`, () => {
      for (const key of keys) {
        expect(typeof catalogue[key], key).toBe(typeof en[key]);
      }
    });

    it(`${code} leaves no inline mark unclosed`, () => {
      for (const key of keys) {
        for (const form of forms(catalogue[key])) {
          expect((form.match(/\*/g) ?? []).length % 2, `${key}: ${form}`).toBe(0);
          expect((form.match(/`/g) ?? []).length % 2, `${key}: ${form}`).toBe(0);
        }
      }
    });

    it(`${code} says something for every key`, () => {
      for (const key of keys) {
        for (const form of forms(catalogue[key])) {
          expect(form.trim().length, key).toBeGreaterThan(0);
        }
      }
    });
  }

  /**
   * One of the seats at every table is the person reading the log, named "You" /
   * "Jij" / "Tú". A pronoun cannot decline, so a log line that puts a seat name
   * after a preposition comes out as "op Jij" or "de Tú" — wrong for exactly one
   * seat, which is the one most likely to be reading. English gets away with
   * "on You"; Dutch and Spanish do not, so their lines keep every name in label
   * position instead.
   */
  const SEAT = String.raw`\{(?:name|caller|offender)\}`;
  const PREPOSITIONS: Partial<Record<string, readonly string[]>> = {
    nl: ['op', 'van', 'aan', 'voor', 'bij', 'met', 'naar', 'in'],
    es: ['de', 'a', 'para', 'por', 'con', 'en', 'sobre'],
  };

  for (const [code, prepositions] of Object.entries(PREPOSITIONS)) {
    it(`${code} never puts a seat name after a preposition`, () => {
      const catalogue = CATALOGUES[code as keyof typeof CATALOGUES];
      const trap = new RegExp(`\\b(?:${(prepositions ?? []).join('|')})\\s+${SEAT}`, 'i');
      for (const key of keys.filter((k) => k.startsWith('log.'))) {
        for (const form of forms(catalogue[key])) {
          expect(trap.test(form), `${key}: ${form}`).toBe(false);
        }
      }
    });
  }

  it('every language names itself in its own language', () => {
    for (const { code, nameKey } of LOCALES) {
      for (const other of LOCALES) {
        expect(CATALOGUES[other.code][nameKey]).toBe(CATALOGUES[code][nameKey]);
      }
    }
  });
});

describe('translate', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'result.wins', { name: 'Bram' })).toBe('Bram wins');
    expect(translate('nl', 'result.wins', { name: 'Bram' })).toBe('Bram wint');
    expect(translate('es', 'result.wins', { name: 'Bram' })).toBe('Bram gana');
  });

  it('picks the plural form off count', () => {
    expect(translate('en', 'log.recycled', { count: 1 })).toContain('1 buried card back');
    expect(translate('en', 'log.recycled', { count: 7 })).toContain('7 buried cards back');
    expect(translate('nl', 'log.recycled', { count: 1 })).toContain('1 begraven kaart ');
    expect(translate('nl', 'log.recycled', { count: 7 })).toContain('7 begraven kaarten ');
  });

  it('renders a nested message in the outer language', () => {
    const line = render(
      'nl',
      message('log.infraction', {
        name: 'Cato',
        detail: message('infraction.outOfSequence', { value: 9, expected: 3 }),
      }),
    );
    expect(line).toBe('Cato: overtreding, speelde 9 op een stapel die 3 verwachtte');
  });

  it('leaves an unsupplied placeholder visible rather than blank', () => {
    expect(translate('en', 'result.wins')).toBe('{name} wins');
  });
});

describe('segments', () => {
  it('splits emphasis and code out of the text', () => {
    expect(segments('Share the code *ABCD* with them.')).toEqual([
      { kind: 'text', text: 'Share the code ' },
      { kind: 'emphasis', text: 'ABCD' },
      { kind: 'text', text: ' with them.' },
    ]);
    expect(segments('Try `npm test`')).toEqual([
      { kind: 'text', text: 'Try ' },
      { kind: 'code', text: 'npm test' },
    ]);
  });

  it('passes unmarked text through whole', () => {
    expect(segments('nothing to mark')).toEqual([{ kind: 'text', text: 'nothing to mark' }]);
  });
});

describe('locale negotiation', () => {
  it('takes the base of a regional tag', () => {
    expect(parseLocale('nl-NL')).toBe('nl');
    expect(parseLocale('es-419')).toBe('es');
    expect(parseLocale('en_GB')).toBe('en');
    expect(parseLocale('fr-FR')).toBeNull();
    expect(parseLocale(null)).toBeNull();
  });

  it('walks the candidate list in order and falls back', () => {
    expect(pickLocale([null, 'fr', 'es-ES', 'nl'])).toBe('es');
    expect(pickLocale(['de', 'ja'])).toBe(DEFAULT_LOCALE);
  });
});
