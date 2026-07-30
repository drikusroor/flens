/**
 * What one line of a catalogue may look like.
 *
 * A plain string covers almost everything. The pair is for lines that count
 * something: English, Dutch and Spanish all have exactly two plural categories
 * in CLDR, so `one` / `other` is enough for the three languages this game
 * speaks — a fourth would need a real plural-rule table.
 */
export type Entry = string | { readonly one: string; readonly other: string };
