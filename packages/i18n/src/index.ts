/**
 * Every word the game says, in every language it speaks.
 *
 * Nothing here touches the DOM, the network or the clock, so the engine and the
 * server can depend on it: they describe events as `Message` values and never
 * pick words at all. Only the client, which knows who is looking, renders them.
 */

export type { Entry } from './entry.js';
export { message, type Message, type ParamValue, type Params } from './message.js';
export type { Catalogue, Keys, MessageKey } from './catalogue/types.js';
export { en } from './catalogue/en.js';
export { nl } from './catalogue/nl.js';
export { es } from './catalogue/es.js';
export {
  CATALOGUES,
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  parseLocale,
  pickLocale,
  type Locale,
  type LocaleInfo,
} from './locales.js';
export { render, segments, translate, type Segment } from './format.js';
