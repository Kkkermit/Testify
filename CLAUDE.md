# CLAUDE.md — working on Testify

Everything needed to work on this repo: how the bot is built, how to run and test it, the conventions, and the
rules that have been agreed over time. Read this first. It is written so that someone (or some Claude) arriving
with no memory of previous sessions can make a correct change and commit it.

> [!IMPORTANT]
> Two companion documents, both authoritative in their own area:
>
> - [`.codebase-notes/`](.codebase-notes/00-INDEX.md) — the architecture, data model and the 100-finding audit
>   of the original JavaScript bot. Read it for _what the code does and why_.
>   [`migration/17-CODING-STANDARDS.md`](.codebase-notes/migration/17-CODING-STANDARDS.md) is the deeper
>   treatment of naming and error handling; **where it and this file overlap, it wins**.
> - [`COMMANDS.md`](COMMANDS.md) — the command list. **Generated. Never hand-edit it**; run
>   `npm run docs:commands`.

---

## Contents

1. [What this project is](#1-what-this-project-is)
2. [Getting set up](#2-getting-set-up)
3. [Running, testing, verifying](#3-running-testing-verifying)
4. [Project structure](#4-project-structure)
5. [How a command runs, end to end](#5-how-a-command-runs-end-to-end)
6. [Naming conventions](#6-naming-conventions)
7. [Import aliases and barrels](#7-import-aliases-and-barrels)
8. [Adding a command](#8-adding-a-command)
9. [Adding an event](#9-adding-an-event)
10. [Adding an interactive panel](#10-adding-an-interactive-panel)
11. [Components V2](#11-components-v2)
12. [Multi-guild rules](#12-multi-guild-rules)
13. [Data layer](#13-data-layer)
14. [Config and environment](#14-config-and-environment)
15. [Logging](#15-logging)
16. [Errors](#16-errors)
17. [Testing](#17-testing)
18. [Lint, format, style](#18-lint-format-style)
19. [Committing and branching](#19-committing-and-branching)
20. [CI](#20-ci)
21. [Decisions already made — do not relitigate](#21-decisions-already-made--do-not-relitigate)
22. [Anti-patterns that must not come back](#22-anti-patterns-that-must-not-come-back)
23. [Working style expected here](#23-working-style-expected-here)
24. [The dashboard](#24-the-dashboard)

---

## 1. What this project is

**Testify v2** — a multi-purpose Discord bot, written as a full TypeScript rewrite of the original JavaScript
bot. discord.js v14, MongoDB via Mongoose, Node ≥ 24.11.

The defining architectural decision: **one command object serves both the slash and the prefix surface.** The
original had two near-duplicate implementations of every command; here a command is written once against the
`CommandInput` contract, and `src/core/prefix.ts` is the only file that knows prefix commands exist. Keep it
that way — it is the reason the rewrite exists.

Current size (verify with the commands in [§3](#3-running-testing-verifying) rather than trusting these
numbers, which drift):

| Thing                | Count                            |
| -------------------- | -------------------------------- |
| Commands             | 76, across 12 categories         |
| Command files        | 98 (incl. folded-in subcommands) |
| Subcommands          | 122                              |
| Prefix aliases       | 65                               |
| Button handlers      | 17                               |
| Events               | 24, in 5 groups                  |
| `src/lib` helpers    | 39                               |
| Schemas/repositories | 9 / 9                            |
| Scheduled jobs       | 4                                |
| Tests                | ~1081 across 55 suites           |

**There is no music system.** It was removed deliberately — see
[§21](#21-decisions-already-made--do-not-relitigate). Do not add one back without reading that section.

---

## 2. Getting set up

```bash
nvm use                 # or install Node >= 24.11
npm ci                  # ALWAYS ci, never install, unless changing dependencies
npm run setup           # interactive: writes .env
npm run setup -- --dev  # writes .env.development instead
```

`npm run setup` asks for each value and retries on the required ones. To do it by hand, copy `.env.example` to
`.env` (or `.env.development.example` to `.env.development`) and fill it in.

**Required env:** `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_OWNER_IDS` (comma-separated), `MONGODB_URI`.
**Optional:** `NODE_ENV`, `LOG_LEVEL`, `DISCORD_DEV_GUILD_ID`, `CHANNEL_ERROR_LOG`, `CHANNEL_GUILD_LOG`,
`CHANNEL_DM_LOG`, `CHANNEL_FEEDBACK_LOG`, and the `DASHBOARD_*` block — off unless you want the web dashboard,
and covered in [§24](#24-the-dashboard).

Then:

```bash
npm run dev     # development bot, hot reload, reads .env.development
npm run build   # compile to dist/
npm start       # production bot from dist/, reads .env
```

> [!WARNING]
> **`npm run dev` must never start the production bot.** It sets `NODE_ENV=development` via `cross-env`, which
> is what makes `loadEnv()` read `.env.development`. This was a real bug once — the script had no `cross-env`,
> so `dev` silently ran production. There is a regression test for it. Do not remove `cross-env`.

Never commit real tokens, snowflakes, database passwords or cluster hostnames. `.gitignore` covers `.env*`
except the `.example` templates. Use `cluster0.example.mongodb.net` in any documentation.

---

## 3. Running, testing, verifying

| Command                  | What it does                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| `npm run dev`            | Development bot with hot reload                                      |
| `npm run dev:all`        | Bot and dashboard together — see [§24](#24-the-dashboard)            |
| `npm start`              | Production bot from `dist/`                                          |
| `npm run build`          | shared → `tsup` to `dist/` → dashboard. `tsc-alias` rewrites `@`s    |
| **`npm run check`**      | **typecheck → lint → format:check → test. Run before every commit.** |
| `npm run typecheck`      | `tsc --noEmit`                                                       |
| `npm run lint`           | ESLint via `scripts/lintRunner.ts` (errors fail, warnings never do)  |
| `npm run lint:fix`       | Same, with `--fix`                                                   |
| `npm run format`         | Prettier write                                                       |
| `npm test`               | Jest                                                                 |
| `npm run test:coverage`  | Jest with the 80/80/80/80 thresholds enforced                        |
| `npm run test:watch`     | Jest watch                                                           |
| `npm run docs:commands`  | Regenerate `COMMANDS.md`                                             |
| `npm run secret`         | Generate `DASHBOARD_SESSION_SECRET`. `-- --write` puts it in `.env`  |
| `npm run commit`         | Guided commit wizard (enforces the message format)                   |
| `npm run commands:clear` | Deregister all application commands                                  |
| `npm run db:wipe`        | Destructive. Wipes the database                                      |
| `npm run audit`          | `better-npm-audit --level high`, reading `.nsprc`                    |

### The verification discipline — this part matters

`npm run check` passing is **necessary but not sufficient**. A broken loader glob compiles perfectly, passes
every test, and registers nothing. Several real bugs in this repo's history were invisible to the type checker.
So after any change to the loader, the build, file names, or a `define*` contract, also:

**1. Build and smoke-test the loader against the real `dist/`:**

```bash
rm -rf dist && npm run build
cat > loadcheck.cjs <<'EOF'
const { loadEverything } = require("./dist/core/loader.js");
const { Collection } = require("discord.js");
const stub = { commands:new Collection(), prefixCommands:new Collection(), aliases:new Collection(),
 buttons:new Collection(), modals:new Collection(), selects:new Collection(), contextMenus:new Collection(),
 messageHandlers:[], on:()=>stub, once:()=>stub,
 logger:{debug(){},info(){},warn(){},error(){},trace(){}} };
console.log(loadEverything(stub));
console.log("buttons:", [...stub.buttons.keys()].sort().join(", "));
console.log("aliases:", stub.aliases.size);
EOF
node loadcheck.cjs; rm -f loadcheck.cjs
```

Expect counts that match what you expect, and no missing handler. This has caught more real breakage than the
test suite has.

**2. Check `dist/` has no unrewritten aliases.** `tsup` runs with `bundle: false`, so esbuild does **not**
rewrite `@core/…` specifiers; `tsc-alias` does, in `onSuccess`. If that breaks, `dist/` will not start.

```bash
grep -rl 'require("@core\|require("@lib\|require("@commands' dist   # must find nothing
```

`@napi-rs/canvas` and other real scoped packages will still show up in a looser grep — that is fine.

**3. If you touched dependencies, prove a clean install works:**

```bash
rm -rf node_modules && npm ci
```

`npm install` and `npm ci` disagree about lockfiles in ways that only show up in CI. A malformed lockfile once
broke CI with `EUSAGE` while local `npm install` was perfectly happy.

**4. If you added an enforcement test, prove it can fail.** Introduce the violation, watch the test go red,
then revert. A convention test that passes vacuously is worse than none, because it grants false confidence.

---

## 4. Project structure

Grouped by **technical role first, then domain**. One feature is spread across layers; that is intended.

```
src/
├── index.ts              Entry point. One async main() that awaits each step in order.
├── core/                 The framework. 13 files, no domain logic.
│   ├── client.ts         TestifyClient — subclasses discord.js Client, declares its own fields
│   ├── loader.ts         Finds and registers everything from disk. Globs live here.
│   ├── command.ts        Command + CommandInput contract, defineCommand, asSubcommand
│   ├── prefix.ts         The ONLY file that knows prefix commands exist
│   ├── button.ts         Button contract, defineButton, customId / parseCustomId
│   ├── event.ts          defineEvent
│   ├── message.ts        Message-handler contract (automod, counting, levelling XP …)
│   ├── checks.ts         Gates: permissions, cooldowns, guildOnly, ownerOnly, nsfw
│   ├── errors.ts         UserFacingError, toError, runCommand wrapper
│   ├── logger.ts         pino transport
│   ├── shutdown.ts       Graceful shutdown + signal handlers
│   ├── paths.ts          Path resolution from __dirname (never the CWD)
│   └── index.ts          Barrel
├── config/               Constants. Zero runtime logic.
│   ├── env.ts            EVERYTHING from process.env, zod-validated. Nothing else reads env.
│   ├── categories.ts     The category union — single source of truth
│   ├── constants.ts      Fixed operational values (ECONOMY, cooldowns …)
│   ├── theme.ts          Colours, emoji, repo URL
│   └── strings.ts        User-facing copy
├── commands/<category>/  100 files. Deeper `subcommands/` folders are NOT auto-loaded.
├── events/               24 handlers in CommandEvents, CreateEvents, LoggingEvents, ReadyEvents, message
├── buttons/              15 component handlers, keyed by custom-ID prefix
├── lib/                  33 domain helpers, formatters and panel renderers
├── database/
│   ├── connection.ts
│   ├── models/           9 Mongoose schemas
│   └── repositories/     9 query layers. Commands never touch a model directly.
├── jobs/                 4 scheduled jobs (lottery draw, passive income, bot stats, softban expiry)
└── api/                  The dashboard's HTTP API. Off unless DASHBOARD_ENABLED — see §24.

tests/                    Mirrors src/. 50 suites.
└── helpers/              mocks.ts, mongo.ts, containers.ts (shared harness — not tests)
scripts/                  One-off tooling. `no-console` is off here.
shared/                   npm workspace @testify/shared — types and zod both surfaces import
dashboard/                npm workspace — the Vite + React SPA
dashboard-POC/            The dashboard's design documents. Read before changing §24
.codebase-notes/          Architecture + audit of the original JS bot
```

**Categories:** `community`, `economy`, `fun`, `games`, `info`, `levelling`, `moderation`, `settings`,
`tickets`, `giveaway`, `developer`, `owner`. Defined `as const` in `src/config/categories.ts` with a derived
union type, so a mistyped category is a **compile error**. Adding a category there is all that is needed for
`/help` to pick it up.

### Where to look for a given job

| I want to…                                 | Go to                                                              |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Add or change a command                    | `src/commands/<category>/*.command.ts`                             |
| Change how commands are found              | `src/core/loader.ts` (the globs)                                   |
| Change a permission or cooldown gate       | `src/core/checks.ts`                                               |
| Change how prefix commands parse           | `src/core/prefix.ts` — the only file that knows they exist         |
| Build a button/select/modal                | `src/lib/components.util.ts`                                       |
| Build a Components V2 message              | `src/lib/containers.util.ts`                                       |
| Build an embed                             | `src/lib/embeds.util.ts` (nothing else may `new EmbedBuilder()`)   |
| Draw an image card                         | `src/lib/canvas.util.ts`, then a `*Card.util.ts` beside it         |
| Change how XP or level rewards work        | `src/lib/levelling.util.ts` — pure rules, no database              |
| Reply to an interaction                    | `src/lib/reply.util.ts`                                            |
| Format a number, duration, time            | `src/lib/format.util.ts`                                           |
| Query the database                         | `src/database/repositories/*.ts` — never a model directly          |
| Add an env variable                        | `src/config/env.ts` + both `.env*.example` + `scripts/setupEnv.ts` |
| Change user-facing copy                    | `src/config/strings.ts`                                            |
| Change a colour or emoji                   | `src/config/theme.ts`                                              |
| Add a scheduled job                        | `src/jobs/*.util.ts` + `events/ReadyEvents/scheduleJobs.event.ts`  |
| Share logic between a command and a button | `src/lib/*Actions.util.ts` (e.g. `economyActions.util.ts`)         |

### The panel renderers in `src/lib`

Each is a pure state→message function paired with a handler in `src/buttons/`. Copy the closest one.

| Renderer                  | Handler                | Pattern it demonstrates                                    |
| ------------------------- | ---------------------- | ---------------------------------------------------------- |
| `shopScreen.util.ts`      | `buttons/shop.ts`      | Paged catalogue, per-item buttons, confirm step            |
| `auditPanel.util.ts`      | `buttons/auditLog.ts`  | Draft edits in a bit-packed custom ID, then Save           |
| `levelPanel.util.ts`      | `buttons/levelling.ts` | Tabs, per-row cycle buttons, pre-ticked role/channel menus |
| `balancePanel.util.ts`    | `buttons/balance.ts`   | Hub panel, read-only mode for other users                  |
| `inventoryScreen.util.ts` | `buttons/inventory.ts` | Per-row action button, paging in the custom ID             |
| `settingsPanel.util.ts`   | —                      | Generic settings rows + pre-filled modal editors           |
| `musicPanel` — **gone**   | —                      | Removed with the music system. Do not resurrect.           |

Image cards are the other half of the UI: `canvas.util.ts` holds the primitives, `rankCard.util.ts` draws
`/rank`, `boardCard.util.ts` draws both leaderboards, and `welcomeCard.util.ts` the join card. Each keeps its
layout maths in pure exported functions (`rankCardText`, `barFill`, `boardHeight`) so the parts that can be
wrong are tested without a canvas or a network. `drawAvatarOrInitial` falls back to a lettered circle, so a card
still renders when Discord's CDN is unreachable.

**Two panels, two different answers about when to write.** Copy whichever fits:

- **Save-button panels** (`auditPanel`) batch edits into a draft carried in the custom ID and write once. Use
  this when the settings are one decision — the audit picker is "which events, where", and half of it applied is
  not a state anyone wants.
- **Apply-immediately panels** (`levelPanel`, `settingsPanel`) write on every press and re-read before each one.
  Use this when each control is independent, which is most config: there is nothing to batch, and a Save button
  would just be a step between the admin and the thing they already decided.

Two exceptions worth knowing: `buttons/treasure.ts` keeps its `treasurePanel` and `settingsOf` in the handler
file rather than a separate renderer (it composes `settingsPanel.util.ts` instead), and `buttons/money.ts` still
returns an embed-based `RenderedScreen`. Both are fine; new panels should prefer the split.

---

## 5. How a command runs, end to end

Worth understanding before changing anything in `core/`.

**Startup** (`src/index.ts`) — the order is load-bearing, and every step of it fixes a real bug in the original:

```ts
async function main(): Promise<void> {
	const env = loadEnv(); // 1. env first, validated, fail-fast
	const logger = createLogger(env.LOG_LEVEL); // 2. then the logger
	const client = new TestifyClient(env, logger);
	handleProcessSignals(client); // registered exactly once
	await connectDatabase({ uri: env.MONGODB_URI, logger });
	const counts = loadEverything(client); // globs the tree, registers everything
	await publishCommands(client); // AWAITED, before login
	await client.login(env.DISCORD_TOKEN);
}
```

**Command registration scope** — this is the single-guild vs multi-guild switch:

- `DISCORD_DEV_GUILD_ID` **set** → commands register to that guild only, and appear instantly.
- `DISCORD_DEV_GUILD_ID` **blank** → commands register globally, and take up to an hour to roll out.

**Dispatch:**

- Slash → `events/CommandEvents/interactionCreate.event.ts` → `checks.ts` gates → `command.run(input, client)`
- Prefix → `events/message/…` → `core/prefix.ts` resolves name or alias → **the same** `command.run`
- Components → the one `interactionCreate` listener → `client.buttons` registry keyed by the custom-ID prefix →
  `button.run(interaction, { client, action, args })`

There is **exactly one** `interactionCreate` listener. The original had 27.

---

## 6. Naming conventions

**camelCase basename + a domain suffix.** The suffix makes the kind of module visible in an editor tab, a stack
trace and a `git log` line — and for commands and events it is **load-bearing**, because the loader globs on it.
A file that misses its suffix is silently never registered.

| Suffix        | For                              | Example                              |
| ------------- | -------------------------------- | ------------------------------------ |
| `.command.ts` | a command, on both surfaces      | `commands/moderation/ban.command.ts` |
| `.event.ts`   | a gateway event handler          | `events/ReadyEvents/ready.event.ts`  |
| `.util.ts`    | a shared helper                  | `lib/duration.util.ts`               |
| `.schema.ts`  | a Mongoose model                 | `database/models/economy.schema.ts`  |
| `.test.ts`    | a test (drops the source suffix) | `tests/core/loader.test.ts`          |

Loader globs: `commands/*/*.command.{js,ts}` and `events/**/*.event.{js,ts}`.
`tests/core/conventions.test.ts` enforces the suffixes.

**Unsuffixed, deliberately:** `src/index.ts`, everything in `src/core/` and `src/config/`, everything in
`src/buttons/`, everything in `scripts/`, and `*.config.ts` at the root.

**There is no `.slash.ts` or `.prefix.ts`, and reintroducing either would be a mistake.** Commands were renamed
from `.slash.ts` to `.command.ts` precisely because one object serves both surfaces — a suffix naming one surface
describes an architecture this codebase does not have. There has never been a single `.prefix.ts` file.

The original's `.function.js` layer has **no counterpart here and must not be introduced** — that job is
`core/loader.ts`, and a typed loader beats a set of files that mutate the client.

---

## 7. Import aliases and barrels

Always import by alias. Never a relative path that climbs (`../../`).

```ts
import { theme } from "@config/theme";
import { embed } from "@lib/embeds.util";
import { defineCommand, type CommandInput } from "@core/command";
```

| Alias                                                                      | Points at               | Barrel? |
| -------------------------------------------------------------------------- | ----------------------- | ------- |
| `@core`                                                                    | `src/core/index.ts`     | yes     |
| `@config`                                                                  | `src/config/index.ts`   | yes     |
| `@lib`                                                                     | `src/lib/index.ts`      | yes     |
| `@database`                                                                | `src/database/index.ts` | yes     |
| `@commands/*`, `@events/*`, `@buttons/*`, `@jobs/*`, `@root/*`, `@tests/*` | direct                  | no      |

**One alias map only** — `tsconfig.json` `compilerOptions.paths`. `jest.config.ts` derives its mapper from it;
`tsup` reads it and `tsc-alias` rewrites the build from it. Never write a second literal copy. Each aliased
directory is declared twice: bare for the barrel, wildcard for a single module, because a bare specifier does
not match a wildcard path.

**Every target starts `./`.** There is no `baseUrl` — it is deprecated in TypeScript 6 and gone in 7 — so path
targets resolve relative to `tsconfig.json` itself and a bare `src/…` is a compile error. Only `//` line
comments may be added to that file: `jest.config.ts` strips those before `JSON.parse`, and a `/* */` block would
break the test run.

`module` is `Preserve` and `moduleResolution` is `Bundler`, because `tsc` only type-checks here — `tsup`/esbuild
does the emit. `Node` is deprecated, and `Node16` would be right if `tsc` emitted, but it rejects dual packages
that ship a single `.d.ts` (`mathjs`) even though `require()` of them works. That was verified against the real
build, not assumed.

> [!WARNING]
> Barrels plus `import-x/no-cycle` need care — `src/lib/` and `src/core/` already reference each other, and
> adding a barrel export can turn a fine dependency into a cycle. Add exports leaf-first and let the lint rule
> (configured at `maxDepth: 6`) be the check. Do **not** work around a cycle with a `require()` inside a
> function body; that is a smell, not a pattern.

---

## 8. Adding a command

Create **one file**. The loader finds it, `/help` lists it, and it works as both `/name` and `t?name`.

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

Full `Command` shape: `name`, `description`, `category` (required); then optional `options`, `subcommands`,
`aliases`, `permissions`, `botPermissions`, `cooldown` (ms), `guildOnly`, `ownerOnly`, `nsfw`, `run`,
`autocomplete`. `run` is optional when the command is nothing but subcommands.

Rules:

1. **`export default defineCommand({ … })`.** The loader fails start-up and names the file otherwise.
2. **`category` must be a key of `CATEGORIES`.** A typo is a compile error.
3. **Use `reply()` from `@lib/reply.util`**, never `interaction.reply` directly — it picks `reply` vs
   `editReply` vs `followUp` based on `deferred`/`replied`. Calling reply twice throws
   `InteractionAlreadyReplied`.
4. **Build embeds with `embed()` / `successEmbed()` / `errorEmbed()` from `@lib/embeds.util`.** A
   `no-restricted-syntax` lint rule blocks bare `new EmbedBuilder()` outside the three files allowed to build
   them.
5. **Throw `UserFacingError` for anything the user did wrong.** See [§16](#16-errors).
6. **Guard with the declarative fields** (`guildOnly`, `permissions`, …) rather than hand-rolled checks in
   `run`. `checks.ts` handles them uniformly and the failure messages stay consistent.
7. **Use `inGuild(interaction)` / `asMember(interaction)` / `inTextChannel(interaction)`** from `@core/command`
   to narrow types after `guildOnly: true`. They throw a `UserFacingError` rather than returning null.
8. Run `npm run docs:commands` afterwards.

**Discord caps top-level commands at 100.** When close to it, group: move the file into a `subcommands/` folder
(which the loader does **not** scan) and expose it from a parent with `asSubcommand`:

```ts
// src/commands/fun/fun.command.ts
import { asSubcommand, defineCommand } from "@core/command";
import dadJoke from "@commands/fun/subcommands/dadJoke.command";

export default defineCommand({
	name: "fun",
	description: "Jokes, generators and other nonsense.",
	category: "fun",
	subcommands: [asSubcommand(dadJoke, ["dadjoke"])],
});
```

The folded-in file stays an ordinary command file — nothing inside it changes, and it keeps its own name as a
prefix alias, so `t?dad-joke` still works alongside `/fun dad-joke`.

---

## 9. Adding an event

```ts
// src/events/CreateEvents/guildCreate.event.ts
import { defineEvent } from "@core/event";

export default defineEvent({
	name: "guildCreate",
	once: false,
	async run(client, guild) {
		client.logger.info({ guildId: guild.id }, "[GUILD] Joined a new server");
	},
});
```

**The client comes first, then the event payload.** `defineEvent` is generic over the event name, so the payload
is correctly typed for whichever event you named — and a handler whose parameters are in the wrong order is a
compile error. In the original JS bot two features were silently dead for exactly that reason.

Group it into `ReadyEvents/`, `CommandEvents/`, `CreateEvents/`, `LoggingEvents/` or `message/`. Any depth under
`src/events/` is scanned.

`once: true` for start-up work. Never register a handler both in a file and by hand elsewhere — the original
did, so every signal fired twice.

---

## 10. Adding an interactive panel

This is the dominant UI pattern in the repo. Every panel is **two pieces**:

**1. A pure renderer in `src/lib/<name>Panel.util.ts` or `<name>Screen.util.ts`** — state in, message out. No
database calls, no interaction object. This is what makes it unit-testable.

**2. A handler in `src/buttons/<name>.ts`** — `defineButton({ id, ownerOnly, run })`.

Both call the same renderer, so the first render and every re-render cannot drift. Examples to copy:
`shopScreen.util.ts` + `buttons/shop.ts`, `auditPanel.util.ts` + `buttons/auditLog.ts`,
`balancePanel.util.ts` + `buttons/balance.ts`, `inventoryScreen.util.ts` + `buttons/inventory.ts`.

### Custom IDs

`customId(id, action, ...args)` builds `id:action:arg1:arg2`. `parseCustomId` splits it back. `id` selects the
handler and must be unique bot-wide; `action` and `args` arrive in the handler's `context`.

`customId()` **throws** if a part contains `:` or the result exceeds Discord's 100 characters — deliberately, so
you find out while writing rather than when Discord rejects the whole message.

### Two absolute rules about state

- **Never store per-interaction state on the client or in a module-level variable.** The original had
  `client.helpData` — global, single-slot, shared across every guild and user, so two people using `/help` at
  once corrupted each other's session.
- **Either encode the state in the custom ID, or re-read it from the database.** Encode small things (page
  number, selected id, section, tab). Re-read anything that will not fit — and re-read the stored config
  regardless before a write, so two admins with the panel open cannot overwrite each other.

  **100 characters goes further than it looks.** The audit panel needs a draft of up to 18 chosen event names,
  which will not fit as names — but it fits as 18 bits: one per event at its index in `AUDIT_EVENTS`, written in
  base 36, four characters for the lot (`encodeEvents` / `decodeEvents`). That is what makes a Save button
  possible there. The rule when you pack state this way: **the database still stores names.** A mask only ever
  travels inside a live message, so reordering the source array can at worst misread a panel left open across a
  deploy, rather than silently corrupting a stored config.

### `ownerOnly`

Set `ownerOnly: true` on the handler and **put the invoking user's ID last** in every custom ID it builds. The
router compares the last argument. This is a convention the router depends on; test it
(`expect(parseCustomId(id).args.at(-1)).toBe(OWNER)`).

### Re-read before you write

Every handler branch that changes data must re-read the record rather than trusting what the message was
rendered with. A balance shown 30 seconds ago may already be spent.

### Never offer someone else's data as actionable

If a panel can display another user (`/balance @someone`, `/inventory @someone`), render it **read-only**. A Use
or Buy button beside their items that spends _your_ balance is a real bug — it happened, and there are tests
pinning it now.

---

## 11. Components V2

`src/lib/containers.util.ts` is the helper layer. Prefer V2 whenever a control belongs **beside** the thing it
acts on — a Buy button next to an item, a Use button next to an inventory row — instead of a row of buttons under
a list where the reader has to count to match them up.

```ts
import { button, row } from "@lib/components.util";
import {
	container,
	containerMessage,
	type ContainerPart,
	divider,
	sectionWithButton,
	text,
} from "@lib/containers.util";

const parts: ContainerPart[] = [text("## 🛒 Shop"), divider()];
parts.push(sectionWithButton("**🎣 Fishing Rod** — 2,500", button({ id, label: "Buy" })));

return containerMessage(container({ category: "economy", parts }));
```

Helpers: `text`, `divider({ large?, spacer? })`, `sectionWithButton`, `sectionWithThumbnail`, `gallery`,
`container({ category?, parts })`, `containerMessage`.
Also in `components.util.ts`: `button`, `row`, `select`, `selectRow`, `option`, `channelSelect`, `roleSelect`,
`confirmRow`, `navRow`, `quickAmountRow`, `modalForm`, `disableAll`.

**Pre-tick a select and it becomes the list, not just an add box.** `roleSelect({ defaultRoleIds })` and
`channelSelect({ defaultChannelIds })` render the current selection as already chosen, so removing something is
deselecting it — no second "remove" control to build, and no way for the menu and the list above it to disagree.
Pair it with `minValues: 0`, or emptying the list is impossible. The levelling panel's boost roles and ignore
lists both work this way.

**Two rules Discord enforces, both easy to get wrong:**

1. A V2 message **must** set `MessageFlags.IsComponentsV2`.
2. That flag makes `content` and `embeds` **illegal** on the same message.

`containerMessage()` handles both, so a caller cannot send a half-converted payload. The practical consequence:
**you cannot attach a loose action row next to a container.** A confirm step has to be rendered _inside_ the
container — see `sellConfirmScreen` in `shopScreen.util.ts`.

Gotchas found the hard way:

- **Type `parts` as `ContainerPart[]` explicitly.** TypeScript otherwise narrows the array from its initial
  literal and rejects sections and rows appended later.
- `container()` colours itself from `categoryColour`, which returns named colours for embeds; `setAccentColor`
  needs a number, so anything non-numeric falls back rather than throwing. A colour is never worth failing a
  message over.
- Discord caps a V2 message at 40 components. Page long lists (the shop uses 5 entries per page).

Embeds are still correct for one-shot results — `/beg`, `/rob`, `/work` — where buttons would add noise. Do not
convert something just to convert it.

---

## 12. Multi-guild rules

**The bot is multi-guild.** The only single-guild behaviour is command _registration_ when
`DISCORD_DEV_GUILD_ID` is set, which is a development convenience.

Rules:

1. **Every schema carries `guildId`, and every query filters on it** — `{ guildId, userId }`. Never query by
   `userId` alone for per-guild data.
2. **Two deliberate exceptions:** the blacklist (a bot-owner-level ban list, global by design) and the user
   profile (about the person, not the server). Do not "fix" these.
3. **In-memory state must be guild-keyed.** `gameKey(guildId, userId)`, and command cooldowns are keyed
   `guildId:command:userId`. A global cooldown key was a real bug: since the economy is per-guild, `/beg` in one
   server blocked `/beg` in another.
4. **Never cache a guild-specific setting in a module-level variable.** Read it per interaction.
5. **A job that scans across guilds is correct** — `lotteryDraw` finding every due draw is the intended shape.

---

## 13. Data layer

`src/database/models/*.schema.ts` define Mongoose schemas. `src/database/repositories/*.ts` hold every query.
**Commands and handlers use repositories, never models directly.**

Rules:

1. **Money is atomic.** `$inc`, `findOneAndUpdate`, and `debitWallet()` returning a boolean you must check.
   Never read-modify-`save()` a balance — the original could duplicate money that way.
2. **Debit before you deliver.** Every purchase branch takes payment first and only writes the goods on success,
   so a failed payment can never hand out the item.
3. **`getOrCreate*` never returns null.** Use it when absence should mean "start them off"; use `find*` when
   absence is meaningful.
4. **One collection per shape.** Two models sharing a collection with different shapes was the single worst
   finding in the audit of the original.
5. Use `mongodb-memory-server` (`tests/helpers/mongo.ts`) when the query itself is under test, and a mocked
   model when it is not.
6. **Mongoose applies defaults on write, not to documents already on disk.** A field added to a schema today does
   not appear on records written yesterday, however `required: true` it is — so the type the schema declares is a
   promise about new writes, not a description of what a `find()` returns. When you add a field, normalise on
   read and type the input for what can actually arrive: `normaliseSettings` in `src/lib/levelling.util.ts` does
   this, and its `StoredLevelSettings` marks the fields added later as optional. That function is also where the
   levelling system's old single `roleId`/`multiplier` pair is folded into the `boosts` array, so no other file
   knows the old shape existed. **Migrate on read, in one place, with a test per field.**

---

## 14. Config and environment

**`src/config/env.ts` is the only file that reads `process.env`.** Everything else takes `client.env` or a
parameter. The zod schema is the single declaration of every variable, its format (`/^\d{17,20}$/` for Discord
IDs) and its default.

- **Validate once, at startup, and fail with a list** of everything wrong — not one error at a time.
- **`SCREAMING_SNAKE`, `DISCORD_` prefix** for Discord-owned values.
- **Blank means absent.** `KEY=` is an empty string, not an absent one; optional settings are meant to be left
  blank, and `withoutBlanks()` handles it.
- **One source of truth for ownership:** `DISCORD_OWNER_IDS`. The original had two competing ones.
- **The constants modules read zero environment variables.** `constants.ts` / `theme.ts` / `strings.ts` /
  `categories.ts` hold only values identical for every deployment, exported `as const` so `embedColor` is the
  literal `"Blurple"` and not `string`.
- **No committed snowflakes.** Every ID goes through `env.ts`.

Adding a variable: add it to the zod schema, to **both** `.env.example` and `.env.development.example` with a
comment explaining it, and to `scripts/setupEnv.ts` if it should be prompted for.

---

## 15. Logging

Two separate jobs. Keep them apart.

**Transport — `src/core/logger.ts`.** `pino`, level from `LOG_LEVEL`, pretty and colourised when
`process.stdout.isTTY`, structured JSON when it is not.

- **`no-console: "error"`** in application code (off in `scripts/` and tests). Use `client.logger`.
- **Pass the error as structured context, never as a second string:**
  `logger.error({ err: toError(error) }, "[BAN] Failed to ban member")`. The original's logger took one argument
  and silently discarded the error object at five call sites, losing every stack trace.
- **Message convention:** `[SCREAMING_SNAKE_TAG]` then a sentence-case sentence that usually ends with
  remediation advice. `[X]` a notice, `[X_ERROR]` a failure, `[X_SUCCESS]` a completion.

  ```
  [DATABASE] No MongoDB URL has been provided. Skipping database connection.
  [BAN] Failed to DM user. This can happen when their DM's are off, or the user is a bot.
  ```

- **Never log a token, a connection string, or a full env dump.**
- **Do not put per-frame noise at `warn`.** A broken stream once emitted an error per frame, and matching it at
  `warn` buried the single line naming the cause under hundreds of duplicates. Warn on decisive failures; leave
  the rest at `debug`.

**Presentation — `src/lib/banner.util.ts`.** The boot banner is for a human watching a terminal and is
`process.stdout.write`-n directly, **never through the logger**. `bannerLines()` is pure and unit-tested,
`printBanner()` writes once, colour is dropped when not a TTY.

Glyphs: `✓` done, `↻` in progress, `⚠` warning, `➜` a measurement. Rules are `"═".repeat(n)` heavy,
`"─".repeat(n)` thin. Emoji in the banner must be **2 columns wide** or the alignment breaks — 🗃 (U+1F5C3) is
text-presentation and 1 column, which is why it was swapped for 📂. There is an `ICONS` map and a test.

---

## 16. Errors

```ts
import { UserFacingError } from "@core/errors";

if (!account) throw new UserFacingError("You do not have an account yet. Use `/economy create`.");
```

- **`UserFacingError`** — the message is shown to the user verbatim. Use it for anything they did wrong or can
  fix. Write it as advice, not an accusation.
- **Any other throw** is a bug: caught by `runCommand`, logged with its stack, and the user gets a generic
  apology.
- **Never interpolate a raw error into a user-visible embed.** It leaks internal paths and can exceed the
  4096-character description limit.
- **Never swallow an error into a `.catch()` that only logs** and then continue on a possibly-undefined value.
- `uncaughtException` and `unhandledRejection` set a non-zero exit code and terminate. Never log and continue —
  that leaves the process in an undefined state.

---

## 17. Testing

`tests/` mirrors `src/`. Tests drop the source suffix (`shopScreen.util.ts` → `shopScreen.test.ts`).
`tests/setup.ts` runs via `setupFilesAfterEnv`. Coverage thresholds are **80% statements / lines / functions /
branches**, enforced by `npm run test:coverage` and by the pre-push hook.

Shared harness in `tests/helpers/` (these are not tests):

- **`mocks.ts`** — `createMockInteraction()`, `createMockMessage()`, `createMockClient()`, `createMockModel()`.
  Every method is already a `jest.fn()`, `overrides` spread last, and the factories are typed so a mock that
  drifts from the real Discord shape is a compile error. `createMockModel` is `hasOwnProperty`-aware so an
  override of `null`/`0`/`false` is honoured rather than falling through to the default.
- **`mongo.ts`** — `mongodb-memory-server` setup.
- **`containers.ts`** — `idsOf()`, `buttonsOf()`, `textOf()` for walking a Components V2 tree. A container nests
  sections inside containers and buttons inside sections, so asserting on one means walking it.

What good tests here look like:

- **Test the pure renderer, not the handler.** That is the whole reason panels are split in two.
- **Name the behaviour, not the implementation** — `"disables Use on an item that cannot be used"`.
- **A comment above a test should explain _why it matters_**, ideally naming the bug it prevents.
- **Cover the degenerate cases**: empty list, page past the end, stale id, zero quantity, someone else's data.
- **Inject randomness** (`useItem(..., roll)`) rather than fighting it.
- **A test must be able to fail.** If you add an enforcement test, prove it goes red.

> [!NOTE]
> When a test disagrees with the code, **the code is not automatically wrong.** Three times in this repo's
> history a test I wrote was the thing at fault: `humanisePermission` lowercases deliberately,
> `buildSlashCommand` does not reorder required options, and pets deliberately cost more to feed than they earn.
> Read the code and decide which is right before changing either.

---

## 18. Lint, format, style

**Prettier is fully decoupled from ESLint** — `eslint-config-prettier` last, no `eslint-plugin-prettier`.
`.prettierrc` is exactly:

```json
{ "useTabs": true, "printWidth": 120, "trailingComma": "all", "arrowParens": "always" }
```

`eslint.config.mjs` is a flat config with type-aware rules via `projectService`. The ones that shape the code:

| Rule                                          | Why                                                          |
| --------------------------------------------- | ------------------------------------------------------------ |
| `no-console: "error"`                         | Use `client.logger`. Off in `scripts/` and tests.            |
| `no-floating-promises`, `no-misused-promises` | An un-awaited registration once raced `client.login()`       |
| `import-x/order`                              | Node builtins → packages → aliases, alphabetical             |
| `import-x/no-cycle` (`maxDepth: 6`)           | Barrels plus cross-references make cycles easy               |
| `switch-exhaustiveness-check`                 | Adding a shop section becomes a compile error, not a bug     |
| `no-restricted-syntax`                        | Bans bare `new EmbedBuilder()` outside the three embed files |
| `no-extraneous-dependencies`                  | The original resolved packages through transitive hoisting   |

**Every override in that config carries a comment explaining why.** Keep that — an unexplained override rots.

`scripts/lintRunner.ts` drives the ESLint Node API: colourised per-file report, and **exits non-zero on errors
only — warnings never fail the build.**

### Comments

**This is a standing instruction for the repo: do not write AI-flavoured commentary.** The default is no comment.
Fewer, shorter, and only where the code genuinely cannot speak for itself.

Hard rules:

- **One sentence.** A doc comment is `/** … */` on a single line unless a second sentence is truly load-bearing.
  Multi-paragraph blocks are for `CLAUDE.md`, not for source files.
- **Never narrate the change.** No "the original did X", "this used to be Y", "three fixes failed before this".
  That is what `git log` is for, and it rots the moment the code moves on.
- **Never restate the identifier.** `/** Formats a number. */` above `formatNumber` earns nothing and is deleted
  on sight.
- **Never explain your own reasoning to the reader.** "The panel is an ordinary message, so the permission is the
  gate" is a note to a reviewer, not a comment.

What still earns one:

- A constraint a reader could not infer, stated flatly:
  `// A V2 message cannot carry an embed, so the confirm row goes inside the container.`
- A magic value or an API quirk: `// 10026 is "unknown ban" — already unbanned, which is not a failure.`
- A one-line file header saying what the module is for.
- A `/** */` above a test naming the bug it pins.

Match the surrounding density. `src/` sits at roughly 3% comment lines; a new file well above that is a signal to
cut, not a sign of thoroughness.

---

## 19. Committing and branching

**Format: `type: Capitalized subject`.** No scopes, no bodies, no `!`, no trailers. Enforced by a `commit-msg`
hook running commitlint — not by asking nicely. Eleven types:

| Type       | Meaning                             |
| ---------- | ----------------------------------- |
| `feat`     | A new feature                       |
| `fix`      | A bug fix                           |
| `docs`     | Documentation changes               |
| `style`    | Code style (formatting, etc)        |
| `refactor` | Refactoring with no feature change  |
| `perf`     | Performance improvements            |
| `test`     | Adding or updating tests            |
| `chore`    | Maintenance, dependency updates     |
| `add`      | Adding new features or files        |
| `update`   | Updating existing features or files |
| `remove`   | Removing features or files          |

`add`, `update` and `remove` are house-style extensions beyond Conventional Commits.

```
feat: Added Components V2 panels for economy and audit logging
fix: Try every unencrypted SoundCloud transcoding before failing
remove: Removed the music system
refactor: Renamed command files from slash to command
```

`npm run commit` is a guided wizard. It uses `execFile("git", ["commit", "-m", msg])` with an argv array — never
interpolate a message into a shell string, or a `"`, backtick or `$` breaks or injects.

**Hooks:**

| Hook         | Runs                                |
| ------------ | ----------------------------------- |
| `pre-commit` | `npm run typecheck` + `lint-staged` |
| `commit-msg` | `commitlint`                        |
| `pre-push`   | `npm run lint` + `test:coverage`    |

`typecheck` is in `pre-commit` because staged-only linting cannot see a type error introduced in an unstaged
file.

**Branches:** `feature/your-feature-name` for normal work. Push with `git push -u origin <branch>`; on a network
failure retry up to four times with exponential backoff (2s, 4s, 8s, 16s).

**Do not open a pull request unless explicitly asked.**

**Before committing:** `npm run check`, plus the loader smoke test from [§3](#3-running-testing-verifying) if you
touched loading, naming or the build. Regenerate `COMMANDS.md` if the command surface changed. Commit related
work together — a rename sweep is one mechanical commit, not 100.

---

## 20. CI

`.github/workflows/ci.yml` — four jobs (`check`, `test`, `build`, `audit`), triggered on `branches: ["**"]` for
push and pull_request so a feature branch is verified before a PR exists. Node version comes from `.nvmrc`, not a
hardcoded string. The `build` job **verifies the `dist/` artifact**, which is what catches the unrewritten alias
problem.

`.github/workflows/nightly.yml` — `cron: "0 0 * * *"` plus `workflow_dispatch`, four jobs: `unit-tests`,
`npm-audit`, `snyk` (`continue-on-error: true`, so a transient 403 cannot raise a false alarm), and
`notify-on-failure` which opens a labelled issue. Permissions default to `contents: read` at the top and are
escalated to `issues: write` on that one job only.

**Suppressions expire.** `.nsprc` and `.snyk` each require three things: a written reason, the version that
fixes it, and a hard expiry — so a suppression cannot rot silently into a permanent blind spot. Every `overrides`
pin in `package.json` needs the same treatment.

---

## 21. Decisions already made — do not relitigate

### The music system was removed

Deleted in `9541ec6` — 27 command files, 7 lib modules, 6 test files, 7 dependencies, 3,452 lines. **Do not add
it back without reading this.**

Five rounds of debugging established:

- **SoundCloud now serves DRM-protected streams.** The URL contains `/cbcs/` — Common Encryption, as used by
  FairPlay and Widevine. FFmpeg downloads the segments and decodes ciphertext as AAC, which produces
  `Reserved bit set`, `Number of bands exceeds limit`, `channel element is not allocated` while output stays at
  0 kB. **Decrypting it is not an option** — it is illegal and will not be implemented here.
- **`ffmpeg-static` ships a statically-linked-glibc binary** whose `getaddrinfo` segfaults on modern glibc: exit
  139, no stderr, every hostname dead while local input works. `@ffmpeg-installer/ffmpeg` is the same
  johnvansickle build and fails identically. There is no npm package that avoids it.
- **The whole approach is a treadmill.** DisTube + yt-dlp + scraped SoundCloud endpoints break whenever a
  platform ships a change.

If music is ever wanted again: `git revert 9541ec6` restores everything, and the honest path forward is
[Lavalink](https://lavalink.dev/) — a separate audio server that absorbs this churn — not another round of
patching extractors. It costs a Java daemon, which is why it was not done.

### One command object, both surfaces

No `SlashCommands/` / `PrefixCommands/` folder split, and no `.slash.ts` / `.prefix.ts` suffixes. Both would
describe an architecture this codebase deliberately does not have, and would undo the deduplication the rewrite
exists to achieve.

### Command folders stay flat and lowercase

`commands/<category>/`, matching the rest of `src/`, which is uniformly camelCase. Two casing regimes inside one
tree is a rule to remember rather than a distinction the reader gains anything from.

### No dedicated `types/` directory

Measured rather than assumed: 46% of exported types never leave the file that declares them. Types live beside
the code that owns them.

### One leaderboard command, and no command that only forwards to another

`/leaderboard` serves both the economy and the levelling board, with a button to swap and a **Find me** button
that jumps to the page you are on. There is deliberately no `/levelling leaderboard` — a second name for the same
screen is the overlap this pass removed, not a convenience.

The same reasoning deleted `/use` (the inventory panel's per-row Use buttons do it better), `/rehome` (now
`/pet rehome`, with `t?rehome` kept as a prefix alias) and `/pet buy` (the shop sells pets with a button; `/pet
rename` covers the one thing `/pet buy` could do that the shop could not). A command whose whole body is
"do what that other command does" should be an alias or a subcommand, not a command.

**`/levelling setup` and `/levelling edit` are the exception, and it is deliberate.** They open the same panel
because the panel shows the current configuration — setting up and changing it are one gesture — and people look
for both names. One line each, delegating to one function; not two implementations.

### Global by design

The blacklist and the user profile are intentionally not guild-scoped. See [§12](#12-multi-guild-rules).

---

## 22. Anti-patterns that must not come back

The full numbered list is [`04-AUDIT-FINDINGS.md`](.codebase-notes/04-AUDIT-FINDINGS.md) (100 findings). The
short version — the classes of defect the conventions above exist to prevent:

1. Reading `process.env` before the env file loads, and trusting `dotenv` to override an already-loaded value
   (it does not). One validated `loadEnv()` first, always.
2. Un-awaited async registration, so login races the command deploy.
3. Handlers registered twice because a directory scan re-invokes a module that was already called directly.
4. A circular import back into the entry point, resolving to `{}` and being used as a client.
5. Properties bolted onto the client at runtime — 20 of them in the original. Declare fields on `TestifyClient`.
6. Global single-slot state for per-interaction data (`client.helpData`).
7. A handler whose parameters are in the wrong order, so its first guard always returns and the feature is
   silently dead. Two features in the original never ran once.
8. `catch` blocks calling `interaction.reply()` with no `replied`/`deferred` guard.
9. Raw errors interpolated into user-visible embeds.
10. Swallowing an error into a `.catch()` that only logs, then continuing on a possibly-undefined value.
11. Read-modify-`save()` on balances with no atomic operation — money can be duplicated.
12. Two models sharing one collection with different shapes.
13. Directory scans resolved against the CWD (`readdirSync("./src/…")`), which breaks `dist/` and any start from
    another directory. Use `core/paths.ts`.
14. `console.*` as the log path, and a logger that drops the error object it was handed.
15. Undeclared dependencies resolving through transitive hoisting.
16. An alias map duplicated across several files, and a category enum whose values drift from the folder names.
17. A commit convention with nothing enforcing it.
18. A README describing features and scripts that do not exist. Regenerate `COMMANDS.md`.
19. **A user-facing flow that requires typing an ID.** `/shop buy <id>` made people read an ID out of one message
    and retype it. If the bot knows the catalogue, the user should be picking from it. `/use <item>` and
    `/pet buy <species>` were both deleted for this — the inventory panel and the shop already put a button
    beside each thing, and `/use`'s autocomplete was a hardcoded list of three items that did not even match the
    real catalogue.
20. **A control that acts on data it is not showing.** A Use button beside someone else's item that spends yours.
21. **Two commands that do one job.** `/leaderboard`'s top-level `run` was a verbatim copy of its `economy`
    subcommand, and the levelling board was hidden as a second subcommand of an economy command. One command,
    one implementation, and a button to swap boards.

---

## 23. Working style expected here

Behaviour that has been asked for repeatedly in this repo, recorded so it does not need asking again.

**Verify, do not assume.** Read the actual source of a dependency before theorising about it. Twice in this repo
a confident diagnosis was wrong in a way five minutes of reading `node_modules` would have caught: the yt-dlp
plugin's `update` option already defaulted to `true`, and its `getStreamURL` hardcoded a format that could not be
overridden.

**Say what you could not verify.** If a fix cannot be tested in the current environment — no network, no live
Discord, no database — say so plainly and name which part is proven and which is inference. Do not present a
plausible fix as a confirmed one.

**Own mistakes plainly and move on.** State the correction in a sentence, fix it, continue. No ceremony, no
re-litigating.

**Do the whole task.** If part of it is blocked, finish everything else and say explicitly what was left and why.
Scaling the work down is the user's call.

**Prefer the fix with no setup cost.** This is an open-source bot that has to work on macOS, Windows and Linux
with minimal installs. "Install this system-wide" is a last resort, and if it is genuinely needed, it should
degrade automatically rather than fail.

**Read the log the user pasted, all of it.** The line that mattered in a 900-line FFmpeg dump was the last one.

**Regenerate, do not hand-edit.** `COMMANDS.md` comes from `npm run docs:commands`.

---

## 24. The dashboard

A web dashboard for controlling the bot, built to the plan in [`dashboard-POC/`](dashboard-POC/00-INDEX.md).
**Read the relevant document there before changing anything in this section** — it holds the reasoning, the
threat model and the phase order. `13-ROADMAP-AND-RISKS.md` says what is built and what is next.

**It is off by default.** `DASHBOARD_ENABLED` is the switch, and while it is false a bot-only install needs none
of the other dashboard variables. Enabling it without `DISCORD_CLIENT_SECRET`, `DASHBOARD_BASE_URL` and
`DASHBOARD_SESSION_SECRET` fails at startup naming all three at once.

### Three workspaces, one repository

```
src/api/       Hono routes, inside the bot process so they can read the live client cache
shared/        @testify/shared — types and zod schemas the API and the SPA both import
dashboard/     Vite + React + Tailwind SPA
```

Inside `dashboard/src`, the same rule as the bot: technical role first, then domain.

```
app/            AppShell, RequireAuth, ErrorState, and layout/ for the sidebar
components/
  brand/        Logo and LogoTile — the mark, inline, inheriting currentColor
  primitives/   Button, Card, Badge, Skeleton, StatTile, EmptyState, PageHeader, GuildIcon, TabBar,
                SegmentedControl, DataList/Figure, Tooltip
  form/         ChannelPicker, RoleChecklist, CheckList, Toggle, SavingIndicator, Warning, FIELD/LABEL
  motion/       Backdrop (three.js), Reveal, AnimatedNumber
  ui/           reserved for shadcn's CLI — excluded from coverage, so keep your own out of it
config/         navigation and feature registries — see "Adding to the dashboard" below
features/<name>/  the page, its components/, its use<Name>.ts, its <name>.utils.ts and .types.ts
hooks/          usePageTitle, usePrefersReducedMotion, useCountUp, useDocumentVisible, useDebounced
lib/            api, cn, queries, redirect, tint, and three/ for the backdrop's maths and shaders
```

A page holds routing, loading and error branches and nothing else. Anything with a rule in it — which tab a URL
means, what a page count is, which channels can be posted in — belongs in a `.utils.ts` beside it where it can
be tested without rendering. `features/levelling/` is the worked example: a 416-line file became a 45-line page,
four tabs, three shared components and two testable modules.

**What is built:** health, the OAuth2 sign-in flow with sessions, the guild picker, a guild overview, the owner
console, and the levelling, welcome, audit-logging and server settings. The rest of the settings screens follow
the same shape —
`dashboard-POC/13-ROADMAP-AND-RISKS.md` is the running order.

| Route                   | Screen                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `/sign-in`              | One button; also the setup screen for a half-install          |
| `/guilds`               | Picker, with an invite card for guilds without the bot        |
| `/guilds/:id`           | Stat tiles, feature grid, permission warnings, recent changes |
| `/guilds/:id/levelling` | Four tabs, optimistic writes, hierarchy warnings              |
| `/guilds/:id/welcome`   | Greeting template, live preview, saved on blur                |
| `/guilds/:id/audit-log` | Grouped event checklist held as a draft until Save            |
| `/guilds/:id/settings`  | Prefix, link filtering, roles on join, counting, voice stats  |
| `/commands`             | Every command, searchable, with the coverage tile             |
| `/terms`, `/privacy`    | Public — outside the sign-in gate, deliberately               |
| `/owner`                | Six tabs: fleet, usage, commands, logs, runtime, control      |

| Command                 | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev:all`       | Bot and Vite together. The page is on :5174, the API on :3000 |
| `npm run dashboard:dev` | Just Vite                                                     |
| `npm run build`         | shared → bot → dashboard, in that order                       |
| `npm run build:shared`  | Only needed by hand after editing `shared/src`                |
| `npm run test:coverage` | Both projects, each against its own thresholds                |

In development Vite proxies `/api` to the bot, so the browser only ever talks to one origin and session cookies
work with no CORS configuration at all. In production the API serves `dashboard/dist` from the same port.

**`dev:all` starts Vite only once the API answers.** `startApi` runs after `client.login()`, so for the twenty-odd
seconds the bot spends connecting there is nothing on the port — and the proxy answers every poll in that window
with a stack trace that reads like a broken install. `scripts/waitForApi.ts` polls `/api/health` first (no
`wait-on`; it is a `fetch` in a loop, and one fewer install matters for a self-hosted bot), and refuses with a
sentence naming the cause when `DASHBOARD_ENABLED` is false or the bot never comes up. `tsx watch` restarts the
bot on every save, which the ordering cannot help with, so the proxy's own error handler is replaced with one
line per outage — Vite registers its handler immediately **after** calling `configure`, so the replacement waits
a tick, and that ordering was read out of `vite/dist/node/chunks/node.js` rather than guessed.

### `@testify/shared` is a real package, not an alias

**It is deliberately absent from `tsconfig.json`'s `paths`, and adding it there would break the build in a way
nothing catches.** `tsc-alias` rewrites every alias in that map to a relative path inside `dist/`, and nothing
outside `src/` is emitted there — with the alias present it resolved `@testify/shared` to `dist/index.js`, which
is the bot's own entry point. That is anti-pattern 4 in [§22](#22-anti-patterns-that-must-not-come-back), it
type-checks, and the only symptom is an empty object at runtime.

So the workspace resolves like any other package, and each consumer reads what suits it:

| Consumer          | Reads                     | Needs a build? |
| ----------------- | ------------------------- | -------------- |
| `tsc`             | `types: "src/index.ts"`   | No             |
| Jest              | an explicit source mapper | No             |
| Vite              | an alias to source        | No             |
| The bot's `dist/` | `main: "dist/index.js"`   | **Yes**        |

`prepare` builds it after any install, so a fresh clone works. Editing `shared/src` and then running the built
bot is the one case that needs `npm run build:shared` by hand.

`shared/` stays dependency-light: zod and nothing else. No discord.js, no React.

### The security layer

Built before the first screen, deliberately: retrofitting a guard into fifteen routes is much harder than
writing it once. Every piece has a test proven able to fail.

| Where                     | What it does                                                                   |
| ------------------------- | ------------------------------------------------------------------------------ |
| `middleware/security.ts`  | CSP, `frame-ancestors 'none'`, `nosniff`, `no-referrer`, `no-store`, HSTS      |
| `middleware/csrf.ts`      | Double-submit on every mutating verb, compared with `timingSafeEqual`          |
| `middleware/rateLimit.ts` | Fixed window per session, falling back to address. Bounded, so it cannot leak  |
| `validate.ts`             | `parseParams` / `parseQuery` / `parseBody`, all zod, all 400 with field issues |
| `cookies.ts`              | The only place a cookie is set, so none can be written without its flags       |
| `errors.ts`               | `ApiProblem` — a status and a stable `code`, never a stack                     |
| `lib/secretBox.util.ts`   | AES-256-GCM over the OAuth tokens, keyed by HKDF from the session secret       |

Rules that are easy to break and silent when broken:

- **Nothing reads `c.req.param()` or a raw body.** Everything goes through `validate.ts`, so an unvalidated
  snowflake can never reach a Mongo filter and a page number can never become a negative skip.
- **`script-src` has no `'unsafe-inline'` and no `'unsafe-eval'`.** That single directive is what makes an
  injected `<script>` or `onerror=` inert. A lint rule bans `dangerouslySetInnerHTML`, `innerHTML`, `eval()`
  and `new Function()` so the CSP is the last line rather than the only one.
- **`returnTo` rejects `//evil.example`.** A protocol-relative URL is an absolute one to a browser, so a check
  that only looks for a leading `/` is an open redirect. Backslashes go too — browsers normalise them.
- **`Secure` on cookies is conditional on `NODE_ENV`.** Setting it unconditionally breaks every
  `http://localhost` install, which is the most common self-hosting trip-up there is.
- **`DASHBOARD_BIND` defaults to `127.0.0.1` and `DASHBOARD_TRUST_PROXY` to false.** Binding everywhere puts an
  admin panel on the internet; trusting `x-forwarded-for` with no proxy in front lets anyone forge their
  rate-limit bucket.
- **Rotating `DASHBOARD_SESSION_SECRET` signs everybody out**, because the sealed tokens no longer open. That
  is the intended behaviour after a leak, and `npm run secret -- --write` is the whole procedure.

### `requireGuild` is the security boundary

Everything behind it assumes it ran, so five things in it are load-bearing:

1. **The guild id comes from the path parameter only**, and is shape-checked before it is used to look anything
   up. A handler reads `c.get("guild").id`, never a guild id from a body. This is the most likely way one
   guild's data leaks into another's — make it a review rule.
2. **`guild.members.fetch()` is live, every request.** The OAuth guild list is a login-time snapshot, so
   someone demoted five minutes ago still has it in their session. This is the difference between losing access
   on their next click and losing it next time they sign in.
3. **404 before 403.** The bot not being in a guild is not a secret, and "here is an invite" is the right answer.
   A 403 for a guild the caller cannot manage carries a code and nothing else — no name, no icon.
4. **Owners skip the member fetch.** They may not be in the guild at all, and `requireOwner` answers **404**
   rather than 403, so a manager never learns the owner console is there.
5. **`.catch(() => null)` on the fetch.** An unknown member throws, and an unhandled throw would be a 500 that
   looks like a bug rather than a 403 that looks like a denial.

`serveDashboard()` is registered in `startApi`, **after** every route, because it is a catch-all — anything
registered behind it silently never runs.

### Rules that carry over

- **The dashboard owns no logic.** It is a third surface onto the same domain — repositories and
  `*Actions.util.ts` — exactly as commands and buttons are. A validation rule that exists only in a route
  handler is how the two surfaces start disagreeing. `GET /levelling` is literally
  `normaliseSettings(await getLevelSettings())`, so the web inherits the migration off the old `roleId` shape
  rather than reimplementing it.
- **Limits live in `@testify/shared`, not in `src/lib/`.** `LEVEL_LIMITS` moved there and `levelling.util.ts`
  re-exports it, because the browser form and the API have to validate against the same numbers — the web
  accepting a sixth boost role the Discord panel cannot render is exactly the drift this prevents.
- **A list is replaced whole, not patched.** `PUT /boosts` takes the entire array, because the control is a
  multi-select whose value _is_ the list: one request, and no add-then-remove race between two open tabs.
- **A whole-document answer is only trusted while it is the only write in flight.** The settings sections and the
  command toggles each answer with the entire list, and the order those answers arrive in says nothing about the
  order the server applied them — a slow one carries a snapshot taken before a later click and would put that
  click's control back where it was. Every mutation that writes a shared cache key therefore declares the same
  `mutationKey` and guards `setQueryData` with `client.isMutating({ mutationKey }) === 1`, ending the burst in an
  `invalidateQueries` so a read decides. A mutation is counted as pending across `onMutate`, `onSuccess` and
  `onSettled` — verified in `@tanstack/query-core`'s `mutation.ts`, not assumed. Both are pinned by tests that
  were proved to go red without the guard.
- **A control that is typed into does not write the URL per keystroke.** `?q=` is written with `replace: true`,
  or Back walks the user back through every character, and the request behind it is debounced (`useDebounced`) so
  a five-character search is one query rather than five. Confirmed in a real browser, not in jsdom.
- **Every mutation writes an audit record, after the change succeeds.** If the audit write itself fails it is
  logged and the request still succeeds — the change did happen, and failing over the bookkeeping is worse.
- **The API starts after `client.login()`** and closes in `src/core/shutdown.ts`. Both matter: before login the
  cache is empty, and a listener left open holds the port against a restart.
- **Every route runs behind an error boundary.** `shutdown.ts` terminates on an uncaught exception, which is
  right for a bot and would let one bad route take the whole thing offline.
- **No `GET` may mutate anything.** CSRF protection exempts them.
- **`/eval` is never exposed.** It turns a stolen session cookie into a remote shell.
- **`DISCORD_CLIENT_SECRET` never reaches a browser.** The API holds it and nothing else does.
- **Every free-text field goes through `plainText` / `plainLine` in `@testify/shared`.** Not an HTML sanitiser —
  nothing renders these as HTML, and stripping tags would break the `<@123>` and `<#456>` Discord itself needs.
  What it strips is what a markup sanitiser would miss: control characters, and the bidi overrides and
  zero-width characters that make a stored string read as something other than what was typed. The length bound
  runs **after** the strip, so a value padded to the minimum with zero-width spaces is refused rather than
  stored short.

### The dashboard's Jest config earns its comments

Three things there are load-bearing and non-obvious, all commented in place:
`jest-fixed-jsdom` (plain jsdom deletes the `fetch`/`Request`/stream globals MSW needs), a
`transformIgnorePatterns` allowlist (MSW's CommonJS build requires several ESM-only packages), and a
`moduleNameMapper` pinning React to the workspace copy (`discord-html-transcripts` drags React 18 into the root
`node_modules`, and elements built by 19 rendered by 18 fail with "Objects are not valid as a React child").

### Adding to the dashboard

Three registries exist so the common changes are data rather than edits to a screen. Reach for these first — a
new `if` in the shell is nearly always the wrong answer.

| To add…              | Edit                                    | And nothing else changes                                |
| -------------------- | --------------------------------------- | ------------------------------------------------------- |
| a sidebar section    | `config/navigation.ts`                  | icon rail, tooltips, active marker, mobile drawer       |
| a bot feature's look | `config/features.ts`                    | the overview grid, and anywhere else a feature is shown |
| a levelling tab      | `features/levelling/levelling.types.ts` | the tab bar, its icon, and `?tab=` in the URL           |

`featureLook` falls back to a neutral icon for a key it has never seen, so the API can ship a feature before the
dashboard knows about it and the grid renders a row rather than a hole. There is a test pinning that.

**A whole settings screen is six edits, in this order.** Audit logging is the most recent worked example — copy
it rather than starting from a page.

1. `shared/src/<name>.ts` — the limits, the response shape and the zod schema, exported from `shared/src/index.ts`.
   Anything the bot already knows (an event list, a label map, a shorthand like audit logging's `all`) **moves**
   here and is re-exported from `src/lib/`, rather than being copied.
2. `src/api/routes/<name>.ts` — read and write through the repository, `auditChange` after the write succeeds.
3. `src/api/routes/guilds.ts` — one `guilds.route("/:guildId/<name>", …)` line, so it inherits `requireGuild`.
4. `dashboard/src/features/<name>/` — `use<Name>.ts`, `<name>.utils.ts` for the rules, then the page.
5. `dashboard/src/routes.tsx` and `config/navigation.ts` — one lazy import and one nav entry.
6. `config/features.ts` and `features/commands/commands.utils.ts` — the overview tile links to it, and the
   command it replaces stops counting as Discord-only.

Step 3 is the one that fails silently: an unmounted sub-app falls through to the SPA catch-all and lands the
browser back on the guild picker. A request cannot tell that apart from a refusal, because `requireGuild`
answers first — so `tests/api/server.test.ts` reads Hono's route table instead.

**Two write shapes, the same split as the Discord panels ([§4](#the-panel-renderers-in-srclib)).** Levelling and
welcome write on every control and re-read before each one, because each control is an independent decision.
Audit logging holds a whole draft and writes once, because a channel and a set of events are one decision and
half of it applied is not a state anyone wants. Pick by that test, not by which is less code.

**Native controls are restyled once, in `index.css`'s base layer, never per call site.** The scrollbars
(`scrollbar-width` for Firefox _and_ `::-webkit-scrollbar` for WebKit — both, or a dark page gets a bright strip
down the side of every list), the checkbox and radio metrics, and the select's chevron all live there. Two
consequences worth knowing: a Tailwind utility beats a base-layer rule, so the room for the chevron is the
`SELECT` class rather than the base `padding-right`; and `scrollbar-none` is a utility for a scroller whose bar
would draw over the thing it scrolls — the tab underline is the case it exists for.

**No component writes a colour, a radius or a duration.** They come from `@theme` in `index.css` — including the
`--color-feature-*` tints and `--radius-card` — which is what makes a fork's rebrand one file. A hex value in a
`.tsx` is a review comment.

**Nor does one write its own padding.** `Card` takes `padding="none" | "compact" | "default"`, and all three use
the same 24px inline padding so every card's content starts on the same column whatever its density — a card
that reaches for `p-4` puts its text 8px left of the rest of the page. Vertical rhythm is one `gap-6` on the
content column in `AppShell`, not a margin per section. Both are pinned by tests, and both were found by
measuring the rendered page rather than by looking at it.

A margin between siblings is nearly always the wrong tool — a flex column with a `gap` is the right one, because
it cannot leave a stray margin behind when a sibling is conditionally absent. **A grid of panels wants
`items-start`** unless the cards genuinely should match heights: without it the shorter card stretches, and the
dead space inside its border is the "massive gap" that keeps getting reported. The one legitimate margin is
inside a CSS `columns` layout, where `gap` does not apply between items at all (`EventGroup`'s `mb-5`).

**No two modules may differ only by case.** `Field.tsx` beside `field.ts` is two files on Linux and one on
macOS or Windows, so `@/components/form/Field` resolves to the class strings there and the page dies at start-up
with `does not provide an export named 'Field'`. Nothing local catches it — Linux is case-sensitive and so is
CI — so `tests/core/conventions.test.ts` walks `src`, `shared/src` and `dashboard/src` and names the pair. The
class strings are `fieldStyles.ts` for exactly this reason.

**Repeated markup becomes a primitive, not a copy.** Three files with their own segmented control is three
places to fix an `aria-pressed` bug: `SegmentedControl`, `DataList`/`Figure`, `TabBar`, `Card` and the `FIELD` /
`LABEL` / `CHECK_ROW` class strings exist so a control's semantics and its type scale are each written once.
Before writing a local `Row`, `Figure` or picker in a feature directory, check `components/primitives`.

### The accessibility floor is automated, the rest is not

`jest-axe` runs on every page-level test through `src/test/axe.ts`, with `color-contrast` disabled — jsdom
computes no styles, so that one rule can only report false negatives there. It is a floor, roughly 40% of
issues; `dashboard-POC/10-ACCESSIBILITY.md` lists the manual passes for the rest.

Four things it does not catch, all built deliberately:

- **`RouteAnnouncer`** reads the new `document.title` into a polite live region after a navigation. Without it a
  screen reader gets no signal that an SPA changed page at all.
- **Role colours are swatches.** `RoleSwatch` puts the colour on a bordered dot and leaves the name at full
  contrast — a role set to `#1a1a1a` as text is invisible on this background.
- **Sidebar groups are labelled lists, not headings.** A heading there would put "Testify HQ" into the page's
  heading outline twice; the `<ul aria-label>` names the group without competing with the page.
- **`prefers-contrast: more`** swaps dividers for the interactive border and muted text for white.

`eslint-plugin-jsx-a11y` is deliberately absent: its latest release peers on ESLint ≤9 and this repo is on 10,
so installing it needs `--force` and breaks `npm ci`.

### Tooltips describe, they never name

`components/primitives/Tooltip.tsx` is the only place tooltips are configured. The rule it exists to enforce:
**anything a tooltip says must be an addition to a control that already has its own accessible name.** A tooltip
is a pointer affordance; a control labelled only by one is unreachable to anybody arriving another way.

Two things follow, and both have tests:

- It opens on `focusin` as well as hover, so a keyboard reaches it.
- It sets `aria-describedby`, never `aria-labelledby`.

It drives `tippy.js` directly rather than through `@tippyjs/react`, which reads `element.ref` — removed in React
19, so the wrapper warns on every render and is one release from breaking. Popper positions with inline styles,
which the CSP allows under `style-src 'unsafe-inline'`; that combination is verified against the real built
page, not assumed.

### Responsiveness, and the label trap

Three widths: a drawer below `md`, an icon-only rail from `md`, the full sidebar from `lg`.

**At the icon-only width the labels are `sr-only`, never `hidden`.** `hidden` is `display: none`, which removes
them from the accessibility tree and leaves every navigation link named nothing — the exact bug this pattern
exists to avoid. jsdom loads no stylesheet, so a unit test cannot tell the two apart by computing a name; the
unit test pins the class and a real browser check confirms the accessible name survives.

**A server's screens are grouped into collapsible sections**, because a flat list grew past what one glance
takes. `NavGroup.sections` in `config/navigation.ts` holds them, `SidebarSection` renders one, and adding a
screen now means choosing which section it belongs in — `items` stays for the screens that are not a category
(Overview and Settings). Three things about it are load-bearing:

- **Collapsing only exists where labels do.** At the icon-only rail there is nothing to read and no room for a
  toggle, so the button is `hidden lg:flex` and the items stay flat there whatever the state says. A collapsed
  section at that width would hide the icons and leave nothing to click. The button being `display: none` is
  what keeps `aria-expanded="false"` from contradicting a list the rail is still showing.
- **The section holding the current page opens itself** (`sectionHolds`), so a collapsed section can never hide
  where you are, and it re-opens when a navigation lands inside it.
- **`allNavItems` reaches into sections.** It is what the tests and every flat consumer read; a screen reachable
  only from a section would otherwise look like it had left the navigation entirely.

`navigation.test.ts` asserts the **sorted** set of paths rather than their order, because which section a screen
sits in is a grouping choice and reachability is the rule.

### Getting every command onto the dashboard

The goal is that everything the bot does is reachable from the web. `dashboard-POC/06-COMMAND-CONTROL.md` is the
authoritative plan and its conclusion is the thing to hold onto: **the dashboard is a third surface onto the
domain, not onto the presentation.** A `DashboardInteraction implements CommandInput` adapter looks like it
would give all 76 commands for free, and it does not — the most useful commands open a Components V2 panel whose
work lives in `src/buttons/`, and a panel serialised to JSON is not a settings page.

So each feature is promoted rather than proxied: route → repository or `*Actions.util.ts`, the same layer the
command and the button already call.

`GET /api/commands` is the map of that work. It reads `client.commands` — the same metadata `buildSlashCommand`
registers with Discord — so the page cannot drift from `/help`, and `commands.utils.ts` holds the one list of
which commands have a screen here. The coverage tile on `/commands` is that list counted, which makes the
remaining work visible rather than a note in a document.

Two rules it enforces:

- **Owner commands are filtered out for everyone else**, not shown and disabled. The list of what a bot owner
  can do is not something a server manager needs, and naming them invites probing. There is a test that the
  response does not contain them at all.
- **Metadata only.** The registry holds `run` functions; a test pins the exact key set of a serialised command.

### The owner console, and what it is allowed to know

Four tabs — overview, usage, logs, runtime — all behind `requireOwner`, which answers **404** so a manager never
learns the console is there. Each tab fetches its own data, deliberately: a failing `/owner/stats` used to blank
the whole console, and the logs tab is precisely the screen you want when something is wrong.

**Ownership is `DISCORD_OWNER_IDS` and nothing else.** `requireOwner` calls `client.isOwner(session.userId)`,
which reads the env array on every request — so removing an ID revokes the console on that person's next click
rather than at their next sign-in, and no flag on the session document can grant it. There are tests for the
whole shape of that, including that a near-miss ID cannot match.

**Usage is counted, not logged.** `commandusage` holds one row per command per server per day per surface,
`$inc`-ed in place by `countCommandUse` at the two dispatch sites, with a TTL that reaps a row 90 days after it
was created. Three things about it are load-bearing:

- **No user IDs, anywhere.** "What is this bot used for" is the question; "who used it" is not, and a
  self-hoster's analytics must not quietly become a per-person activity log. Say so when adding a field.
- **A row per invocation would grow without bound.** The aggregate shape is what lets one query answer a
  90-day window on a busy bot.
- **`runCommand` returns whether it succeeded** so a failure can be counted without catching the error and
  breaking the guarantee that the user always gets an answer. `countCommandUse` is not awaited and drops its
  own error after a debug line — the count is the least important thing that happened, and nothing reads a
  result from it.

**Least-used is ranked over `client.commands`, not over the usage rows.** A command nobody has ever run has no
row at all, and it is exactly what that list exists to surface.

**Commands can be switched off, in one server or everywhere.** `commandtoggles` holds one row per scope, keyed
by guild id with `GLOBAL` as the bot-wide row — a Discord id is 17-20 digits, so the sentinel cannot collide.
Four things about it are load-bearing:

- **`checks.ts` is the gate.** Hiding a switch is not access control and neither is a greyed-out control; the
  refusal runs before the command body on both surfaces, and there are tests proved able to fail.
- **Nobody bypasses it, the bot owner included.** "Off" that quietly still runs for one person is a much worse
  thing to debug than one that is simply off, and the dashboard is one click away for whoever turned it off.
- **`ALWAYS_ENABLED` cannot be switched off anywhere.** `/help` is how somebody finds out what is left; a server
  that turned it off would have no way back inside Discord. The API refuses rather than trusting the form.
- **A manager's list can never contain an owner command.** They are filtered out on the way in _and_ on the way
  out, so a hand-written request cannot make one visible or switch one off.

**There is no "start the bot", and that is structural.** The HTTP server lives inside the bot process, so a
stopped bot has nothing left to serve a start button. What exists instead:

- **Pause** sets `client.paused`, which `runChecks` and `runMessageHandlers` both honour, and drops the presence
  to invisible. Reversible from the same screen. A flag rather than `client.destroy()`, because destroy nulls
  the token and tears down the websocket workers, and whether the same instance can log back in is not a thing
  to find out on somebody's live bot.
- **Shut down** really ends the process, behind a typed confirmation, and says on screen that only the host can
  start it again.

**The bot's picture is global; only its nickname is per-server.** Discord has no per-guild avatar for bots, so
`PATCH /api/control/identity` is owner-only and application-wide, while `PATCH /guilds/:id/settings/nickname`
is what a manager gets. Do not add a per-guild avatar control — it cannot work.

**The log ring is in memory and redacts on the way in.** `src/core/logRing.ts` keeps the last 1,000 lines at
**every** level, fed by a pino `logMethod` hook rather than a second transport — pino never calls the hook below
its own level, so `LOG_LEVEL` still decides what exists at all, and the console says so rather than showing an
empty list. Search matches the message _and_ the stringified context, so a guild id finds every line about it. A dashboard page is a much easier
thing to read over someone's shoulder than a terminal, so any context key matching
`token|secret|password|credential|authorization|cookie|session|uri|url|dsn|key$` is replaced before the record
is stored — not before it is served. A restart clears the buffer, which is the trade for something that needs
no collection, no retention policy and cannot fill a disk.

**Testify never phones home.** The runtime tab reports the version it is running and links the releases page; it
does not check for a newer one. A self-hosted bot that contacts a server on a timer is not something to ship by
default, and the tab says so in as many words.

**No chart library.** `UsageChart` is a `<span>` per day with a height, and the numbers behind it are a real
`<table>` in a `sr-only` `<figcaption>`. The bundle budget in `dashboard-POC/13-ROADMAP-AND-RISKS.md` is the
reason, and a bar is a div with a width.

### The dashboard wears the bot's face

`GET /api/bot` returns the application's own profile and every brand surface reads it, so a fork looks like its
own bot without a line of CSS. Two things about it are easy to get wrong:

- **The banner is not in the READY payload.** `client.user.banner` is undefined until the user is fetched over
  REST, so `botIdentity()` fetches once and caches for an hour. A failed fetch still yields the avatar.
- **Everything falls back to `components/brand/Logo`** — no profile yet, no avatar, or a CDN that will not load.
  A brand mark is never worth a broken image icon, and `BotMark` handles all three the same way.

The endpoint takes no session because the sign-in screen needs it before one exists; it carries nothing beyond
the public profile, and a test pins the exact key set so nothing private drifts into it.

### The WebGL backdrop

`components/motion/Backdrop.tsx` draws a drifting field of points behind every screen. Four things about it are
load-bearing, and all four are what keep an ornament from costing anything:

- **three is imported dynamically and chunked on its own.** `manualChunks` in `dashboard/vite.config.ts` gives
  it its own 513 kB chunk — left in `vendor` it would be in the initial load, which is the opposite of lazy.
  `vendor` is the same size with the backdrop as without it.
- **`prefers-reduced-motion` skips the import entirely**, rather than loading three and then sitting still. So
  does a machine with no WebGL, and `createStarfield` returns null rather than throwing if the context is
  refused. Verified in a real browser: with the preference set, no canvas and no chunk fetched.
- **Everything testable is out of the three.js file.** `lib/three/field.ts` holds the scatter, the frame-rate
  independent easing and the parallax, all pure and unit tested; `starfield.ts` is the part that needs a GPU and
  is the one file excluded from coverage.
- **It reads the palette rather than restating it.** `lib/three/tokens.ts` pulls `--color-accent` off `:root`,
  so the design tokens in `index.css` stay the only place a colour is written, and a token three cannot parse
  falls back instead of rendering a black field.

The canvas is `aria-hidden` and `pointer-events-none`. It carries no information and must never be able to take
a click meant for a control.

### Vite has to pin React too, and for a worse symptom

The same hoisting breaks the browser. `discord-html-transcripts` needs React 18, so npm puts **18** at the root
and leaves the dashboard's **19** in `dashboard/node_modules` — and `@tanstack/react-query` and `react-router`,
hoisted to the root beside it, then resolve React 18 while the app renders with 19. Every hook in those packages
reads a null dispatcher: `Cannot read properties of null (reading 'useEffect')`, an "Invalid hook call" warning,
and a blank page. It afflicted `npm run dev:all` and the production bundle alike.

`dashboard/vite.config.ts` fixes it with `resolve.dedupe` plus explicit `react` / `react-dom` aliases resolved
through `createRequire(import.meta.url)`, so they find whichever copy the app itself imports rather than a
hardcoded path that breaks the day the hoisting changes.

**Nothing else catches this.** It type-checks, it lints, and the tests pin React themselves, so all 1567 pass
against a page that cannot mount. `npm run verify:bundle` is the guard: it reads `dashboard/dist/assets` and
fails if more than one React version is in there. `build:dashboard` runs it, so `npm run build` and CI both do.
