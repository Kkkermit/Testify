<!--     ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗
         ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝
            ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝
            ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝
            ██║   ███████╗███████║   ██║   ██║██║        ██║
            ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝    -->

<img align="center" alt="Testify banner" src="https://i.postimg.cc/v87R8PSx/test.png">

<p align="center">
<img align="center" alt="GitHub Issues" src="https://img.shields.io/github/issues/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub license" src="https://img.shields.io/github/license/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub Stars" src="https://img.shields.io/github/stars/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub Forks" src="https://img.shields.io/github/forks/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub Contributors" src="https://img.shields.io/github/contributors/Kkkermit/Testify.svg?style=for-the-badge">
</p>

<p align="center">
<img align="center" alt="CI" src="https://img.shields.io/github/actions/workflow/status/Kkkermit/Testify/ci.yml?style=for-the-badge&label=CI">
<img align="center" alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
<img align="center" alt="Node" src="https://img.shields.io/badge/node-%3E%3D24.11-5FA04E?style=for-the-badge&logo=node.js&logoColor=white">
<img align="center" alt="GitHub Version" src="https://img.shields.io/github/package-json/v/Kkkermit/Testify?style=for-the-badge">
</p>

<p align="center">
  <a href="https://buymeacoffee.com/kkermit" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60px" width="217px">
  </a>
</p>

<p align="center"><strong>
The new and improved TypeScript rewrite of Testify — an all-in-one Discord bot with prefix &amp; slash commands.
</strong></p>

<p align="center">
78 slash commands, 128 subcommands and 206 things you can actually run: moderation, economy, levelling,
tickets, giveaways and games. Every command works as <code>/ban</code> <strong>and</strong> as
<code>t?ban</code> — because underneath it is one command, not two copies.
</p>

> Want to try it before setting anything up? [**Invite Testify to your server**](https://discord.com/oauth2/authorize?client_id=1211784897627168778&permissions=8&scope=applications.commands%20bot)

> [!CAUTION]
> **Never share or commit your `.env` file or any of its values.** It holds your bot token and your MongoDB
> password — anyone who gets them controls your bot and your data. `.gitignore` already covers `.env*`. If a
> token ever reaches somewhere public, reset it immediately in the Developer Portal.

## Table of Contents

- [What's new in v2](#whats-new-in-v2)
- [Features](#features)
- [Compatibility](#compatibility)
- [Quick start](#quick-start)
- [Full setup guide](#full-setup-guide)
- [Slash and prefix](#slash-and-prefix)
- [Command categories](#command-categories)
- [Adding your own command](#adding-your-own-command)
- [The web dashboard](#the-web-dashboard)
- [Scripts](#scripts)
- [FAQ](#faq)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Contributors](#contributors)
- [Support](#support)
- [Star history](#star-history)
- [License](#license)

<h1 align="center"><strong>
⭐ If you like Testify, or have used any of its code, please consider leaving a star. It genuinely helps, and
it tells us the project is worth continuing! ⭐
</strong></h1>

## What's new in v2

v2 is a **complete rewrite of the original JavaScript bot in TypeScript** — not a port with types bolted on.
The whole thing was rebuilt around the problems the old codebase actually had.

|                    | v1 (JavaScript)                                                                        | v2 (TypeScript)                                                              |
| ------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Slash + prefix** | Two separate implementations of each command, kept in sync by hand                     | **One command serves both.** 46 duplicated pairs became one file each        |
| **Types**          | None                                                                                   | `strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`   |
| **Config**         | Bot IDs and log channels hardcoded, so a fresh clone logged into someone else's server | Everything through a **validated `.env`** — no IDs committed to the repo     |
| **Start-up**       | Command registration raced the login                                                   | Each step awaited in order; a malformed file names itself and stops the boot |
| **Errors**         | Stack traces could reach chat                                                          | One error boundary — users get a plain apology, you get the full context     |
| **Money**          | Read-modify-save, so balances could duplicate under load                               | Atomic database updates                                                      |
| **Tests**          | A handful                                                                              | **829 tests**, with an enforced 80% coverage floor                           |
| **Setup**          | Manual, including patching a file inside `node_modules`                                | `npm run setup`, and you are running                                         |

Everything the old bot did is still here, apart from the integrations that needed paid or personal API keys
(Spotify, Valorant, Instagram and the AI commands).

## Features

### 🛡️ Moderation

- **Full moderation suite** — ban, softban, kick, mute, warn, lock, slowmode, nickname and role management
- **Warnings with history** — every warning keeps its reason, its moderator and a full edit trail
- **Automod** — flagged words, spam, mention spam, keyword and link filtering
- **Audit logging** — 18 event types, each switchable per server
- **Tickets** — panels, claiming, locking and HTML transcripts

### 💰 Economy and levelling

- **Economy** — wallet and bank, work, daily, beg, gamble, rob, heist, transfers and a server lottery
- **Shops, houses, businesses and jobs** — plus pets that need feeding and walking
- **Levelling** — XP with configurable channels, boost roles and multipliers, and a leaderboard

### 🎯 Games

- **Games** — blackjack, guess the number, guess the Pokémon, fast type, rock paper scissors, 8ball

### 🎉 Community and utility

- **Giveaways** — start, end, reroll and delete, persisted so they survive a restart
- **Info** — user, server, role and bot information, plus avatars, banners and profiles
- **Welcome system** — with a generated welcome card
- **Counting, sticky messages, auto roles, verification and voice-channel stat counters**

## Compatibility

### Operating systems

| Operating system        | Support | Notes                                                                                 |
| ----------------------- | ------- | ------------------------------------------------------------------------------------- |
| Windows 10 / 11         | ✅ Full | `cross-env` sets the environment variables, so the scripts work in cmd and PowerShell |
| macOS                   | ✅ Full | Apple Silicon and Intel                                                               |
| Linux (Ubuntu / Debian) | ✅ Full | What CI runs on                                                                       |
| Linux (Fedora / Arch)   | ✅ Full |                                                                                       |
| Linux (Alpine)          | ✅ Full | Needs `apk add --no-cache python3 make g++` for the native modules                    |
| Raspberry Pi            | ✅ Full | Use a **64-bit** OS — the prebuilt canvas binaries are arm64 only                     |

### Node.js

| Version          | Support            | Notes                                        |
| ---------------- | ------------------ | -------------------------------------------- |
| 22.x and older   | ❌ Not supported   | `npm install` warns with `EBADENGINE`        |
| **24.11+ (LTS)** | ✅ **Recommended** | What `.nvmrc` pins and what CI tests against |
| 25.x             | ✅ Supported       | Works, but not what CI runs                  |

> [!IMPORTANT]
> Testify requires **Node 24.11 or newer**. If you are stuck on an older version, use
> [nvm](https://github.com/nvm-sh/nvm) — the repo ships a `.nvmrc`, so `nvm use` picks the right version
> automatically.

### What is tested

Every push runs typecheck, lint, formatting, **829 unit tests**, a coverage gate and a real build — then
verifies the compiled `dist/` actually starts. A nightly workflow re-runs the tests and scans dependencies for
newly published vulnerabilities.

## Quick start

Already have Node 24 and a MongoDB connection string? You are five commands away.

```bash
git clone https://github.com/Kkkermit/Testify.git
cd Testify
npm install
npm run setup      # asks for your token, client ID, owner ID and database URL
npm run dev        # starts the bot, restarting whenever you save a file
```

That is the whole setup. `npm run setup` writes the `.env` for you, so there is no file to hand-edit and
nothing to paste in the wrong place.

No token or database yet? The next section walks through both from scratch.

## Full setup guide

### 1. Install the tools

- **[Node.js 24.11 or newer](https://nodejs.org)** — check yours with `node -v`
- **[Git](https://git-scm.com/downloads)**
- **A code editor** — [VS Code](https://code.visualstudio.com/download) is a good default

### 2. Create your bot and get a token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and sign in.
2. Click **New Application**, name it, and confirm.
3. Open the **Bot** tab on the left.
4. Under **Privileged Gateway Intents**, turn on **all three**, then **Save Changes**. Message Content is not
   optional — without it the bot cannot read any prefix command.
5. Click **Reset Token** and copy it. **This is the one value you must never share.**

### 3. Invite the bot to your server

1. Open **OAuth2 → URL Generator**.
2. Under **Scopes**, tick `bot` and `applications.commands`.
3. Under **Bot Permissions**, tick **Administrator** while you are getting started.
4. Copy the URL at the bottom, open it, pick your server, and authorise.

### 4. Get a database

Testify keeps everything in MongoDB. The free tier is plenty.

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a **free M0 cluster**.
3. Under **Database Access**, create a database user and save the password.
4. Under **Network Access**, click **Add IP Address** and choose **Allow access from anywhere**.
5. Back on **Database**, click **Connect → Drivers** and copy the connection string.
6. Replace `<password>` in it with your database user's password.

### 5. Fill in your settings

```bash
npm run setup
```

It asks for each value and writes `.env` for you. Required fields are marked and it will not let you skip
them. Prefer doing it by hand? Copy `.env.example` to `.env` and fill it in.

| Variable               | Required | What it is                                                                        |
| ---------------------- | :------: | --------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`        |    ✅    | The token from step 2                                                             |
| `DISCORD_CLIENT_ID`    |    ✅    | **OAuth2 → Client ID** in the Developer Portal                                    |
| `DISCORD_OWNER_IDS`    |    ✅    | Your Discord user ID. Comma-separate for several owners                           |
| `MONGODB_URI`          |    ✅    | The connection string from step 4                                                 |
| `DISCORD_DEV_GUILD_ID` |    —     | A test server ID. Commands appear there instantly instead of taking up to an hour |
| `LOG_LEVEL`            |    —     | `trace`, `debug`, `info` (default), `warn`, `error` or `fatal`                    |
| `CHANNEL_ERROR_LOG`    |    —     | Where command failures are reported                                               |
| `CHANNEL_GUILD_LOG`    |    —     | Where server joins and leaves are reported                                        |
| `CHANNEL_DM_LOG`       |    —     | Where DMs to the bot are logged                                                   |
| `CHANNEL_FEEDBACK_LOG` |    —     | Where `/suggest` and `/bug-report` land                                           |

Leave any optional value blank and that feature simply stays off. Nothing breaks.

> **Getting an ID:** enable **Developer Mode** in Discord (Settings → Advanced), then right-click any user,
> server or channel and choose **Copy ID**.

### 6. Run it

```bash
npm run dev
```

You should see the Testify banner, a count of everything that loaded, and your commands appearing in Discord.
Save any file and the bot restarts itself.

For production:

```bash
npm run build
npm start
```

> [!TIP]
> Use **two bot applications** — one for development, one for production. `npm run setup -- --dev` writes
> `.env.development`, which `npm run dev` reads instead of `.env`. That way testing can never touch your live
> bot or its database.

## Slash and prefix

Every command works both ways, from a single implementation:

```
/ban user:@someone reason:spamming
t?ban @someone spamming
```

The default prefix is `t?`, and prefix commands are **on by default**. Server admins can change either:

| Command                | What it does                               |
| ---------------------- | ------------------------------------------ |
| `/prefix show`         | Show the current prefix                    |
| `/prefix set <prefix>` | Change it                                  |
| `/prefix enable`       | Turn prefix commands on                    |
| `/prefix disable`      | Turn them off, leaving slash commands only |

Many commands also have shorter prefix aliases — `t?bal`, `t?p`, `t?np`, `t?lb` and 24 others.

Anything that would be a private reply on a slash command is sent in the channel instead, since a normal
message cannot be ephemeral.

## Command categories

Run `/help` in Discord for the browsable version, or see [`COMMANDS.md`](COMMANDS.md) for the full generated
list.

| Category      | Top-level | What is in it                                                               |
| ------------- | :-------: | --------------------------------------------------------------------------- |
| 💰 Economy    |    23     | Balance, work, daily, gamble, rob, heist, shop, pets, lottery, leaderboards |
| 🛡️ Moderation |    17     | Ban, kick, mute, warn, softban, lock, clear, roles, slowmode                |
| 📚 Info       |    11     | User, server and role info, avatars, profiles, ping, help                   |
| ⚙️ Settings   |    10     | Automod, audit logging, auto roles, counting, welcome, verification, prefix |
| 👑 Owner      |     5     | Eval, blacklist, guild list, DM, flush logs                                 |
| 👥 Community  |     3     | Memes, translation, Minecraft lookups, advice, wiki                         |
| 🎮 Fun        |     2     | ASCII art, fake tweets, hack, IQ, nitro, Oogway quotes                      |
| 📈 Levelling  |     2     | Rank cards and the levelling settings                                       |
| 💬 Feedback   |     2     | Suggestions and bug reports                                                 |
| 🎯 Games      |     1     | Blackjack, guess the number, Pokémon, fast type, RPS                        |
| 🎁 Giveaways  |     1     | Start, end, reroll, delete                                                  |
| 🎫 Tickets    |     1     | Setup, status, disable                                                      |

Some categories look small but hold a lot: `/game`, `/fun` and `/lookup` group many subcommands
under one parent, which is how the bot stays under Discord's hard limit of 100 top-level commands.

## Adding your own command

Create one file. The loader finds it, `/help` lists it, and it works as a slash **and** a prefix command
straight away.

```ts
// src/commands/fun/coinflip.command.ts
import { defineCommand } from "@core/command";
import { successEmbed } from "@lib/embeds.util";
import { reply } from "@lib/reply.util";

export default defineCommand({
	name: "coinflip",
	description: "Flips a coin.",
	category: "fun",
	aliases: ["flip", "cf"],
	async run(interaction) {
		const side = Math.random() < 0.5 ? "Heads" : "Tails";
		await reply(interaction, { embeds: [successEmbed(`🪙 ${side}!`)] });
	},
});
```

Restart, and you have `/coinflip`, `t?coinflip`, `t?flip` and `t?cf`. There is no registry to update and
nothing to import by hand.

**Three rules worth knowing:**

1. **The `.command.ts` suffix is what the loader looks for.** A file without it is silently never loaded — so a
   test enforces the naming.
2. **`category` must be a key from `src/config/categories.ts`.** A typo is a compile error, not a runtime
   surprise.
3. **Build embeds with `embed()` from `@lib/embeds.util`.** The linter blocks bare `new EmbedBuilder()`, so
   every embed gets consistent colours and footers for free.

Options, subcommands and buttons are all covered in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## The web dashboard

Testify ships an optional web dashboard: sixteen screens for everything the bot does, signed in with Discord
and served **from inside the bot process**, so there is no second service to deploy and no API key to manage.

**It is off by default, and a bot-only install needs none of this.** Leave `DASHBOARD_ENABLED` unset and nothing
below applies.

### Turning it on

Four settings. `npm run setup` handles all of them: it asks for the client secret and the base URL, sets
`DASHBOARD_ENABLED=true`, generates the session secret, and prints the redirect URL to paste into Discord.

| Variable                   | What it is                                                            |
| -------------------------- | --------------------------------------------------------------------- |
| `DASHBOARD_ENABLED`        | `true` to serve it at all                                             |
| `DISCORD_CLIENT_SECRET`    | From the same Discord application page as your token — **OAuth2** tab |
| `DASHBOARD_BASE_URL`       | Where people open it, e.g. `http://localhost:5174`                    |
| `DASHBOARD_SESSION_SECRET` | `npm run secret -- --write` writes one into your `.env`               |

The redirect URL goes on that same OAuth2 tab: your base URL with `/api/auth/callback` on the end. `npm run
setup` prints the exact string, and so does the sign-in screen if you get it wrong.

Then:

```bash
npm run dev:all   # the bot and the dashboard together
```

The page is on `:5174`, the API on `:3000`, and Vite proxies between them so your browser only ever talks to one
origin. In production `npm run build && npm start` serves the built page from the bot's own port.

> [!IMPORTANT]
> Enabling the dashboard without the other three settings fails at start-up naming all three at once, rather
> than starting half-configured. If the port is already in use the bot **keeps running without the dashboard**
> and the log says which port to change.

### Who can see what

Signing in with Discord gets you the servers you already have **Manage Server** in, and nothing else. Every
request re-checks that against Discord live, so losing the permission locks you out on your next click rather
than at your next sign-in. The owner console is `DISCORD_OWNER_IDS` and nothing else — to everybody else those
routes answer 404, so they cannot even be found.

### If you put it on the internet

The defaults are the safe ones and they assume you are on your own machine:

- **`DASHBOARD_BIND` is `127.0.0.1`.** Changing it to `0.0.0.0` puts an admin panel on the internet. Put a
  reverse proxy with HTTPS in front of it first.
- **`DASHBOARD_TRUST_PROXY` is `false`.** Turn it on **only** when a proxy you control sets
  `x-forwarded-for` — trusting that header without one lets anyone forge their rate-limit bucket.
- **Use `https://` in `DASHBOARD_BASE_URL`** once you have a certificate. That is what turns on HSTS and the
  `Secure` flag on cookies.
- **Rotating `DASHBOARD_SESSION_SECRET` signs everybody out.** That is the whole procedure after a leak.

Full detail, including the threat model, is in [`dashboard/dashboard.md`](dashboard/dashboard.md).

## Scripts

| Command                     | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `npm run dev`               | Runs the bot from source, restarting whenever you save                |
| `npm run dev:all`           | Runs the bot and the web dashboard together                           |
| `npm run build`             | Compiles to `dist/`                                                   |
| `npm start`                 | Runs the compiled bot                                                 |
| `npm run setup`             | Interactive `.env` generator (add `-- --dev` for `.env.development`)  |
| `npm test`                  | Runs the test suite                                                   |
| `npm run test:coverage`     | Runs the tests with a coverage report                                 |
| `npm run check`             | Typecheck, lint, format check and tests — everything CI runs          |
| `npm run lint` / `lint:fix` | Lints, optionally fixing what it can                                  |
| `npm run format`            | Formats everything with Prettier                                      |
| `npm run commit`            | Guided commit message in the project's format                         |
| `npm run docs:commands`     | Regenerates `COMMANDS.md` from the real commands                      |
| `npm run commands:clear`    | Removes every registered slash command from Discord                   |
| `npm run db:wipe`           | Wipes the database, or individual collections                         |
| `npm run audit`             | Checks dependencies for known vulnerabilities                         |
| `npm run secret`            | Generates a dashboard session secret (`-- --write` puts it in `.env`) |

## FAQ

<details>
<summary><strong>Does any of this cost money?</strong></summary>

No. Discord bots are free, and MongoDB Atlas has a free tier that is far more than enough. You only start
paying if you outgrow the free database, or want to host the bot somewhere other than your own machine.

</details>

<details>
<summary><strong>Do I need to know TypeScript to use this?</strong></summary>

No. To _run_ the bot you never touch the code at all. To add a command, basic JavaScript is enough — the types
mostly help by telling you something is wrong before you start the bot rather than after. Copy an existing
file in `src/commands/` and change it.

</details>

<details>
<summary><strong>My slash commands are not showing up in Discord.</strong></summary>

Almost always one of three things:

1. **You are waiting on a global deploy.** Without `DISCORD_DEV_GUILD_ID` set, Discord can take up to an hour
   to show new commands. Set it to your test server and they appear instantly.
2. **The bot was invited without `applications.commands`.** Re-invite it with both `bot` and
   `applications.commands` ticked in the URL Generator.
3. **Start-up failed before publishing.** Commands are published before login, so check the console.

If Discord is showing commands that no longer exist, run `npm run commands:clear` and start the bot again.

</details>

<details>
<summary><strong>Prefix commands are not working.</strong></summary>

Check **Message Content Intent** is enabled in the Developer Portal. Without it Discord sends the bot empty
message content, so it cannot see any prefix at all — the bot warns about this on start-up if it notices.
Then check `/prefix show`, and that prefix commands have not been switched off with `/prefix disable`.

</details>

<details>
<summary><strong>Can I use only slash commands?</strong></summary>

Yes — run `/prefix disable` in each server. Nothing else changes.

</details>

<details>
<summary><strong>Do I really need all three privileged intents?</strong></summary>

**Message Content** is required — prefix commands, automod, levelling and counting all read messages.
**Server Members** is needed for welcome messages, auto roles and member counters. **Presence** is the one you
can most comfortably leave off.

</details>

<details>
<summary><strong>Can I remove features I do not want?</strong></summary>

Yes, and it is built for that. Delete a command file and it stops existing — there is no registry to update and
no imports to clean up. To drop a whole category, delete its folder under `src/commands/` and its entry in
`src/config/categories.ts`.

</details>

<details>
<summary><strong>What is the difference between <code>npm run dev</code> and <code>npm start</code>?</strong></summary>

`npm run dev` runs from TypeScript source, restarts when you save, and reads `.env.development` if you have
one — so it can drive a separate test bot. `npm start` runs the compiled `dist/` build against `.env`, which is
what you use in production. Run `npm run build` first.

</details>

<details>
<summary><strong>Where should I host it?</strong></summary>

Anywhere that runs Node 24 — a VPS, a Raspberry Pi, Railway, Fly.io, or a machine at home. It needs no inbound
ports, so there is no domain or reverse proxy to set up. Use something like `pm2` or a systemd service so it
restarts itself if it crashes.

</details>

<details>
<summary><strong>How do I update to a newer version?</strong></summary>

```bash
git pull
npm install
npm run build
```

Your `.env` and your database are untouched.

</details>

<details>
<summary><strong>I accidentally leaked my token. What now?</strong></summary>

Reset it straight away: **Developer Portal → your application → Bot → Reset Token**, then update your `.env`.
If a MongoDB password leaked, change it under **Atlas → Database Access → Edit**. Deleting the commit is not
enough — treat anything ever pushed to GitHub as public forever.

</details>

<details>
<summary><strong>Can I use this for my own bot, or rename it?</strong></summary>

Yes. It is MIT licensed — use it, change it, rebrand it, run it commercially. A credit back is appreciated but
not required. The name, colours and links live in `src/config/theme.ts`.

</details>

## Troubleshooting

| Symptom                                          | Fix                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `Your .env file needs attention`                 | The message lists exactly which values are wrong. Optional ones can be left blank                    |
| `querySrv ECONNREFUSED`                          | Your DNS cannot resolve the Atlas address. Try another network, or use the non-SRV connection string |
| `MongoServerError: bad auth`                     | Wrong database password, or `<password>` was left in the connection string                           |
| `Maximum number of application commands reached` | You are over Discord's limit of 100. Group commands under a shared parent — the error explains how   |
| `Used disallowed intents`                        | Turn the privileged intents on in the Developer Portal                                               |
| `EBADENGINE` during install                      | Your Node is older than 24.11. Run `nvm use`                                                         |

Still stuck? [Ask in Discord](https://discord.gg/xcMVwAVjSD) or
[open an issue](https://github.com/Kkkermit/Testify/issues).

## Contributing

Contributions are very welcome, including from first-timers.

```bash
npm run check     # typecheck, lint, format and tests — run this before pushing
npm run commit    # guided commit message in the project's format
```

[`CONTRIBUTING.md`](CONTRIBUTING.md) has the full guide. New logic needs a test — the suite has an 80% coverage
floor and the pre-push hook enforces it.

## Contributors

<p align="center">Thank you to all the amazing people who have contributed to Testify!</p>

<p align="center">
  <a href="https://github.com/Kkkermit/Testify/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Kkkermit/Testify" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/Kkkermit/Testify/graphs/contributors">View all contributors</a>
</p>

## Support

Join us on [Discord](https://discord.gg/xcMVwAVjSD) for support, questions, or just to say hello.

If Testify has been useful to you, a [coffee](https://buymeacoffee.com/kkermit) keeps it going 💛

## Star history

<div align="center">
 <a href="https://www.star-history.com/#Kkkermit/Testify&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Kkkermit/Testify&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Kkkermit/Testify&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Kkkermit/Testify&type=Date" />
  </picture>
 </a>
</div>

## License

Released under the terms of the [MIT License](LICENSE) [2026].

**Thanks to [TheLegendDev](https://github.com/TheLegenDev) for the readme template from [Nub Bot](https://github.com/TheLegenDev/Nub-Bot)** 💛
