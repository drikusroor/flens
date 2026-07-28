# Flens — draft game spec & build plan

Draft v0.1. Depends on [`research.md`](./research.md). Everything marked **[?]** is a
decision waiting on the user; everything else is a proposed default I'd build unless told
otherwise.

---

## 1. Canonical ruleset ("Flens v1")

One concrete ruleset, chosen from the variants in `research.md`, so the engine has
something to implement. Variants stay configurable.

### Components

- **Deck:** 8 series of **1–15** = **120 cards**. **[?]** (1–16 is the historical
  alternative.)
- **Players:** 2–6.

### Setup

Per player:

- **Flensstok** — 10 cards face down; top card face up. *This is what you race to empty.*
- **Hand** — 5 cards, private.
- **Open stapels** — 4 empty personal discard piles, top card visible to everyone. **[?]**
  (count is not attested; 4 is the Skip-Bo convention.)

Shared:

- **Voorraad** — remaining cards, dealt out in packets of 5 on request.
- **Midden** — up to 4 centre build piles, each running 1 → 15. A completed run is
  cleared and its cards return to the bottom of the voorraad.

### Turn

1. Refill hand to 5 at the start of your turn.
2. Play as many cards as you like/can to the centre, from **hand**, **top of flensstok**,
   or **top of any of your own open piles**.
3. **Priority rule (`voorrang`):** if a legal centre play exists, you must make one.
   Ending your turn with a playable card is a Flens-able offence.
4. **Flensstok priority:** if the flensstok top card is legally playable to the centre,
   it must be played before an equivalent card from hand.
5. If hand empties mid-turn, take a fresh packet of 5 and keep going.
6. End the turn by discarding **one** card from hand onto one of your own open piles.
7. Play passes clockwise.

### Winning

First player to empty their **flensstok** wins. **[?]** (alternative: get rid of all
cards.)

### The Flens call

Recommended: **option C, hybrid** (from `research.md` §4).

- The engine refuses **impossible** actions (a card you don't hold, a pile that doesn't
  exist) — these are UI bugs, not gameplay.
- The engine **permits and records** *judgement* errors:
  - playing an out-of-sequence card onto a centre pile,
  - ending a turn while a legal centre play existed (priority violation),
  - discarding from the flensstok instead of hand, etc.
- Any other player may press **FLENS!** while the error is still the most recent
  unresolved one.
  - **First valid caller wins** — resolved server-side by receipt order, with a short
    grace window so latency doesn't decide it. **[?]**
  - **Reward:** the caller hands their largest open pile to the offender, who must
    absorb it under their own. **[?]** (matches "give your open pile to the offender")
  - **False call penalty:** the caller draws 2 cards onto their own flensstok. **[?]**
    (not attested; needed to stop spam.)
- A **Flens window** of ~5s **[?]** after each error, after which it goes unpunished.
- On completing a 1→15 run the completing player may shout **PANKOUK!** — cosmetic,
  a celebration, no mechanical effect.

### Clock

Per-turn timer (default 30s **[?]**). Without one the observation game disappears.

---

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
  web/           React + Vite. Plain website + lobby + room codes.
  discord/       Thin wrapper: @discord/embedded-app-sdk auth, then mounts apps/web.
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

1. **`packages/engine` + tests.** No UI at all. The rules are the risky part — they're
   reconstructed from oral tradition and will change once the user's family variant is
   confirmed. Pin them down in code with tests while they're cheap to change.
2. **Local hot-seat web UI** on top of the engine. Fastest way to *feel* whether the
   ruleset is actually fun, especially the Flens window.
3. **Server + sockets + room codes.** Real multiplayer on the open web.
4. **Bots** for single-player.
5. **Discord Activity wrapper.** Now it's mostly registration, OAuth and a manifest.

Rationale for not starting with Discord: an Activity needs an app registration, only runs
inside a voice channel, and is fiddly to iterate on and to test with real people. It's a
distribution channel for a game that must already exist. Doing it last costs almost
nothing extra; doing it first blocks everything on setup.

---

## 4. Decisions needed before step 1

See `research.md` → Open questions. The three that actually change the code:

1. **Flens mechanic: A, B or C?** Determines whether the engine is a validator or a
   recorder — the single most structural choice here.
2. **Turn-based (with clock) or simultaneous free-for-all?** Changes the entire
   networking model.
3. **The user's family variant** — deck range, pile counts, win condition. The user is a
   better primary source than anything online.
