# Running Testify in Docker

The repository ships a `Dockerfile` and a `docker-compose.yml` that bring up the bot and a MongoDB together.
This is the shortest path to a running instance on a server, and it works the same on Linux, macOS and Windows.

Running from source instead is covered in [the README](../README.md#full-setup-guide) — Docker is an option, not
a requirement, and the bot has no container-only behaviour.

---

## Quick start

```bash
cp .env.example .env     # then fill it in, or run `npm run setup`
docker compose up -d
docker compose logs -f bot
```

Three variables have no sensible default and compose refuses to start without them, naming the one it wants:
`DISCORD_TOKEN`, `DISCORD_CLIENT_ID` and `DISCORD_OWNER_IDS`. Everything else falls back to the same defaults
the bot uses when run from source.

`MONGODB_URI` defaults to the `mongo` service in the compose file, so a fresh clone needs no database of its
own. Point it at Atlas or an existing server if you would rather:

```bash
MONGODB_URI=mongodb+srv://user:password@cluster0.example.mongodb.net/testify
```

To update after pulling new code:

```bash
docker compose build && docker compose up -d
```

Data lives in the `mongo-data` volume and survives `docker compose down`. `docker compose down -v` deletes it.

---

## The dashboard

It is off by default here exactly as it is elsewhere. Turning it on takes four variables:

```bash
DASHBOARD_ENABLED=true
DISCORD_CLIENT_SECRET=…            # from the Discord developer portal
DASHBOARD_BASE_URL=https://…       # where a browser reaches it
DASHBOARD_SESSION_SECRET=…         # npm run secret
```

Add `<DASHBOARD_BASE_URL>/api/auth/callback` to your application's OAuth2 redirect URIs, or signing in fails at
Discord's end rather than yours.

**`DASHBOARD_BIND` is set to `0.0.0.0` in the compose file, and that is not a loosening.** The bot's own default
is `127.0.0.1`, which inside a container is the _container's_ loopback — a published port would reach nothing at
all, and the symptom is a connection refused that looks like the bot never started. The container boundary is
what keeps it private instead: the published port is bound to the host's `127.0.0.1`, so nothing is reachable
from outside the machine until you put a reverse proxy in front and say so.

When you do put one in front, set `DASHBOARD_TRUST_PROXY=true` — without it every request looks like it comes
from the proxy, and the rate limiter buckets them all together. With it and _no_ proxy, anyone can forge their
own bucket by setting a header. Set it if and only if something is genuinely terminating TLS in front.

---

## What is in the image

Two stages. The first installs everything and builds the shared package, the bot and the SPA; the second keeps
only what runs.

- **The dashboard's React tree is not installed at runtime.** It is a build-time dependency: the API serves the
  compiled assets as static files. The runtime install is
  `npm ci --omit=dev --workspace @testify/shared --include-workspace-root`.
- **`fonts-dejavu-core` is installed, and it is not optional.** `@napi-rs/canvas` statically links Skia but
  resolves font _families_ through the operating system, and a slim base image ships none. Without it the rank
  card, both leaderboards and the welcome card render their layout correctly and their text not at all — which
  looks like a code bug and is not one.
- **Install scripts are skipped.** `prepare` runs husky, which needs a `.git` the build context does not carry;
  `build:shared` is invoked explicitly instead.
- **It runs as the `node` user**, not root.
- **No secret is baked in.** `.env` is excluded from the build context and configuration arrives through the
  environment, so the image is safe to push to a registry.

The layout of the final image matters: the API resolves the SPA at `../../dashboard/dist` relative to
`dist/api`, so `dist/` and `dashboard/dist/` have to keep their positions beside each other.

---

## There is deliberately no HEALTHCHECK

The obvious probe is `/api/health`, and it only exists when `DASHBOARD_ENABLED` is true — so baking it into the
image would mark every bot-only install permanently unhealthy. There is no HTTP surface to check on a bot whose
job is holding a gateway websocket open, and "the process is alive" is what `restart: unless-stopped` already
acts on.

If you run with the dashboard on and want one, add it to your own compose file rather than the image:

```yaml
healthcheck:
  test:
    [
      "CMD",
      "node",
      "-e",
      "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))",
    ]
  interval: 30s
  start_period: 60s
```

`start_period` matters more than it looks: the API starts _after_ `client.login()`, so there is nothing on the
port for the twenty-odd seconds the bot spends connecting to Discord.

---

## Stopping it

`docker compose stop` sends `SIGTERM`, which the bot handles: it closes the API listener, disconnects from
Discord and closes the database connection before exiting. `init: true` is set so Node is not PID 1 with no one
to reap orphaned processes.

---

## Troubleshooting

| What you see                                         | What it is                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `required variable DISCORD_TOKEN is missing a value` | No `.env`, or the variable is blank in it                                |
| Cards render with no text on them                    | The font package is missing — you are not using this repo's Dockerfile   |
| Dashboard refuses the connection                     | `DASHBOARD_BIND` is `127.0.0.1`; in a container it must be `0.0.0.0`     |
| `Your .env file needs attention`                     | The bot's own validation. It names every problem at once — read them all |
| Signing in bounces back to the sign-in screen        | The OAuth2 redirect URI does not match `DASHBOARD_BASE_URL`              |
| Commands do not appear in Discord                    | Global registration takes up to an hour. Set `DISCORD_DEV_GUILD_ID`      |

---

## What has not been verified

**The image has not been built or run**, because the environment this was written in has no Docker daemon. What
was done instead was to reproduce each stage outside a container and check it directly:

- **The build stage was run end to end** in a tree installed with `--ignore-scripts` and containing only the
  files `.dockerignore` permits. `build:shared`, `build:bot` and `build:dashboard` all succeed, the emitted
  `dist/` carries no unrewritten `@core/…` aliases, and `verify:bundle` reports one copy of React — so the
  hoisting hazard survives this layering too.
- **esbuild works without its `postinstall`.** It is the one build-critical package that has one, so
  `--ignore-scripts` was worth checking rather than assuming: the shim resolves the platform package at run
  time, and both the CLI and the JS API were exercised.
- **The runtime install resolves everything the bot loads.** Against the production-only, dashboard-excluded
  module set, the loader registers all 76 commands, 23 buttons, 16 events and 75 prefix aliases.
- **The compiled layout resolves the SPA** — `dashboardRoot()` finds `dashboard/dist` from `dist/api`.
- **`docker compose config` validates**, and refuses by name when a required variable is missing.

What that leaves genuinely untested is the container itself: the base image tag (not pinned to a digest),
`fonts-dejavu-core` actually satisfying Skia's font lookup on that base, and the healthcheck sample above.
Expect to iterate on the first `docker compose build`.
