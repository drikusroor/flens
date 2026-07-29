# Running Flens as a Discord Activity

An Activity is your website, in an iframe, inside Discord. There is no separate
Discord build and no second copy of the game: `apps/web` detects the context and
behaves differently. Three things change inside Discord:

| | Website | Activity |
|---|---|---|
| Who you are | a name you type | your Discord account |
| Finding each other | a four-letter room code | automatic — same voice channel, same table |
| Network | direct to the server | everything through Discord's `/.proxy` |

Detection is `frame_id` + `instance_id` in the iframe URL (`isRunningInDiscord()`).
Ordinary visitors never even load the SDK — the import is lazy.

**Status: the code is written and tested, the Developer Portal side has not been
done.** Everything under "Deploy" has been exercised locally: the server serves
the client, the socket answers on both `/ws` and `/.proxy/ws`, the token
endpoint fails loudly when unconfigured. What has never run is the part that can
only run inside Discord — the SDK handshake against a real application. Treat
the first launch as a debugging session.

## The shape of the deployment

One host does everything:

```
                    ┌─────────────────────────────┐
  Discord iframe    │  flens.fly.dev              │
  <id>.discordsays  │                             │
        .com   ─────▶  /            web bundle    │
                    │  /ws          game socket   │
                    │  /api/…       token exchange│
                    └─────────────────────────────┘
```

`apps/server` serves the built client as static files (`WEB_DIR`), so there is
one origin, one TLS certificate, one URL mapping and no CORS. The alternative —
client on Pages, server elsewhere — needs three mappings and is markedly more
fiddly to get right. The GitHub Pages deployment still exists, but it is the
single-player-only build (`docs/deploy.md`); it cannot host the Activity,
because the Activity needs a server.

---

## Part 1 — Deploy (do this first)

Discord will not load an Activity that is not already live over HTTPS, so the
host has to exist before the portal steps make sense.

```bash
fly launch --no-deploy --copy-config     # keeps the fly.toml in this repo
fly deploy --build-arg VITE_DISCORD_CLIENT_ID=<client id from Part 2, step 1>
```

Then check it:

```bash
curl https://<your-app>.fly.dev/health          # {"ok":true,"rooms":0}
open  https://<your-app>.fly.dev                # the normal game, online play working
```

Any host that runs a container and terminates TLS does just as well — Railway,
Render, a VPS behind Caddy. The requirements are only: **HTTPS**, **WebSocket
support**, and **one instance**. Rooms live in process memory, so two instances
behind a load balancer means two players launching the same Activity land on
different servers and never see each other.

`VITE_DISCORD_CLIENT_ID` is a *build* argument because Vite substitutes it into
the bundle statically. The client id is public — it is in every OAuth URL — so
baking it in is fine. The **client secret is not** and never goes in the image;
it is set as a runtime secret in Part 3.

---

## Part 2 — The Discord Developer Portal (all manual)

At <https://discord.com/developers/applications>. This is the part nothing in
the repo can do for you.

### 1. Create the application

**New Application** → name it *Flens* → accept the terms.

Under **OAuth2**, copy:

- **Client ID** — public, goes in the build (`VITE_DISCORD_CLIENT_ID`).
- **Client Secret** — **Reset Secret** to reveal it. Server-only. If it ever
  appears in a bundle, a commit or a screenshot, reset it again.

Under **General Information**, give it an icon and a description. These are what
people see in the activity picker, and some of the portal's later screens
refuse to save without them.

### 2. Enable Activities

**Activities → Settings** in the left nav → turn on **Enable Activities**.

While you are there, fill in the supported platforms (**Web** and **Desktop** at
minimum — mobile is a separate question, see "Known gaps") and the age rating.
The portal gates the URL-mapping screen behind this being switched on.

### 3. URL mappings

**Activities → URL Mappings**. One row:

| Prefix | Target |
|---|---|
| `/` | `your-app.fly.dev` |

Hostname only — **no `https://`, no trailing slash, no path**. That single root
mapping covers the bundle, the socket and the token endpoint, because they are
all on that host.

Discord serves the iframe from `https://<client-id>.discordsays.com` and proxies
everything through it. Requests the client makes are prefixed with `/.proxy`;
whether Discord strips that prefix before forwarding has changed between SDK
versions, so **the server accepts both** — `/ws` and `/.proxy/ws` resolve to the
same place, as do `/health` and `/.proxy/health`. That is deliberate insurance
against the one failure mode that produces a blank screen and no useful error.

### 4. Install the app to your test server

**Installation** in the left nav:

- Set **Install Link** to *Discord Provided Link*.
- Under **Default Install Settings**, give the guild install the
  `applications.commands` scope (`bot` is not needed — Flens has no bot user).
- Copy the install link, open it, and add the app to a server you administer.

An Activity is launched from a voice channel in a guild that has the app
installed. Without this step there is nothing to launch.

### 5. Let other people see it

An unpublished Activity is visible only to you and to accounts you have added
as testers. Look for **App Testers** (under the application, or under your team
if the app is team-owned) and add the Discord accounts you plan to test with. If
a friend is in the voice channel and simply does not see Flens in the activity
picker, this is almost always why.

Getting it listed publicly in Discord's activity shelf is a separate review
process and is not needed for playing with friends.

### 6. Turn on Developer Mode in the Discord client

**User Settings → Advanced → Developer Mode.** This is what lets you right-click
the running Activity and open devtools, which you will want on the first launch.

---

## Part 3 — Wire the secret into the server

```bash
fly secrets set DISCORD_CLIENT_ID=<client id> DISCORD_CLIENT_SECRET=<client secret>
```

The browser sends Discord's one-time `code` to `POST /api/discord/token` and the
server exchanges it, because Discord will not issue a token without the secret
and the secret must not reach the browser.

Without those two variables the endpoint answers `501` with a message saying
exactly that, rather than failing obscurely. Curl it after deploying:

```bash
curl -X POST https://<your-app>.fly.dev/api/discord/token -d '{}'
# {"error":"missing code"}                                          ← configured
# {"error":"DISCORD_CLIENT_ID and ... are not set on the server"}   ← not yet
```

---

## Part 4 — Launch it

1. Join a voice channel in the server you installed the app to.
2. Open the activity picker (the rocket / controller icon in the voice
   controls).
3. Pick **Flens**. Unpublished apps are usually grouped separately from the
   featured ones.

What should then happen:

1. `ready()` → `authorize()` (scope `identify`) → server-side token exchange →
   `authenticate()`.
2. The client sends `joinInstance` with `sdk.instanceId`.
3. The server maps that instance id to a room, creating it on first arrival.
   Everyone else who launches the same Activity lands in the same room.
4. The first person to arrive is host and starts the game; bots can fill seats.

Because the room is keyed on the instance id and not on a code, nobody types
anything.

---

## Debugging the first run

Roughly in order of how often each one is the answer:

| Symptom | First suspect |
|---|---|
| Blank iframe, nothing at all | URL mapping target wrong, or the host is not up — `curl https://host/health` |
| "VITE_DISCORD_CLIENT_ID is not set in this build" | Deployed without `--build-arg`; it is baked in at build time, not read at runtime |
| Handshake error naming the token exchange | `DISCORD_CLIENT_SECRET` missing or stale on the server |
| Sits on "Connecting to Discord…" forever | The socket. Check devtools' network tab for the `/ws` upgrade; a host that does not forward WebSocket upgrades fails exactly like this |
| Works for you, invisible to friends | App Testers (Part 2 step 5) |
| Everyone gets their own table | Two server instances. Scale to one |

A failed handshake renders the actual error on screen rather than a spinner, so
read the iframe before reaching for devtools.

`GET /health` reports how many rooms exist — the quickest way to tell whether a
launch reached the server at all.

## Known gaps

These are real, and none of them is fixed:

- **Nobody can join once a game is under way.** A late arrival gets "that game
  has already started". In a voice channel — where people drift in — this is the
  most visible gap. Spectating is not implemented either.
- **Rooms are in memory.** A deploy or a restart ends every game in progress.
- **One instance only.** There is no shared room store, so the server cannot be
  scaled horizontally without players being split across machines.
- **Mobile is untested.** The layout has never been seen in the mobile Activity
  viewport, and Discord treats mobile support as a separate declaration.
- **Nothing is shown in the channel.** No rich presence, no "X won" message.
- **The instance mapping is cleaned up when the room is swept**, so relaunching
  a finished Activity gives a fresh table. That much is tested.
- **No hint mode online**, deliberately — see `spec-draft.md` §6. The server
  never reveals an infraction to anyone, so spotting mistakes stays the game.
