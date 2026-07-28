# flens

A digital version of **Flens** — a traditional Dutch (mostly Groninger) family card game,
also known as *Flintjen*, *Flenzen*, *Pankouk*, *Pang* or *Perry's spel*. It descends
from **Perry's Spel van 16** (Perry & Co, ≥1913) and is a close cousin of Skip-Bo.

## Status

Playable, online. Real-time multiplayer over WebSockets with room codes, plus
single-player against bots.

Single-player also builds to a **fully static site** with no server at all — that
is what gets published to GitHub Pages.

A Discord Activity is implemented but **not yet verified**: it needs a registered
Discord application and HTTPS hosting to run at all. See
[`docs/discord.md`](docs/discord.md).

```bash
npm install
npm test

npm run dev --workspace @flens/server   # ws://localhost:8787
npm run dev --workspace @flens/web      # http://localhost:5173
```

Open the site, pick *Play online with friends*, create a room and share the
four-letter code. Refreshing mid-game reclaims your seat.

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
| [`apps/web`](apps/web) | React client. Same table for local, online and Discord play. |

## How it plays

Click a card (hand, flensstok top, or one of your open piles), then click a centre
pile to play it there. Click one of your own open piles with a hand card selected to
discard and end your turn.

The **FLENS!** button is always live and nothing tells you when to press it — spotting
the mistake is the game. A wrong call costs you two cards. Turn on *"show me the
mistakes"* in setup if you want the countdown while learning.
