Running your own copy means your own bot account, your own database and your own rules: rename it, change it, and
switch off what you don't want. The code is MIT licensed. The one condition is that the copyright notice in
[`LICENSE`](https://github.com/Kkkermit/Testify/blob/main/LICENSE) stays with every copy you share.

## What you need

- **A Discord application** with a bot. Create one on the
  [Developer Portal](https://discord.com/developers/applications), and copy its **token** and **client ID**.
- **Both privileged intents switched on** for the bot: **Message Content** and **Server Members**. The bot won't
  start without them, and says which one is missing.
- **Your own Discord user ID**, so the bot knows you're its owner.
- **A MongoDB database**, version 7.0 or newer. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)'s free
  tier is plenty, or use the one in `docker-compose.yml`.
- **Node.js 24.11 or newer**, unless you use Docker.

The [full setup guide](https://github.com/Kkkermit/Testify/blob/main/README.md#-full-setup-guide) walks through each
of these from scratch.

## Three ways to run it

### 1. The published Docker image: nothing to build

Every release is published as
[`ghcr.io/kkkermit/testify`](https://github.com/Kkkermit/Testify/pkgs/container/testify), for x86 (`amd64`) and ARM
(`arm64`) machines. Put `docker-compose.yml`, `docker-compose.image.yml` and your `.env` in one folder, then:

```bash
docker compose -f docker-compose.yml -f docker-compose.image.yml up -d
```

This also starts a MongoDB beside the bot. It follows the newest release; set `TESTIFY_TAG` in `.env`, such as
`TESTIFY_TAG=2.4.0`, to stay on one.

### 2. Docker, built from the code

```bash
git clone https://github.com/Kkkermit/Testify.git
cd Testify
cp .env.example .env      # fill it in, or run `npm run setup`
docker compose up -d
docker compose logs -f bot
```

### 3. Node.js

```bash
git clone https://github.com/Kkkermit/Testify.git
cd Testify
npm ci
npm run setup             # asks for each value and checks it as you type
npm run build
npm start
```

For working on the code, use `npm run setup -- --dev` and `npm run dev` instead. That runs a separate test bot from
`.env.development` and restarts on every save.

[`docs/hosting.md`](https://github.com/Kkkermit/Testify/blob/main/docs/hosting.md) is the full hosting guide:
reverse proxies, what's in the image and what isn't, which hosts can run a bot, and a troubleshooting table.

## Configuration

Everything is set in `.env`, and `npm run setup` writes it for you.
[`.env.example`](https://github.com/Kkkermit/Testify/blob/main/.env.example) lists every variable with a comment, and
[testify.lol/docs/configuration](https://testify.lol/docs/configuration) shows the same list as a table.

| Variable               | Required | What it is                                                                            |
| ---------------------- | :------: | ------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`        |   Yes    | The bot's token                                                                       |
| `DISCORD_CLIENT_ID`    |   Yes    | The application's ID                                                                  |
| `DISCORD_OWNER_IDS`    |   Yes    | Your user ID, and any other owners', separated by commas                              |
| `MONGODB_URI`          |   Yes    | The database's connection string                                                      |
| `DISABLED_FEATURES`    |    No    | Features to run without, such as `music,casino`                                       |
| `DISCORD_DEV_GUILD_ID` |    No    | Registers commands in one test server only, while you develop                         |
| `DASHBOARD_*`          |    No    | The web dashboard; see [The dashboard](The-dashboard#turning-it-on-for-your-own-copy) |
| `SITE_*`               |    No    | The website: the landing page, docs and source browser. On by default                 |
| `CHANNEL_*_LOG`        |    No    | Channels for the bot's errors, servers joined and left, DMs, command use and feedback |

**Never commit or share `.env`.** It holds your token and your database password. If either leaks, reset it straight
away: **Developer Portal → your application → Bot → Reset Token**.

## Switching features off

Not every server wants a casino. Name what you want to run without, separated by commas, and restart:

```ini
DISABLED_FEATURES=music,casino
```

Those features vanish from Discord's command menu, `/help`, the dashboard and the docs, and nothing in the database is
deleted. The [README's list](https://github.com/Kkkermit/Testify/blob/main/README.md#-switching-features-off) has every
feature that can go, and
[Switching off a whole feature](https://testify.lol/docs/switching-features-off) explains how it works.

## Music

Music needs **FFmpeg** and **yt-dlp**. The Docker image includes both. Outside Docker, `npm run music:setup` fetches
yt-dlp and tells you whether FFmpeg is installed. YouTube changes often, so keep yt-dlp up to date; `/music status`
says which version the bot is using.

## Where to host it

Anywhere that runs a long-lived process: a VPS, a Raspberry Pi, Railway, Fly.io, Render, or a machine at home.
Serverless hosts such as Vercel, Netlify and Cloudflare Workers **can't** run it, because a Discord bot holds a
connection open for its whole life. The bot needs no inbound ports: the website and dashboard listen only on your
own machine until you put a reverse proxy in front of them.

## Keeping it up to date

See [Releases and updates](Releases-and-updates).
