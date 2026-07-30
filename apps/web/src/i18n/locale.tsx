/**
 * The client side of `@flens/i18n`: which language this browser is reading in,
 * and how a component asks for words.
 *
 * The engine and the server never choose words — they hand over `Message`
 * values. This is where that choice finally happens, once, at the edge, which is
 * why an online table can be read in three languages at the same time.
 */

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALES,
  pickLocale,
  render,
  segments,
  translate,
  type Locale,
  type Message,
  type MessageKey,
  type Params,
} from '@flens/i18n';

const STORAGE_KEY = 'flens.locale';

export interface Localiser {
  readonly locale: Locale;
  /** One line, by key. */
  readonly t: (key: MessageKey, params?: Params) => string;
  /** Anything the engine, the server or a lesson described. */
  readonly say: (message: Message) => string;
  readonly setLocale: (locale: Locale) => void;
}

/**
 * Outside a provider — a stray render, a test — English still works. A missing
 * context should never be the reason a component cannot draw itself.
 */
const FALLBACK: Localiser = {
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
  say: (message) => render(DEFAULT_LOCALE, message),
  setLocale: () => {},
};

const LocaleContext = createContext<Localiser>(FALLBACK);

export function useT(): Localiser {
  return useContext(LocaleContext);
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * A stored choice wins; otherwise the browser's own preference order decides, so
 * a Dutch browser opens a Dutch game without anyone touching a menu.
 */
function initialLocale(): Locale {
  const fromBrowser =
    typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language];
  return pickLocale([readStored(), ...fromBrowser]);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A private window that refuses storage still gets to change language.
    }
  }, []);

  // `lang` on the document is not decoration: it is what tells a screen reader
  // which language to pronounce, and the browser which hyphenation to use.
  useEffect(() => {
    const info = LOCALES.find((candidate) => candidate.code === locale);
    if (info) document.documentElement.lang = info.htmlLang;
  }, [locale]);

  const value = useMemo<Localiser>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      say: (message) => render(locale, message),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Turns the catalogue's inline marks into elements.
 *
 * The alternative — splitting a sentence into three keys so the middle one can
 * be bold — forces every translator to keep the English word order. This way
 * they can put the emphasis where their own language wants it.
 */
export function rich(text: string): ReactNode {
  return segments(text).map((segment, index) => {
    switch (segment.kind) {
      case 'emphasis':
        return <strong key={index}>{segment.text}</strong>;
      case 'code':
        return <code key={index}>{segment.text}</code>;
      case 'text':
        return <Fragment key={index}>{segment.text}</Fragment>;
    }
  });
}

/** A line of catalogue text, with its emphasis and code marked up. */
export function T({ k, params }: { k: MessageKey; params?: Params }) {
  const { t } = useT();
  return <>{rich(t(k, params))}</>;
}

/** The switcher. `compact` drops the visible label, for the table header. */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useT();

  return (
    <label className={compact ? 'lang lang--compact' : 'lang'}>
      {!compact && <span className="lang__label">{t('language.label')}</span>}
      <select
        value={locale}
        aria-label={t('language.label')}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {LOCALES.map((info) => (
          <option key={info.code} value={info.code}>
            {t(info.nameKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
