# Flens — draft game spec & build plan

Draft v0.2. Depends on [`research.md`](./research.md). Everything marked **[?]** is a
decision waiting on the user; everything else is a proposed default I'd build unless told
otherwise.

**Decisions taken** (see §1): hybrid Flens model, turn-based with a ~6s Flens window,
`topValue` configurable and defaulting to 16. The ruleset in §1 is implemented in
`packages/engine`; §5 records two rules that had to be invented to make it terminate.

---

## 1. Canonical ruleset ("Flens v1")

Implemented in `packages/engine`. Every variant the sources disagree about is a config
knob (`FlensConfig`), so changing your mind is a one-line edit plus a test run.

### Components

- **Deck:** `seriesCount` × 1..`topValue`. Default **8 × 1–16 = 128 cards**.
  Perry's original was 1–16; the "Pang" write-ups say 1–15. Both play fine.
- **Players:** 2–6.

### Setup

Per player:

- **Flensstok** — 10 cards face down, top card face up. *This is what you race to empty.*
- **Hand** — 5 cards, private.
- **Open stapels** — 4 personal discard piles, tops visible to everyone. **[?]** (count is
  not attested; 4 is the Skip-Bo convention.)

Shared:

- **Voorraad** — the rest of the deck, handed out in packets of 5.
- **Midden** — 4 centre build piles, each running 1 → `topValue`. A completed run is
  cleared out and recycled.

### Turn

1. Play as many cards as you can/like to the centre, from **hand**, **top of flensstok**,
   or **top of any of your own open piles**.
2. **Priority rule (`voorrang`):** if a legal centre play exists, you must make one.
   Ending your turn with a playable card is a Flens-able offence.
3. **Flensstok priority:** a playable flensstok top must go before an equivalent hand card.
4. **Refill:** when your hand is completely empty you take a fresh packet of 5 — including
   mid-turn, and you keep playing. (`refill: 'whenEmpty'`, the traditional packet rule.
   `'everyTurn'` gives the Skip-Bo top-up instead.)
5. End the turn by discarding **one** card from hand onto one of your own open piles.
6. Play passes clockwise.

Once the supply is exhausted a player with an empty hand and nothing playable may **pass**.
A full round of passes is a draw.

### Winning

First player to empty their **flensstok**. (`winCondition: 'allCards'` switches to shedding
everything.)

### The Flens call — hybrid model

- **Impossible** actions are rejected outright: a card you don't hold, a pile that doesn't
  exist, acting out of turn. These are UI bugs or cheating, never gameplay.
- **Judgement** errors are *allowed to land* and recorded as an `Infraction`:
  - `outOfSequence` — a card that doesn't continue the pile,
  - `missedCentrePlay` — ending your turn with a legal play available,
  - `ignoredFlensstok` — playing from hand when the flensstok top was equally playable.
- Any other player may hit **FLENS!** during a **6 second window**. First valid caller wins.
  - **Caught:** an out-of-sequence card comes back off the pile, and the caller's largest
    open pile is dumped *underneath* the offender's deepest pile — burying what they were
    about to play.
  - **Uncaught:** the error **stands** and the pile continues from the wrong value. You got
    away with it. (`uncaughtErrorsStand: false` reverts instead.)
  - **False call:** 2 cards onto your own flensstok. **[?]** Not attested, but without a
    cost everyone just mashes the button.
- Completing a run is worth a **PANKOUK!** — cosmetic only.

### Clock

Turn-based. The Flens window (6s) is where the time pressure actually lives; the per-turn
timer (45s, `null` to disable) only exists to stop someone stalling.

## 2. Architecture

The Discord version and the website are the **same web app**. A Discord Activity is an
iframe running your site inside Discord, via the Embedded App SDK. So building web-first
is not throwaway work — it is a prerequisite.

```
packages/
  engine/        pure TS. No I/O, no network, no randomness except an injected seed.
                 reduce(state, action) -> state | error. Fully unit-testable, replayable.
  bot/           AI policy: (visibleState) -> action. Depends only on engine types.
apps/
  server/        Node + WebSocket. Authoritative. Owns the deck, the RNG seed, and
                 the per-player view filtering (you must not be able to sniff hidden cards).
  web/           React + Vite. Plain website, lobby, room codes — and the Discord
                 Activity, which is the same app detecting an iframe rather than a
                 separate build. The SDK is lazily imported so web visitors never
                 download it. Also builds offline-only for static hosting.
```

Key properties to get right early:

- **Server-authoritative state, per-player views.** Never ship the full state to clients —
  the whole game is about hidden information.
- **Deterministic seeded engine.** Makes replays, bug reports and AI self-play trivial.
- **Actions, not state diffs, over the wire.** Small messages, and the client can predict.
- **The bot is a client.** Single-player = one human + N bots against the same engine, in
  the same server process. No second code path.

### AI

Difficulty is *not* search depth. It's:

| Level | Error rate | Flens-spotting latency | Lookahead |
|---|---|---|---|
| Easy | makes sequence errors often | 3–5s, often misses | greedy |
| Normal | occasional priority slips | ~1.5s | 1-ply |
| Hard | near-perfect | ~0.4s | heuristic multi-ply |

A bot that never errs and always Flenses instantly is miserable to play against.

---

## 3. What to build first — recommendation

**Web first, Discord second.** Concretely:

1. ~~**`packages/engine` + tests.**~~ **Done.** No UI at all. The rules were the risky
   part — reconstructed from oral tradition, and two of them turned out not to terminate
   (§5). Far cheaper to discover that in a test run than in a UI.
2. ~~**Local hot-seat web UI**~~ **Done** — plus `packages/bot`, because the Flens
   window cannot be tested without opponents who make mistakes.
3. ~~**Server + sockets + room codes.**~~ **Done.** `apps/server` is authoritative:
   clients send intent, never state, and the seat comes from a connection token
   rather than from the message. Views are redacted per seat, and the clock is
   extrapolated client-side so a bare heartbeat never costs a message.
4. ~~**Bots** for single-player.~~ **Done** (basic; difficulty = error rate and reaction
   time). Worth deepening once the ruleset is settled.
5. ~~**Discord Activity.**~~ **Implemented, unverified** — see `docs/discord.md`. It
   turned out *not* to want a separate `apps/discord`: an Activity is this same web app
   in an iframe, so `apps/web` detects the context instead. A second app would have
   meant a second copy of everything for no gain.
6. ~~**Static single-player build** for GitHub Pages~~ **Done** — see `docs/deploy.md`.
   Free, needs no hosting, and is the easiest thing to hand someone who just wants to
   try it.
7. ~~**Interactive tutorial.**~~ **Done** — see §7. Not originally on this list; it
   became obvious once the game was playable that nobody outside the one family that
   still plays it can be handed a Flens table cold.

Rationale for not starting with Discord: an Activity needs an app registration, only runs
inside a voice channel, and is fiddly to iterate on and to test with real people. It's a
distribution channel for a game that must already exist. Doing it last costs almost
nothing extra; doing it first blocks everything on setup.

---

## 4. Still open

Answered so far: hybrid Flens model, turn-based, `topValue` kept flexible (default 16).

Still worth checking against the user's memory — all cheap to change:

1. **Open piles per player** — 4 is a guess borrowed from Skip-Bo.
2. **Win condition** — empty the flensstok, or shed everything?
3. **False-call penalty** — did their family punish a wrong "Flens!" at all?
4. **Deck running out** — was there a rule for it? See §5.
5. **"Pankouk!"** — did they shout it, or only "Flens!"?

## 5. Rules that had to be invented

Playing thousands of bot-vs-bot games surfaced two ways the reconstructed ruleset fails to
terminate. Neither is attested in any source; both are config flags, defaulting on.

### `recycleBuriedCards` — stops the supply dying

Cards return to the supply only when a full 1→topValue run completes. Everything else
drains steadily into open piles and stays there. Result: the voorraad empties while runs
are still half-built, players run out of cards to draw, and the game grinds to a halt.
**Roughly 22% of two-player games ended in a draw.**

The fix: when the supply *and* the completed runs are both exhausted, take every buried
card (anything below a visible pile top — unreachable by anyone, by definition) and shuffle
it back into the supply. Draw rate drops to ~0.

Worth asking the user: did their family have a rule for the deck running out?

### `idleTurnsBeforeStalemate` — stops the engine hanging

A rarer, nastier failure. Only the *top* card of a flensstok is reachable, so if every
remaining `1` is buried inside a flensstok while all centre piles sit empty, no pile can
ever be started — and because hands keep refilling, nobody is ever "stuck" enough to pass.
The game livelocks forever. This is a server hazard, not just a bad game.

Two defences:

- `newGame` refuses to deal a position with no reachable `1` (it reshuffles instead).
- The engine tracks turns since the last legal centre play and calls a draw at 50.

Skip-Bo solves the same structural problem with 18 wild cards. Flens has no wilds, so it
needs a different answer.

### Current draw rate

Against a deliberately unsophisticated greedy bot, across 60 seeds per configuration:

| Table | Draws |
|---|---|
| 2 players | 0–1.7% |
| 3 players | 0–1.7% |
| 4 players | 0–1.7% |
| 6 players | 0% |

Games settle in ~200 actions. Real players should draw less often than the bot does.

---

## 6. Two things the prototype taught us

### Telling the client about an infraction destroys the game

`viewFor` originally handed the open infraction straight to every seat, so the UI could
light up the FLENS! button and run a countdown. That is a complete giveaway: a client
could wire the button to the flag and never look at the table again. Spotting the mistake
*is* the skill.

`viewFor` now withholds the pending infraction and filters `secret` log entries unless
`revealInfractions` is passed. The button is always live and nothing prompts you. The
prototype keeps a *"show me the mistakes"* toggle for learning and debugging, and it is
off by default.

This matters more for the server than for the prototype: the redaction has to live in the
engine, because anything the server sends is readable in a browser's network tab.

### `turnTimeoutMs` was decorative

It sat in the config doing nothing, which was discovered the moment a human sat at the
table and the game simply froze on their turn — bots only move when it is their turn, so
one idle player halts everything. It is now enforced on `tick`: a timed-out player is
discarded for (and still commits the usual `missedCentrePlay` infraction if a play was
available), or the table plays for them when their hand is empty.

---

## 7. The tutorial

Nine hands in `apps/web/src/tutorial/lessons.ts`, one click each: start a pile at 1, play
from the flensstok, the flensstok-before-hand rule, ending a turn, *voorrang*, catching an
out-of-sequence card with the countdown visible, catching a missed play without it,
Pankouk, and winning.

Three decisions worth recording.

**The tutorial plays the real game.** Each lesson is a position built with `scenario`,
reduced by the real engine and rendered by the real `Table` behind an ordinary
`TableController`. There is no second implementation of the rules, no scripted animation
of a hand being played, and nothing that can drift out of step with the game — a rule
change that breaks a lesson breaks it in `npm test`, not in front of a beginner.

**The gate answers before the engine does.** A misclick is refused with a sentence rather
than committed, because the alternative is a beginner silently committing an infraction
for a rule they have not been taught yet. The refusals *are* the teaching: clicking the
hand 7 when a 7 sits on your flensstok is how most people will first meet
`flensstokPriority`.

**One lesson lets the mistake land.** `voorrang` — the rule that ending a turn with a play
available is callable — permits the discard the lesson warns against, and the opponent
calls FLENS! on it. Their open pile ends up buried under yours and the lesson restarts.
Being told that rule and being caught by it are not the same lesson, and it is the most
common call in real play.

The countdown bar appears in exactly one lesson, and the next lesson says so and removes
it. Anything else would teach "press when the bar shows up", which is not the game (§6).
