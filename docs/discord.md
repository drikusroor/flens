# Running Flens as a Discord Activity

**Status: written, not verified.** Everything here is implemented and typechecks,
and the pieces that can be tested outside Discord are tested. But an Activity can
only really be exercised from inside a Discord client, against a registered
application, over HTTPS — none of which was available while building it. Treat
the first run as a debugging session, not a deploy.

## What an Activity actually is

Your website, in an iframe, inside Discord. There is no separate Discord build
and no second copy of the game: `apps/web` detects the context and behaves
differently. Three things change inside Discord:

| | Website | Activity |
|---|---|---|
| Who you are | a name you type | your Discord account |
| Finding each other | a four-letter room code | automatic — same voice channel, same table |
| Network | direct to the server | everything through Discord's `/.proxy` |

Detection is `frame_id` + `instance_id` in the iframe URL (`isRunningInDiscord()`).
Ordinary visitors never even load the SDK — the import is lazy.

## Setup

### 1. Register the application

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. **New Application**.
2. **OAuth2** → copy the **Client ID** and generate a **Client Secret**.
3. **Activities** → **Enable Activities**.

### 2. URL mappings

**Activities** → **URL Mappings**. Discord proxies every request the iframe
makes, so each external host needs a mapping:

| Prefix | Target |
|---|---|
| `/` | wherever `apps/web` is hosted |
| `/api` | wherever `apps/server` is hosted |
| `/ws` | wherever `apps/server` is hosted |

The client then talks to `/.proxy/api/...` and `/.proxy/ws`. If your mappings
differ, override `VITE_DISCORD_TOKEN_PATH` and `VITE_DISCORD_WS_PATH` rather
than editing code. The server strips a leading `/.proxy` from request paths
defensively, so it works whether or not the proxy forwards the prefix.

### 3. Environment

Copy both `.env.example` files. The client needs:

```
VITE_DISCORD_CLIENT_ID=<client id>
```

and the server needs:

```
DISCORD_CLIENT_ID=<client id>
DISCORD_CLIENT_SECRET=<client secret>
```

**The client secret belongs only on the server.** The browser sends Discord's
one-time `code` to `POST /api/discord/token`, and the server exchanges it. If
the secret ever reaches the client bundle, rotate it.

Without those two server variables the endpoint answers `501` with a message
saying so, rather than failing obscurely.

### 4. HTTPS

Discord will not load an Activity over plain HTTP. For local development, tunnel
both the web app and the server (`cloudflared tunnel`, `ngrok`, etc.) and point
the URL mappings at the tunnel hostnames.

## How a game starts

1. Someone launches the Activity in a voice channel.
2. The SDK handshake runs: `ready()` → `authorize()` (scope `identify`) →
   server-side token exchange → `authenticate()`.
3. The client sends `joinInstance` with `sdk.instanceId`.
4. The server maps that instance id to a room, creating it on first arrival.
   Everyone else who launches the same Activity lands in the same room.
5. The first person to arrive is host and starts the game; bots can fill seats.

Because the room is keyed on the instance id and not on a code, nobody types
anything.

## Known gaps

- **Nobody can join once a game is under way.** A late arrival gets "that game
  has already started". Spectating is not implemented.
- **Rooms are in memory.** A server restart ends every game in progress.
- **The instance mapping is cleaned up when the room is swept**, so relaunching
  a finished Activity gives a fresh table. That is tested.
- **No hint mode online**, deliberately — see `spec-draft.md` §6. The server
  never reveals an infraction to anyone, so spotting mistakes stays the game.

## Debugging the first run

- Discord's iframe has devtools: enable Developer Mode, then right-click the
  Activity.
- A failed handshake renders the actual error on screen rather than a spinner.
- `GET /health` on the server (also reachable as `/.proxy/api/health` if `/api`
  maps to the server) reports how many rooms exist.
- If the socket never connects, the URL mapping for `/ws` is the first suspect.
