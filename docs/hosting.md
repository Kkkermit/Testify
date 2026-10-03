<div align="center">

# 🐳 Running Testify in Docker

**The bot and a MongoDB, brought up together with one command — the same on Linux, macOS and Windows.**

[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](../Dockerfile)
[![Compose](https://img.shields.io/badge/compose-bot_%2B_mongo-2496ED?style=for-the-badge&logo=docker&logoColor=white)](../docker-compose.yml)
[![Base image](https://img.shields.io/badge/base-node_24_bookworm--slim-5FA04E?style=for-the-badge&logo=node.js&logoColor=white)](../Dockerfile)
[![Railway](https://img.shields.io/badge/Railway-works-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](#️-hosting-it-somewhere-other-than-your-own-machine)

[Quick start](#-quick-start) · [Dashboard](#️-the-dashboard) · [The image](#-what-is-in-the-image) ·
[Where to host](#️-hosting-it-somewhere-other-than-your-own-machine) · [Troubleshooting](#-troubleshooting)

</div>

> [!NOTE]
> Docker is an option, not a requirement. Running from source is covered in
> [the README](../README.md#-quick-start), and the bot has no container-only behaviour.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/diagrams/docker-compose-dark.png">
    <img alt="The bot and MongoDB run together under docker compose; the bot talks to Discord over the gateway and to mongo on its own network, and the dashboard is published only on the host's loopback, behind an optional reverse proxy" src="images/diagrams/docker-compose-light.png" width="560">
  </picture>
</p>

---

## 🚀 Quick start

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

## 🖥️ The dashboard

It is off by default here exactly as it is elsewhere. Turning it on takes four variables:

```bash
DASHBOARD_ENABLED=true
DISCORD_CLIENT_SECRET=…            # from the Discord developer portal
DASHBOARD_BASE_URL=https://…       # where a browser reaches it
DASHBOARD_SESSION_SECRET=…         # npm run secret
```

Add `<DASHBOARD_BASE_URL>/api/auth/callback` to your application's OAuth2 redirect URIs, or signing in fails at
Discord's end rather than yours.

> [!IMPORTANT]
> **`DASHBOARD_BIND` is set to `0.0.0.0` in the compose file, and that is not a loosening.** The bot's own default
> is `127.0.0.1`, which inside a container is the _container's_ loopback — a published port would reach nothing at
> all, and the symptom is a connection refused that looks like the bot never started. The container boundary is
> what keeps it private instead: the published port is bound to the host's `127.0.0.1`, so nothing is reachable
> from outside the machine until you put a reverse proxy in front and say so.

When you do put one in front, set `DASHBOARD_TRUST_PROXY=true` — without it every request looks like it comes
from the proxy, and the rate limiter buckets them all together. With it and _no_ proxy, anyone can forge their
own bucket by setting a header. Set it if and only if something is genuinely terminating TLS in front.

---

## 📦 What is in the image

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
- **FFmpeg and yt-dlp are installed by the image, not by npm.** They have to be: the skipped install scripts
  are exactly what the optional `ffmpeg-static` and `youtube-dl-exec` packages use to fetch their binaries, so
  in a container they would install and stay empty. FFmpeg comes from apt; yt-dlp is downloaded from its
  releases because Debian's build is far too old to track YouTube, and the build runs `yt-dlp --version` so a
  bad download fails the image rather than the first `/play`. This adds roughly 100 MB.
- **It runs as the `node` user**, not root.
- **No secret is baked in.** `.env` is excluded from the build context and configuration arrives through the
  environment, so the image is safe to push to a registry.

The layout of the final image matters: the API resolves the SPA at `../../dashboard/dist` relative to
`dist/api`, so `dist/` and `dashboard/dist/` have to keep their positions beside each other.

---

## ☁️ Hosting it somewhere other than your own machine

**It has to be a host that runs a container or a long-lived process.** A Discord bot holds a gateway WebSocket
open for its whole life, and a voice connection on top of that — so anything serverless is structurally out:

| Host                                    | Works | Why                                                         |
| --------------------------------------- | :---: | ----------------------------------------------------------- |
| Railway, Fly.io, Render, a VPS, Docker  |  ✅   | Long-running container; the Dockerfile brings both binaries |
| **Vercel, Netlify, Cloudflare Workers** |  ❌   | Serverless. No persistent socket, and no voice at all       |

On **Railway** and anything else that builds from a `Dockerfile`, point it at this repository and there is
nothing else to do — FFmpeg and yt-dlp are in the image, so `MUSIC_YTDLP_PATH` and `MUSIC_FFMPEG_PATH` stay
blank. If a host builds with Nixpacks instead of the `Dockerfile`, add `ffmpeg` to its packages and set
`MUSIC_YTDLP_PATH` to wherever you put yt-dlp, or just force the Dockerfile build.

Vercel is worth being explicit about, because people ask: it can host Discord _HTTP interaction_ endpoints —
webhook-delivered slash commands — but not a gateway client, and a serverless function cannot hold a voice
connection open. There is no configuration that makes this bot run there.

---

## 🩺 There is deliberately no HEALTHCHECK

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

## 🛑 Stopping it

`docker compose stop` sends `SIGTERM`, which the bot handles: it closes the API listener, disconnects from
Discord and closes the database connection before exiting. `init: true` is set so Node is not PID 1 with no one
to reap orphaned processes.

---

## 🔧 Troubleshooting

| What you see                                         | What it is                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `required variable DISCORD_TOKEN is missing a value` | No `.env`, or the variable is blank in it                                     |
| Cards render with no text on them                    | The font package is missing — you are not using this repo's Dockerfile        |
| Dashboard refuses the connection                     | `DASHBOARD_BIND` is `127.0.0.1`; in a container it must be `0.0.0.0`          |
| `Your .env file needs attention`                     | The bot's own validation. It names every problem at once — read them all      |
| Signing in bounces back to the sign-in screen        | The OAuth2 redirect URI does not match `DASHBOARD_BASE_URL`                   |
| Commands do not appear in Discord                    | The client is showing a cached list — reload it with Ctrl+R (Cmd+R on macOS)  |
| `open //./pipe/dockerDesktopLinuxEngine`             | Docker Desktop is not running. Start it and wait for "Engine running"         |
| `HCS_E_HYPERV_NOT_INSTALLED`                         | Windows needs Virtual Machine Platform on and virtualisation on in the BIOS   |
| `401 Unauthorized` fetching `docker/dockerfile:1`    | A stale Docker Hub login. `docker logout`, or sign in again in Docker Desktop |
| `npm ci` … `Missing: … from lock file`               | `npm install` rewrote the lockfile. `git checkout -- package-lock.json`       |
| `Database` fails with `localhost` in the address     | `localhost` is the bot's own container. Remove `MONGODB_URI` to use `mongo`   |

---

## ✅ What has been verified

**The image has been built and run with Docker Desktop on Windows**, and the bot came up in it and served
Discord. Separately, in a Linux sandbox:

- **The build stage runs end to end.** `npm ci --ignore-scripts`, then `build:shared`, `build:bot` and
  `build:dashboard`, and `verify:bundle` reports one copy of React inside the image.
- **The stack starts under compose.** The bot waits for MongoDB's health check, connects to it at `mongo:27017`,
  and loads every command, button and event from the runtime install.

Still untested: the healthcheck sample above, and the base image tag, which is not pinned to a digest.
