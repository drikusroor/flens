# flens

A digital version of **Flens** — a traditional Dutch (mostly Groninger) family card game,
also known as *Flintjen*, *Flenzen*, *Pankouk*, *Pang* or *Perry's spel*. It descends
from **Perry's Spel van 16** (Perry & Co, ≥1913) and is a close cousin of Skip-Bo.

Planned: a web version with real-time multiplayer, a Discord Activity, and bots for
single-player.

## Status

Playable single-player prototype: one human against bots, in the browser.
No networking yet.

```bash
npm install
npm test
npm run dev --workspace @flens/web   # http://localhost:5173
```

- [`docs/research.md`](docs/research.md) — what the game is, where it comes from, what the
  rules actually are, and which parts are uncertain.
- [`docs/spec-draft.md`](docs/spec-draft.md) — the canonical ruleset, architecture, build
  order, and the two rules that had to be invented to make the game terminate.

## Packages

| Path | What |
|---|---|
| [`packages/engine`](packages/engine) | Pure, deterministic rules engine. No I/O. `reduce(state, action)`. |
| [`packages/bot`](packages/bot) | Opponent policy. Difficulty is error rate and reaction time, not search depth. |
| [`apps/web`](apps/web) | React prototype. Hot-seat against bots, real-time Flens window. |

## How it plays

Click a card (hand, flensstok top, or one of your open piles), then click a centre
pile to play it there. Click one of your own open piles with a hand card selected to
discard and end your turn.

The **FLENS!** button is always live and nothing tells you when to press it — spotting
the mistake is the game. A wrong call costs you two cards. Turn on *"show me the
mistakes"* in setup if you want the countdown while learning.
