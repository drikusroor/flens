# flens

A digital version of **Flens** — a traditional Dutch (mostly Groninger) family card game,
also known as *Flintjen*, *Flenzen*, *Pankouk*, *Pang* or *Perry's spel*. It descends
from **Perry's Spel van 16** (Perry & Co, ≥1913) and is a close cousin of Skip-Bo.

Planned: a web version with real-time multiplayer, a Discord Activity, and bots for
single-player.

## Status

Rules engine done and tested. No UI yet.

- [`docs/research.md`](docs/research.md) — what the game is, where it comes from, what the
  rules actually are, and which parts are uncertain.
- [`docs/spec-draft.md`](docs/spec-draft.md) — the canonical ruleset, architecture, build
  order, and the two rules that had to be invented to make the game terminate.

## Packages

| Path | What |
|---|---|
| [`packages/engine`](packages/engine) | Pure, deterministic rules engine. No I/O. `reduce(state, action)`. |

```bash
npm install
npm test
```
