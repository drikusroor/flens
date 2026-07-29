# flens

A digital version of **Flens** — a traditional Dutch (mostly Groninger) family card game,
also known as *Flintjen*, *Flenzen*, *Pankouk*, *Pang* or *Perry's spel*. It descends
from **Perry's Spel van 16** (Perry & Co, ≥1913) and is a close cousin of Skip-Bo.

## Status

Playable, online. Real-time multiplayer over WebSockets with room codes, plus
single-player against bots.

Single-player also builds to a **fully static site** with no server at all — that
is what gets published to GitHub Pages.

A Discord Activity is implemented and deployable — one container serves the
client, the socket and the OAuth token exchange, so Discord needs a single URL
mapping. It is **not yet verified**, because that can only happen against a
registered Discord application. [`docs/discord.md`](docs/discord.md) is the
runbook: deploy, then six manual steps in the Developer Portal.

```bash
npm install
npm test

npm run dev --workspace @flens/server   # ws://localhost:8787
npm run dev --workspace @flens/web      # http://localhost:5173
```

Open the site, pick *Play online with friends*, create a room and share the
four-letter code. Refreshing mid-game reclaims your seat.

For a production-shaped run — one origin, client served by the server, exactly
as it is deployed:

```bash
npm run build --workspace @flens/web
npm run start --workspace @flens/server   # http://localhost:8787
```

- [`docs/research.md`](docs/research.md) — what the game is, where it comes from, what the
  rules actually are, and which parts are uncertain.
- [`docs/spec-draft.md`](docs/spec-draft.md) — the canonical ruleset, architecture, build
  order, and the two rules that had to be invented to make the game terminate.
- [`docs/discord.md`](docs/discord.md) — setting up the Discord Activity, and what is
  still untested about it.
- [`docs/deploy.md`](docs/deploy.md) — publishing the single-player build to GitHub Pages.

## Packages

| Path | What |
|---|---|
| [`packages/engine`](packages/engine) | Pure, deterministic rules engine. No I/O. `reduce(state, action)`. |
| [`packages/bot`](packages/bot) | Opponent policy. Difficulty is error rate and reaction time, not search depth. |
| [`packages/protocol`](packages/protocol) | Wire types shared by client and server, so they cannot drift. |
| [`apps/server`](apps/server) | Authoritative WebSocket server. Rooms, seats, bots, reconnects. |
| [`apps/web`](apps/web) | React client. Same table for local, online, tutorial and Discord play. |

## How it plays

**Never played it?** *Learn to play* on the menu is a nine-hand tutorial, about five
minutes, one click each. It is the real game throughout — real engine, real table, real
rules — with the deal fixed and a coach on top, so everything you learn in it transfers
directly. One lesson deliberately lets you make the most common mistake in the game and
has the opponent catch you for it.

Click a card (hand, flensstok top, or one of your open piles), then click a centre
pile to play it there. Click one of your own open piles with a hand card selected to
discard and end your turn.

The **FLENS!** button is always live and nothing tells you when to press it — spotting
the mistake is the game. A wrong call costs you two cards. Turn on *"show me the
mistakes"* in setup if you want the countdown while learning.

## Sound and motion

Sound effects are **synthesised at runtime** with the Web Audio API — no audio files,
nothing to download, nothing to license. The **"Flens!"** outcry uses the browser's
built-in speech synthesis, preferring a Dutch voice; where the platform has no voices
the accompanying stab still lands. There is a mute toggle in the header, and it
persists.

Cards physically travel between hand, piles and centre via a FLIP layer keyed on card
identity, so a bot's move animates exactly like your own. All of it honours
`prefers-reduced-motion`.

Sound is driven off the redacted view, which is what makes it safe: infraction log
entries never reach a client, so nothing can chirp when someone errs.
