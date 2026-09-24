# Contributing

Thanks for taking a look. Issues and pull requests are both welcome.

## Getting set up

```bash
npm ci
npm run setup -- --dev   # writes .env.development, the file `npm run dev` reads
npm run dev
```

You need Node 24.11 or newer and a MongoDB you can connect to. Set
`DISCORD_DEV_GUILD_ID` to a test server so what you are halfway through building is not live everywhere.

## Before you open a pull request

```bash
npm run check
```

That runs the typecheck, the linter, the formatter check and the tests — exactly
what CI runs. The pre-commit and pre-push hooks run most of it for you.

## House style

- **No comments that restate the code.** Write one when the _why_ is not obvious
  from the _what_ — an ordering constraint, a Discord API quirk, a decision that
  looks wrong until you know the reason.
- **Formatting is Prettier's job.** Tabs, 120 columns; do not fight it by hand.
- **British spelling** in user-facing text and in names we own (`colour`,
  `levelling`). discord.js spellings stay as discord.js writes them.
- **Throw, do not reply, on failure.** `UserFacingError` is shown to the user;
  anything else is logged and they get a generic apology.
- **Build embeds with `embed()`** from `@lib/discord` so everything matches.
  The linter enforces this.

## Where things go

| You are adding…            | Put it in                  |
| -------------------------- | -------------------------- |
| A command                  | `src/commands/<category>/` |
| A button, menu or modal    | `src/buttons/`             |
| A gateway event            | `src/events/`              |
| Something on every message | `src/events/message/`      |
| Repeating background work  | `src/jobs/`                |
| A shared helper            | `src/lib/<domain>/`        |
| A database model or query  | `src/database/`            |

Nothing needs registering — the loader picks files up from these folders at
start-up. If a file is shaped wrongly the bot refuses to start and names it.

## Imports

Modules are imported by alias, never by a relative path that climbs:

```ts
import { theme } from "@config/theme";
import { embed } from "@lib/discord";
import { type CommandInput } from "@core/command";
```

The map lives in `tsconfig.json` and nowhere else — `jest.config.ts` reads it,
and the build rewrites the aliases to relative paths with `tsc-alias` so `dist/`
runs under plain Node. Adding an alias means editing one file.

`src/lib` is split into domain folders — `discord`, `music`, `economy` and so
on — and each has an `index.ts` barrel. Commands, buttons, events and routes
import the barrel (`@lib/music`); code inside `src/lib` and `src/core` imports
the module itself (`@lib/music/musicQueue.util`), because a barrel there is how a
cycle starts. The linter enforces both. A new module needs one line in its
folder's `index.ts`, and a test names it if that line is missing.

## Slash and prefix

Commands are written once, against the `CommandInput` contract in
`src/core/command.ts`. A slash interaction satisfies it, and so does
`PrefixInteraction` in `src/core/prefix.ts` — that one file is the only place in
the codebase that knows prefix commands exist.

If you add something to `CommandInput`, the compiler will make you teach the
prefix side to answer it too. That is deliberate: it is what stops the two
surfaces drifting apart.

Two things to keep in mind when adding options:

- **Required options come first.** Prefix commands fill options by position, and
  Discord rejects a slash command that lists a required option after an optional
  one. A test enforces this.
- **Put the free-text option last.** The final text option swallows the rest of
  the message, so `t?ban @someone being a nuisance` works without quotes.

## Discord's limit of 100 commands

An application may publish 100 slash commands, and Discord rejects the whole
batch if you go over — so one command too many stops the bot starting. There is
a test for it, and start-up refuses with an explanation.

Subcommands do not count, so the way to add more is to group. Move the file into
a `subcommands/` folder — the loader only reads files directly inside a category
folder — and expose it from a parent:

```ts
// src/commands/fun/fun.command.ts
import { asSubcommand, defineCommand } from "../../core/command";
import dadJoke from "./subcommands/dadJoke.command";

export default defineCommand({
	name: "fun",
	description: "Jokes, generators and other nonsense.",
	category: "fun",
	subcommands: [asSubcommand(dadJoke, ["dadjoke"])],
});
```

`subcommands/dadJoke.command.ts` stays an ordinary command file — nothing inside it
changes. It keeps its own name as a prefix alias, so `t?dad-joke` still works
alongside `/fun dad-joke`, and the second argument adds more.

## Translating the dashboard

Every string the dashboard renders lives in `dashboard/src/i18n/locales/`. English is the source; the rest are
translated from it.

To add a language, copy `en.json`, translate the values, and add the code and its endonym — the word the
language calls itself — to `LOCALES` and `LOCALE_NAMES` in `dashboard/src/i18n/index.ts`. The tests name
anything missing: a key English has that yours does not, a stale key left by a rename, or a changed
`{{placeholder}}`.

To fix a wording rather than a language, edit `en.json` and the three beside it. `dashboard/src/test/voice.test.ts`
holds the house style — British spelling, curly apostrophes, second person — and reads the dictionary directly.

The bot's own replies inside Discord are **not** translated, and neither is anything a server has typed itself.

## Tests

Tests live in `tests/` and mirror `src/`. Anything with real logic in it —
formatting, pagination, the levelling curve, a repository — should have one.
Repository tests use an in-memory MongoDB and skip themselves when one cannot be
started, so they never fail for environmental reasons.

## Commits

`type: Capitalized subject` — no scopes, no trailing full stop:

```
feat: Added the coinflip command
fix: Stopped losing XP when two messages arrive together
```

Eleven types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`chore`, `add`, `update`, `remove`.

`npm run commit` walks you through it. A `commit-msg` hook runs commitlint
either way, so the convention holds whether or not you use the wizard.

Branches: `feature/your-feature-name`.

## Hooks

| Hook         | Runs                          | Why                                                              |
| ------------ | ----------------------------- | ---------------------------------------------------------------- |
| `pre-commit` | `typecheck`, then lint-staged | Staged-only linting cannot see a type error in an unstaged file  |
| `commit-msg` | `commitlint`                  | The commit format holds without relying on people remembering it |
| `pre-push`   | `lint`, `test:coverage`       | Coverage thresholds gate the push, not just CI                   |
