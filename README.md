<div align="center">

# Testify

**An open source, multipurpose Discord bot written in TypeScript.**

126 commands across 16 categories · moderation · economy · levelling · music · tickets · giveaways · integrations

[![CI](https://github.com/Kkkermit/Testify/actions/workflows/ci.yml/badge.svg)](https://github.com/Kkkermit/Testify/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.11-brightgreen.svg)](https://nodejs.org)

</div>

---

## Contents

- [What it does](#what-it-does)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Writing a command](#writing-a-command)
- [Testing](#testing)
- [Migrating from v1](#migrating-from-v1)
- [Contributing](#contributing)
- [Licence](#licence)

---

## What it does

| Category                | Highlights                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Moderation**          | ban, kick, mute, unmute, unban, softban with automatic expiry, warnings with edit history, lock/unlock, clear, slowmode, nickname, role management            |
| **Economy**             | balances, daily streaks, work, beg, rob, heists, gambling, blackjack, a shop with items, houses and businesses, pets, a lottery, treasure drops, leaderboards |
| **Levelling**           | XP per message with a cooldown, level-up announcements, boost roles, rank and leaderboard                                                                     |
| **Music**               | play, queue, skip, seek, filters, loop, shuffle, autoplay, radio and text-to-speech — all available on both `/` and prefix                                    |
| **Community**           | memes, advice, animal facts, translation, Wikipedia, lyrics, film lookups, Minecraft server status, Clash Royale, Dead by Daylight, a calculator              |
| **Settings**            | prefix, welcome messages, auto-roles, anti-link, sticky messages, counting, verification, audit logging, AutoMod, voice counters                              |
| **Tickets & giveaways** | a full ticket panel with transcripts, and giveaways with reroll                                                                                               |
| **Integrations**        | Spotify listening stats over OAuth, Instagram post watching, Valorant catalogue lookups                                                                       |
| **Fun & mini-games**    | ASCII art, fake tweets, sign generator, blackjack, would-you-rather, fast type, guess the Pokémon, rock-paper-scissors and more                               |

Every command that makes sense on both surfaces is written **once** and exposed as
both a slash command and a prefix command.

---

## Requirements

|         | Version                                             |
| ------- | --------------------------------------------------- |
| Node.js | **22.11 or newer** (`.nvmrc` pins 22)               |
| MongoDB | 6.0 or newer, local or Atlas                        |
| FFmpeg  | bundled through `ffmpeg-static`; nothing to install |

A Discord application with the **Message Content**, **Server Members** and
**Presence** privileged intents enabled.

---

## Getting started

```bash
git clone https://github.com/Kkkermit/Testify.git
cd Testify
npm ci
npm run env:setup      # interactive; writes .env and refreshes .env.example
npm run build
npm start
```

For development with hot reload:

```bash
npm run dev
```

That is the whole setup. There is no post-install patching, nothing is written
into `node_modules`, and no package manager runs at boot.

---

## Configuration

Everything comes from environment variables, validated against a schema at
startup. A missing or malformed variable fails the boot with a list of exactly
what is wrong, rather than surfacing halfway through a command.

### Required

| Variable            | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `DISCORD_TOKEN`     | Bot token from the Developer Portal                    |
| `DISCORD_CLIENT_ID` | Application ID                                         |
| `DISCORD_OWNER_IDS` | Comma-separated user IDs allowed to run owner commands |
| `MONGODB_URI`       | MongoDB connection string                              |

### Optional

| Variable                                                             | Description                                                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                           | `development` loads `.env.development`; anything else loads `.env`                                                         |
| `LOG_LEVEL`                                                          | `trace` … `fatal`, default `info`                                                                                          |
| `DISCORD_DEV_GUILD_ID`                                               | Registers commands to one guild, which propagates instantly                                                                |
| `CHANNEL_GUILD_JOIN_LOG`, `CHANNEL_GUILD_LEAVE_LOG`                  | Where guild joins and leaves are announced                                                                                 |
| `CHANNEL_COMMAND_ERROR_LOG`                                          | Where command errors are reported, with triage buttons                                                                     |
| `CHANNEL_DM_LOG`                                                     | Where direct messages to the bot are mirrored                                                                              |
| `WEBHOOK_SLASH_LOGGING`, `WEBHOOK_PREFIX_LOGGING`                    | Command usage webhooks                                                                                                     |
| `WEBHOOK_BUG_REPORTS`, `WEBHOOK_SUGGESTIONS`                         | Destinations for `/bug-report` and `/suggest`                                                                              |
| `WEBHOOK_CONSOLE_LOGGING`                                            | Mirrors warnings and errors to Discord                                                                                     |
| `TMDB_API_KEY`                                                       | Enables `/movie-tracker`                                                                                                   |
| `CLASH_ROYALE_API_KEY`                                               | Enables `/clash-royale`                                                                                                    |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` | Enables `/spotify`                                                                                                         |
| `OAUTH_PORT`, `OAUTH_STATE_SECRET`                                   | The OAuth callback server; the secret signs the `state` parameter                                                          |
| `TOKEN_ENCRYPTION_KEY`                                               | 32 bytes of hex. **Required before any third-party OAuth token is stored** — tokens are encrypted at rest with AES-256-GCM |

Generate the two secrets with:

```bash
openssl rand -hex 32
```

Every optional feature degrades cleanly: leave the variable unset and the
commands that need it say so instead of failing.

---

## Scripts

| Script                                      | What it does                                           |
| ------------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                               | Runs from source with hot reload                       |
| `npm run build`                             | Compiles to `dist/` and copies `assets/`               |
| `npm start`                                 | Runs the build                                         |
| `npm run typecheck`                         | `tsc --noEmit`                                         |
| `npm run lint` / `lint:fix`                 | ESLint                                                 |
| `npm run format` / `format:check`           | Prettier                                               |
| `npm test` / `test:watch` / `test:coverage` | Jest                                                   |
| `npm run check`                             | Typecheck, lint, format check and tests — what CI runs |
| `npm run env:setup`                         | Interactive `.env` generator                           |
| `npm run db:wipe`                           | Clears every collection, with confirmation             |
| `npm run codebase:info`                     | Line and file counts per area                          |

---

## Architecture

```
src/
├── index.ts             Boot: build the container, register, connect, log in
│
├── core/                Framework. No feature logic lives here.
│   ├── client.ts        TestifyClient — typed, no monkey-patched properties
│   ├── loader.ts        Module discovery that resolves from its own tree, not the CWD
│   ├── registry.ts      Validating registration for commands, events, components
│   ├── router.ts        One component router keyed by custom-ID namespace
│   ├── customId.ts      Typed custom-ID codec, one separator, length-checked
│   ├── middleware.ts    blacklist · owner · guild · NSFW · permissions · cooldown
│   ├── execute.ts       The single error boundary, shared by both surfaces
│   ├── messagePipeline.ts  Ordered message processors instead of many listeners
│   ├── errors.ts        Typed errors; user-facing ones are shown verbatim
│   ├── logger.ts        One structured logger (pino) with an optional webhook sink
│   ├── timers.ts        Timer registry, so shutdown can clear everything
│   └── shutdown.ts      Graceful shutdown
│
├── config/              env (schema-validated) · theme · strings · constants · categories
├── database/            connection · models (interface + Schema<T> + model<T>) · repositories
├── features/<feature>/  commands · components · events · messages · services · data
├── adapters/            slash.ts and prefix.ts — the two surfaces
├── integrations/        Typed external API clients, validated at the boundary
├── ui/                  embeds · components · pagination · format · canvas
├── jobs/                Scheduled work, all with overlap guards
└── server/              The OAuth callback app — exported, never self-starting
```

### The ideas that hold it together

**One implementation, two surfaces.** A command declares
`surfaces: ["slash", "prefix"]` and receives a `CommandContext`. The adapters
translate options, replies and ephemerality per surface, so command logic never
branches on how it was invoked.

**One listener per gateway event.** Components route through a namespace codec;
message features register ordered processors. Nothing fans out.

**Repositories own every query.** All balance mutations are atomic, so
concurrent commands cannot lose writes.

**Everything is registered.** Timers go to the timer registry, so `SIGINT`
clears them. Commands, events and components are validated at load time and a
malformed module fails the boot with its own filename.

---

## Writing a command

Create a file under `src/features/<feature>/commands/`. It is picked up
automatically — there is nothing to register by hand.

```ts
import { Category } from "../../../config/categories";
import { defineCommand } from "../../../core/command";
import { UserFacingError } from "../../../core/errors";
import { embed } from "../../../ui/embeds";

export default defineCommand({
	name: "greet",
	description: "Says hello to someone.",
	category: Category.Fun,
	surfaces: ["slash", "prefix"],
	aliases: ["hi"],
	cooldownMs: 5_000,
	options: [{ name: "user", description: "Who to greet.", type: "user", required: true }],

	async execute(ctx) {
		const target = ctx.options.getUser("user", true);
		if (target.bot) throw new UserFacingError("Bots do not appreciate greetings.");

		await ctx.reply({ embeds: [embed({ category: Category.Fun, description: `Hello, ${target}.` })] });
	},
});
```

`throw new UserFacingError(...)` shows the message to the user. Anything else is
logged with full context, reported to the error channel and replaced with a
generic message.

Components live beside it in `components/`, keyed by a namespace registered in
`core/customId.ts`:

```ts
export default defineComponent({
	namespace: Namespace.Shop,
	ownerOnly: true,
	async handle(ctx) {
		/* ctx.action, ctx.args */
	},
});
```

---

## Testing

```bash
npm test
npm run test:coverage
```

`CommandContext` is trivially mockable, so testing a command does not mean
faking an interaction:

```ts
const ctx = createMockContext({ options: { strings: { amount: "all" } } });
await balance.execute(ctx);
expect(ctx.replies[0]?.embeds).toBeDefined();
```

Repository tests run against an in-memory MongoDB. Where the binary cannot be
downloaded, those suites skip themselves with a warning rather than failing; set
`SKIP_DB_TESTS=1` to skip them deliberately.

---

## Migrating from v1

v2 is a rewrite. The collections keep their names, so existing data is found,
but **field names moved to `camelCase`** (`Guild` → `guildId`, `User` → `userId`,
and so on) and the two models that shared the `economies` collection were merged
into one.

Before upgrading a live deployment:

1. **Back up the database.**
2. Run the field migration:
   ```bash
   npx tsx scripts/migrateFromV1.ts --dry-run
   npx tsx scripts/migrateFromV1.ts
   ```
3. Regenerate `.env` with `npm run env:setup` — variable names changed to one
   consistent `SCREAMING_SNAKE_CASE` convention.

Two features changed shape deliberately:

- **Valorant** no longer signs users in to Riot. The previous version asked for
  account credentials and stored the resulting tokens in plaintext. `/valorant`
  now covers agents, weapons and maps from the public catalogue.
- **Verification** uses a short code in a modal rather than a captcha image,
  which removes a native image dependency.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: `npm run check` has to pass,
commits follow Conventional Commits, and the pre-commit and pre-push hooks run
the same checks CI does.

Security issues: see [SECURITY.md](SECURITY.md).

---

## Licence

MIT — see [LICENSE](LICENSE).
