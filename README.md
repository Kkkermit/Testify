<div align="center">

# Testify

**An open source, multipurpose Discord bot written in TypeScript.**

Moderation · economy · levelling · music · tickets · giveaways · games

Every command works as `/ban` **and** as `t?ban`.

[![CI](https://github.com/Kkkermit/Testify/actions/workflows/ci.yml/badge.svg)](https://github.com/Kkkermit/Testify/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.11-brightgreen.svg)](https://nodejs.org)

</div>

## What you need

- **Node.js 22.11 or newer** — `.nvmrc` pins the version, so `nvm use` picks it up
- **MongoDB** — a local install or a free Atlas cluster
- A **Discord application** with the _Message Content_, _Server Members_ and _Presence_ intents switched on

FFmpeg comes with the project; there is nothing extra to install for music.

## Get it running

```bash
git clone https://github.com/Kkkermit/Testify.git
cd Testify
npm install
npm run setup   # asks for your token, database and so on, then writes .env
npm run dev     # starts the bot and restarts it when you save a file
```

That is the whole setup. `npm run setup` only asks for four things:

| Setting             | Where to find it                                                               |
| ------------------- | ------------------------------------------------------------------------------ |
| `DISCORD_TOKEN`     | Developer Portal → your app → Bot → Reset Token                                |
| `DISCORD_CLIENT_ID` | Developer Portal → your app → General Information                              |
| `DISCORD_OWNER_IDS` | Your own user ID (turn on Developer Mode, right-click yourself → Copy User ID) |
| `MONGODB_URI`       | `mongodb://localhost:27017/testify`, or your Atlas connection string           |

Everything else in [`.env.example`](.env.example) is optional and can stay blank.

> **Tip:** set `DISCORD_DEV_GUILD_ID` to your test server's ID while you are
> working. Commands show up there straight away instead of taking up to an hour.

For production: `npm run build` then `npm start`.

### If it will not connect to the database

The bot tells you what to try, but the common ones are:

| What you see                 | What it usually means                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `querySrv ECONNREFUSED`      | Your DNS server will not do SRV lookups. Switch to 1.1.1.1 / 8.8.8.8, drop any VPN, or use the non-SRV connection string from Atlas (Connect → Drivers → Node.js 2.2.12 or earlier). |
| `Authentication failed`      | Wrong user or password. If the password has `@ : / ? # [ ]` in it, percent-encode it.                                                                                                |
| `Server selection timed out` | Your IP is not on the Atlas allow list. Atlas → Network Access.                                                                                                                      |
| `ENOTFOUND`                  | Typo in the hostname, or the cluster is paused.                                                                                                                                      |

Put the database name in the URI, before the `?`, or you will end up writing to
a database called `test`:

```
mongodb+srv://user:password@cluster.mongodb.net/testify?retryWrites=true
                                                ^^^^^^^^
```

## What it can do

| Category       | What you get                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **Moderation** | ban, kick, mute, softban with automatic expiry, warnings, lock, clear, slowmode, roles, AutoMod  |
| **Economy**    | balances, daily streaks, work, rob, heists, gambling, a shop, pets, a lottery and treasure drops |
| **Levelling**  | XP per message, level-up announcements, boost roles, rank cards and a leaderboard                |
| **Music**      | play, queue, skip, seek, filters, loop, shuffle, autoplay and radio                              |
| **Tickets**    | a ticket panel, claiming, locking and HTML transcripts                                           |
| **Settings**   | welcome messages, auto-roles, anti-link, sticky messages, counting, verification, audit logging  |
| **Fun**        | memes, ASCII art, blackjack, would-you-rather, rock-paper-scissors and more                      |

The full list lives in [COMMANDS.md](COMMANDS.md), which is generated from the code.

## Slash and prefix

Every command answers to both, and each one is written only once:

```
/ban user:@someone reason:spamming
t?ban @someone spamming
```

- The default prefix is `t?`. Change it per server with `/prefix set !`.
- Mentioning the bot works anywhere: `@Testify help`.
- Options are filled in order, and the last text option takes the rest of the
  message — so you rarely need quotes. Use `"quotes"` when you do.
- Popular commands have short forms: `t?bal`, `t?lb`, `t?p`, `t?np`, `t?av`.

Replies that would be private on a slash command are sent in the channel
instead, since a normal message cannot be ephemeral.

## How the project is laid out

```
src/
  index.ts        starts everything
  config/         env, categories, theme, constants — the knobs you turn
  core/           the small framework: client, command, button, event, loader
  commands/       one file per command, in a folder named after its category
  buttons/        button, select-menu and modal handlers
  events/         Discord gateway events
  events/message/ things that run on every message
  jobs/           repeating background work
  lib/            shared helpers: embeds, components, formatting, pagination
  database/       Mongoose models and the functions that read and write them
```

There is no registry to update and nothing to import by hand. Drop a file in the
right folder and it is picked up when the bot starts.

## Adding a command

Create `src/commands/fun/coinflip.ts`:

```ts
import { defineCommand } from "../../core/command";
import { embed } from "../../lib/embeds";
import { reply } from "../../lib/reply";

export default defineCommand({
	name: "coinflip",
	description: "Flips a coin.",
	category: "fun",

	async run(interaction) {
		const side = Math.random() < 0.5 ? "Heads" : "Tails";
		await reply(interaction, { embeds: [embed({ category: "fun", description: side })] });
	},
});
```

Restart the bot and both `/coinflip` and `t?coinflip` are live. That is all of it —
you never write the prefix version, `src/core/prefix.ts` handles it.

**Options** are described rather than built:

```ts
options: [
	{ name: "user", description: "Who to flip for.", type: "user", required: true },
	{ name: "times", description: "How many flips.", type: "integer", min: 1, max: 10 },
],
```

**Subcommands** work the same way and are dispatched for you:

```ts
subcommands: [
	{ name: "set", description: "Sets it.", async run(interaction) { /* … */ } },
	{ name: "clear", description: "Clears it.", async run(interaction) { /* … */ } },
],
```

**Aliases** are prefix-only short forms:

```ts
aliases: ["cf", "flip"],
```

**Guards** are fields, not code you write:

```ts
guildOnly: true,
cooldown: 5_000,
permissions: [PermissionFlagsBits.ManageMessages],
botPermissions: [PermissionFlagsBits.ManageMessages],
```

**Errors** are thrown, not replied to. `UserFacingError` is shown to the user word
for word; anything else is logged and the user gets a generic apology.

```ts
if (amount > account.wallet) throw new UserFacingError("You do not have that much.");
```

## Adding a button

Buttons are matched on the first part of their custom ID:

```ts
// src/buttons/coinflip.ts
import { defineButton } from "../core/button";

export default defineButton({
	id: "coinflip",
	ownerOnly: true,
	async run(interaction, { action }) {
		await interaction.update({ content: `You pressed ${action}.` });
	},
});
```

Build the ID with `customId("coinflip", "again", interaction.user.id)`. Put the
user's ID last and `ownerOnly` stops anyone else pressing it.

## Making it yours

- **Colours, emoji and links** — `src/config/theme.ts`
- **Categories** — `src/config/categories.ts`
- **Cooldowns, limits and payouts** — `src/config/constants.ts`
- **Wording** — `src/config/strings.ts`

## Scripts

| Command                 | What it does                            |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Runs the bot, restarting on save        |
| `npm run build`         | Compiles to `dist/`                     |
| `npm start`             | Runs the compiled bot                   |
| `npm run setup`         | Writes a `.env`                         |
| `npm test`              | Runs the tests                          |
| `npm run check`         | Typecheck, lint, format check and tests |
| `npm run docs:commands` | Regenerates `COMMANDS.md`               |
| `npm run db:wipe`       | Empties the database, after confirming  |

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
`npm run check` is what CI runs, so if it passes locally it will pass there.

## Licence

MIT — see [LICENSE](LICENSE).
