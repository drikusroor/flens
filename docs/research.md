# Flens — research notes

Research into the traditional Dutch (mainly Groninger) family card game the user knows
as **Flens**, ahead of building a digital version.

Status: **first pass**. Several primary sources could not be fetched directly from this
environment (the network policy blocked `rtvnoord.nl`, `forum.viva.nl`,
`collectie.groningermuseum.nl`, `euroquis.nl` and others — only search-engine summaries
of those pages were available). Everything below is marked with how well it is attested.
See [Open questions](#open-questions).

---

## 1. The game has many names

The RTV Noord article that kicked this off ("Flintjen is Flensen, Pangen, Pankouk of
Perry's spel — of allemaal…") exists precisely because the game has no settled name. It
is a piece of oral tradition: every family and village learned it slightly differently,
usually from home-made components.

Attested names:

| Name | Where / note |
|---|---|
| **Flens**, **Flensen**, **Flenzen** | The most common name; what the user knows it as |
| **Flintjen** | Groningen dialect diminutive |
| **Pankouk** / **Pannenkoek** | Groninger for "pancake" |
| **Pang** / **Pangen** | Also the name shouted on catching an error |
| **Perry's spel** | After the commercial ancestor, see §2 |

The food names are not a coincidence. *Flensje* is a thin Dutch pancake, and the round
numbered felt/cardboard discs people played with look like little pancakes stacked on a
plate. One origin story collected by RTV Noord (from a reader, Fraukje) is that the game
was what **father played with the kids to keep them occupied while mother was cooking or
baking flensjes** — which would explain the name attaching to the game.

## 2. Ancestry: Perry's Spel van 16 (≥1913)

Hans Bol from Zuidhorn, quoted in the RTV Noord piece, traces Flintjen / Flenzen /
Pankouk back to **Perry's Spel van 16**, sold by *Perry & Co* from at least **1913**
(later printings into the 1930s–40s; copies are in the Groninger Museum and Stedelijk
Museum Zutphen collections, and it turns up on LastDodo and Catawiki).

Components: **96 numbered discs, 6 series of 1–16, each series a different colour.** One
box served 3 players; more players meant more boxes.

**Important:** the *original printed rules* of Perry's Spel van 16 describe a
**caller/lotto game**, not the shedding game:

> One player acts as caller, shuffles their numbers, lays them face down and turns them
> over one at a time, calling out each number. The other players have their numbers in
> front of them in 16 piles (six 1s, six 2s, …). They take the called numbers and lay
> them in rows in front of them, except the 1s which are set aside separately. The object
> is to place each subsequent number onto those 1s as it is called, rebuilding complete
> 1→16 runs.

So the historical line looks like:

```
Perry's Spel van 16 (1913, caller/lotto game, 6×16 discs)
        │  components outlive the printed rules;
        │  families invent their own game with them
        ▼
Flens / Flintjen / Pankouk / Pang  (a shedding + sequence-building race)
        │  same family of mechanics as
        ▼
Skip-Bo, Spite & Malice, Rummikub  (commonly cited as descendants/cousins)
```

Several sources call Flens a forerunner of **Rummikub** or **Skip-Bo**. Mechanically the
closest modern commercial relative is clearly **Skip-Bo / Spite and Malice**: a personal
stock pile you race to empty, a small hand, personal discard piles, and shared ascending
build piles in the centre.

The other thing every source agrees on: **you can make it yourself**. Paper, cardboard,
beer mats or wood plus a marker. That is why the rules drifted so much — there was never
a rulebook in the box.

## 3. Reconstructed rules

Two clusters of rules show up in the sources. They are almost certainly the same game
described at different levels of detail, so this section separates what is attested from
what is inferred.

### 3.1 The "Pang" description (most detailed, well attested)

Found on Dutch game-rule sites and forum threads:

- **Deck:** 8 series of **1–15** → 120 cards. (Perry's original was 6 × 1–16.)
- **Setup, per player:**
  - **10 cards** face down as the **pangstok** (the stock / payoff pile); the top card is
    turned face up.
  - **5 cards** to hand.
  - The remaining cards are split into **packets of 5**, stacked crosswise, forming the
    draw supply. When a player empties their hand they ask for a fresh packet of 5.
- **Centre:** shared build piles. A pile starts with a **1** and is built up
  **2, 3, 4 … 15**. A completed 1→15 run is finished and cleared.
- **Turn:**
  - You may play cards from **hand**, from the top of your **pangstok**, and from your
    own **discard piles**.
  - **The centre has priority** — if you can play to the centre you must
    ("de stapel in het midden heeft voorrang").
  - Attested stronger version: *you must play from your pangstok if you can*; only then
    from your face-down/hand cards. This is what makes the game a race rather than a
    hoarding exercise.
  - Secondary destination (variant): an **opponent's discard pile**, if your card is
    exactly one higher or lower than its top card.
  - If you can play nowhere, you **discard one card onto your own discard pile** and your
    turn ends.
- **Winning:** the first player to empty their **pangstok** wins. (In the looser "Flens"
  phrasing: the first to get rid of all their cards.)

### 3.2 The "Flens" call — the social heart of the game

This is the part everyone remembers and the part that makes the game *this* game rather
than home-made Skip-Bo:

> *"If a player makes a mistake by not laying their card in the correct sequence, the
> other players may call **'Flens!'** — and the player who reports the error first may
> give their open pile to the player who made the mistake."*

The Pang wording of the same rule:

> *"If you make a rule error, the other players may call **'PANG'**. The first player to
> call it may place their discard pile **under** the discard pile of the player who made
> the mistake."*

And on completing a run:

> *"When you had a stack complete you shouted **'Pankouk!'**"*

Three things follow from this, and they matter a lot for the digital design:

1. **Illegal moves are part of the game.** The rules do not prevent a bad play; they
   *punish* it, and only if somebody notices. There is no referee.
2. **It is a game of attention, not just tactics.** The penalty is real — you absorb
   another player's whole discard pile, which sets you back badly.
3. **It rewards speed of observation**, which implies at least some real-time pressure
   even if the underlying game is turn-based.

Also attested: cards must be laid **face up / number visible** on the open pile,
specifically *so that other players can build on it and can see what you did*.

### 3.3 What is genuinely uncertain

- **1–15 or 1–16?** Perry's original is 16. The Pang description says 15. Family variants
  likely differ.
- **Turn-based or simultaneous?** The detailed Pang description is clearly turn-based.
  The "Flens!" catching mechanic and the emphasis on speed hint that some families played
  it as a free-for-all where everybody plays at once. Sources acknowledge both framings
  but do not settle it.
- **How many discard piles per player?** Not stated in any source found. Skip-Bo uses 4.
- **Exact penalty.** "Give your open pile to the offender" and "put your discard pile
  under theirs" are the same idea (offload your cards onto the person who erred), but the
  bookkeeping differs.
- **What happens on a false Flens call?** No source mentions a penalty for calling wrong.
  Almost certainly needed in a digital version to stop spam-clicking.

## 4. Implications for a digital version

The single biggest design decision falls out of §3.2:

> **A computer will never let you make an illegal move — which deletes the Flens mechanic
> entirely.**

If the server validates every move, nobody ever errs, nobody ever calls "Flens!", and the
game collapses into a competent but ordinary Skip-Bo clone. Options:

| Option | How it works | Trade-off |
|---|---|---|
| **A — Strict engine** | Server rejects illegal moves. No Flens call. | Faithful to the *tactics*, loses the *soul*. Easiest to build. |
| **B — Permissive engine** | Client lets you drop a card anywhere plausible. Illegal plays land and stay until someone hits the **FLENS!** button. Wrong calls cost you. | Faithful to the real game. Needs a lag-fair "who called first" resolution and a false-call penalty. |
| **C — Hybrid** | Engine blocks nonsense (playing a card you don't have) but allows *sequence* errors — off-by-one on a build pile, skipping the priority rule. | Probably the sweet spot: preserves the mechanic, prevents griefing. |

Other consequences worth writing down now:

- **The priority rule is a trap for the honest.** "You must play to the centre if you
  can" means *failing to notice a legal move is itself a Flens-able offence*. This is
  likely the most common real-world Flens call and is very cheap to detect server-side —
  which makes option C attractive.
- **Real-time pressure needs a clock.** If play is strictly turn-based with no timer, the
  attention game evaporates. Either a per-turn timer or genuine simultaneous play.
- **Single-player AI is easy to make strong and hard to make fun.** A bot with perfect
  rule-following never errs, so it never gets Flensed, and it can Flens the human
  instantly. Difficulty tiers should be implemented as *observation latency and error
  rate*, not just lookahead depth — an easy bot should make mistakes and be slow to spot
  yours.

## 5. Sources

- [Flintjen is Flensen, Pangen, Pankouk of Perry's spel of allemaal… — RTV Noord](https://www.rtvnoord.nl/nieuws/863620/flintjen-is-flensen-pangen-pankouk-of-perrys-spel-of-allemaal)
  (the article that prompted this; blocked from direct fetch, read via search summaries)
- [kaartspel pang — Viva Forum](https://forum.viva.nl/thuis/kaartspel-pang/list_messages/84899)
- [Het kaartspel Pang — Bordspelmania](https://www.bordspelmania.eu/bordspellen-algemeen/topic19767.html)
- [Spellenlijst — Pang](http://web.inter.nl.net/users/devries/spellen/pang.htm)
- [Perry's spel van 16 — Groninger Museum Collectie](https://collectie.groningermuseum.nl/collectie-items/37877)
- [Perry's spel van 16 — Stedelijk Museum Zutphen / Collectie Gelderland](https://www.collectiegelderland.nl/museazutphen/object/2ad30333-40b0-6cc9-4618-d4ba88959a5c)
- [Perry's Spel van 16 — \[bobulate\] blog (original rules transcribed)](https://euroquis.nl/blabla/2022/10/09/perry.html)
- [Perry's spel van 16 (1913) — LastDodo](https://www.lastdodo.nl/nl/items/569435-perry-s-spel-van-16)
- [Perry's 16 — Android app](https://play.google.com/store/apps/details?id=nl.kelleyvanevert.perry16)
- [Skip-Bo spelregels — partyspellen.nl](https://partyspellen.nl/2026/02/12/skip-bo-spelregels/) (closest modern relative)

## Open questions

1. Does the user's family variant match §3.1? (deck 1–15 vs 1–16, stock size, hand size,
   number of discard piles, win condition)
2. Turn-based or everyone-at-once?
3. Which of options A / B / C in §4 for the Flens mechanic?
4. Was there a penalty for a wrong "Flens!" call?
5. Did the user's group shout "Pankouk!" on completing a run, or only "Flens!"?

If the primary sources become reachable later, re-fetch the RTV Noord article and the
bobulate transcription of Perry's original rules — both would sharpen §2 and §3.
