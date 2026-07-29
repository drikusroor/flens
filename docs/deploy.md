# Publishing single-player to GitHub Pages

The single-player game needs no server. The rules engine and the bots are plain
TypeScript running in the browser, so the whole thing builds to static files.

## The workflow

`.github/workflows/pages.yml` runs on every push to `main`, and can also be
triggered by hand from the Actions tab. It runs the tests and the typecheck
first — a broken engine should never reach the published page — then builds and
deploys.

Two environment variables shape the build:

| Variable | Why |
|---|---|
| `VITE_BASE_PATH` | Project sites live at `/<repo>/`, not at the root, so assets must resolve there. Set automatically from the repository name. |
| `VITE_OFFLINE_ONLY` | Hides everything that needs a server: the online lobby and the Discord path. Without it the menu would offer multiplayer that cannot connect. |

## One setting has to be flipped by hand

**Settings → Pages → Source: GitHub Actions.**

This is the only manual step, and it cannot be automated from the workflow.
`actions/configure-pages` has an `enablement: true` input that looks like it
would do it, but creating a Pages site requires repository-administration
rights, and `administration` is not among the scopes a workflow's `GITHUB_TOKEN`
can be granted. Without the setting the run fails at `configure-pages` with:

```
Create Pages site failed. Error: Resource not accessible by integration
```

Everything before that step — tests, typecheck, build — still runs, so a failure
here means the site is not switched on, not that the code is broken.

Once it is set, re-run the workflow (Actions → *Deploy single-player to GitHub
Pages* → *Run workflow*) or push to `main`. The site lands at
`https://<user>.github.io/<repo>/`.

Note that Pages on a **private** repository needs a paid plan; on a free account
the repository has to be public.

## Building it locally

To reproduce exactly what CI publishes:

```bash
VITE_BASE_PATH=/flens/ VITE_OFFLINE_ONLY=true npm run build --workspace @flens/web
```

Then serve it from a matching subpath — opening `dist/index.html` directly will
not resolve `/flens/assets/...`:

```bash
mkdir -p /tmp/pages/flens && cp -r apps/web/dist/* /tmp/pages/flens/
cd /tmp/pages && python3 -m http.server 8099
# http://localhost:8099/flens/
```

This was checked in a browser: the online option is absent, a full game plays
against bots, FLENS! works, reloading returns to the menu rather than stranding
you, and nothing attempts a network request.

The default build (`npm run build --workspace @flens/web`, no env) is unchanged
and still root-relative, so ordinary hosting is unaffected.

## Note

The offline bundle still contains the lazily-imported Discord SDK chunk (~160KB).
It is never requested — nothing served from Pages can be running inside Discord —
so it costs nothing at load time, only artifact size. Removing it would mean
splitting the app into two entry points for no user-visible gain.
