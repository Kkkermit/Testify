# CLAUDE.md — Testify (TypeScript) conventions

House style for this codebase, and the standard it is being held to.

The reference implementation of that standard is **`Kkkermit/Testify-rewrite`** — the JavaScript rewrite. It is
smaller than this repo but its conventions are deliberate, and its own `CLAUDE.md` documents them in full. This
file states the rules in their TypeScript form, then records exactly where this codebase currently diverges.

> [!IMPORTANT]
> **This file is about conventions.** It does not restate the architecture, the data model, the audit findings
> or the migration plan — those live in [`.codebase-notes/`](.codebase-notes/00-INDEX.md) and are far more
> detailed than anything that belongs here. Read them for _what the code does_; read this for _how it should be
> written_. In particular [`migration/17-CODING-STANDARDS.md`](.codebase-notes/migration/17-CODING-STANDARDS.md)
> is the deeper treatment of naming, error handling, imports and the PR checklist — where the two overlap, it
> wins, and this file should be corrected to match.

---

## Contents

1. [Where this codebase already exceeds the reference](#1-where-this-codebase-already-exceeds-the-reference)
2. [Gap table — what to change](#2-gap-table--what-to-change)
3. [File naming](#3-file-naming)
4. [Folder naming and grouping](#4-folder-naming-and-grouping)
5. [Import aliases and barrels](#5-import-aliases-and-barrels)
6. [Config: constants vs environment](#6-config-constants-vs-environment)
7. [Environment files and the dev/prod bot split](#7-environment-files-and-the-devprod-bot-split)
8. [Logging](#8-logging)
9. [Startup](#9-startup)
10. [Module contracts](#10-module-contracts)
11. [Splitting code into helpers](#11-splitting-code-into-helpers)
12. [Testing](#12-testing)
13. [Linting and formatting](#13-linting-and-formatting)
14. [Git hooks and commit convention](#14-git-hooks-and-commit-convention)
15. [CI workflows](#15-ci-workflows)
16. [Anti-patterns from the JS codebase that must not come back](#16-anti-patterns-from-the-js-codebase-that-must-not-come-back)

---

## 1. Where this codebase already exceeds the reference

Worth stating plainly, so nobody "aligns to the reference" by making something worse. On these axes this repo
is ahead and should not be changed to match:

| Concern      | Reference (JS)                                                   | Here                                                                                                       |
| ------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Environment  | `bootMode.js`, no validation; dev/prod split is **broken**       | `src/config/env.ts` — zod-validated, cached, frozen, fail-fast with a list of what to fix                  |
| Logging      | 9 colour aliases masquerading as levels, single-arg, stdout-only | `pino` with real levels, `LOG_LEVEL`, TTY-aware pretty vs JSON                                             |
| Types        | none (`jsconfig.json` for editor paths only)                     | `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `useUnknownInCatchVariables`        |
| Structure    | `src/functions/*.function.js` mutating the client                | a real `src/core/` layer: `client`, `loader`, `command`, `event`, `button`, `checks`, `errors`, `shutdown` |
| Startup      | un-awaited handlers racing `client.login()`                      | `main()` awaits in order; `publishCommands()` completes before login                                       |
| Shutdown     | `SIGTERM` claims to close the DB and doesn't                     | `src/core/shutdown.ts`                                                                                     |
| Lint         | `no-console: "off"`, no type-aware rules                         | `no-console: "error"`, `no-floating-promises`, `no-misused-promises`, `import-x/order`, `no-cycle`         |
| Coverage     | no thresholds anywhere                                           | `coverageThreshold` (lines 40, functions 40, branches 30) + `collectCoverageFrom`                          |
| CI           | tests only                                                       | typecheck, lint, format:check, coverage, build, **dist artifact verification**, audit, `concurrency`       |
| Boot banner  | 25 `console.log`s, timestamp on every ASCII line                 | `bannerLines()` is pure and testable; `printBanner()` writes once; colour dropped when not a TTY           |
| Node version | `.nvmrc` 24.3.0 vs CI 20 vs README 18–21, no `engines`           | `engines.node: ">=22.11.0"`                                                                                |

Two habits from the reference that this repo already got right and must keep: **the `[TAG] Sentence` log
message convention**, and **the boot banner as presentation written to stdout, never through the logger**.

---

## 2. Gap table — what to change

Everything below is a real divergence from the reference standard, ordered roughly by value.

| #   | Area              | Status              | Where it landed                                                                                       |
| --- | ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Nightly security  | Done                | `.github/workflows/nightly.yml`, `.nsprc`, `.snyk`; version pins explained in `SECURITY.md`           |
| 2   | CI branch scope   | Done                | `ci.yml` triggers on `["**"]`, and reads the Node version from `.nvmrc`                               |
| 3   | File suffixes     | Done                | `.command.ts` / `.event.ts` / `.util.ts` / `.schema.ts`; enforced by `tests/core/conventions.test.ts` |
| 4   | Import aliases    | Done                | `tsconfig.json` `paths`; Jest derives its mapper from it, `tsc-alias` rewrites the build              |
| 5   | Barrels           | Done                | `index.ts` in `@config`, `@core`, `@lib`, `@database`, using `export *`                               |
| 6   | Commit convention | Done                | `scripts/commitRunner.ts` and a `commit-msg` hook running commitlint                                  |
| 7   | Event grouping    | Done                | `ReadyEvents/`, `CommandEvents/`, `CreateEvents/`, `LoggingEvents/`                                   |
| 8   | Dev env template  | Done                | `.env.development.example`, and `npm run setup -- --dev`                                              |
| 9   | Banner detail     | Done                | Emoji icons and a "Loaded from disk" block in `bannerLines()`                                         |
| 10  | Pre-commit        | Done                | `typecheck` runs before `lint-staged`                                                                 |
| 11  | Pre-push coverage | Done                | `test:coverage`, so the thresholds gate the push                                                      |
| 12  | Lint report       | Done                | `scripts/lintRunner.ts` — errors fail, warnings never do                                              |
| 13  | Category folders  | **Decided against** | Kept flat and lowercase. See [§4](#4-folder-naming-and-grouping)                                      |

### Why #13 was declined

The reference nests categories under an interaction-kind folder because slash and
prefix are separate implementations there. Here they are not: one command object
serves both surfaces through the `CommandInput` contract, and `src/core/prefix.ts`
is the only file that knows prefix commands exist. A `SlashCommands/` /
`PrefixCommands/` split would describe an architecture this codebase deliberately
does not have, and would undo the deduplication the rewrite exists to achieve.

The casing was left lowercase to match the rest of `src/`, which is uniformly
camelCase. Two casing regimes inside one tree is a rule to remember rather than a
distinction the reader gains anything from here.

---

## 3. File naming

**camelCase basename + a domain suffix before the extension.** The suffix makes the kind of module visible in
an editor tab, a stack trace and a `git log` line. The reference applied this deliberately in two sweeps
(commits `1e64090`, `8d62700`) and it is the single most visible convention in that repo.

| Suffix        | For                              | Example                              |
| ------------- | -------------------------------- | ------------------------------------ |
| `.command.ts` | a command, on both surfaces      | `commands/moderation/ban.command.ts` |
| `.event.ts`   | a gateway event handler          | `events/ReadyEvents/ready.event.ts`  |
| `.util.ts`    | a shared helper                  | `lib/duration.util.ts`               |
| `.schema.ts`  | a Mongoose model                 | `database/models/economy.schema.ts`  |
| `.test.ts`    | a test (drops the source suffix) | `tests/core/loader.test.ts`          |

**There is no `.slash.ts` or `.prefix.ts`, and reintroducing either would be a mistake.** The reference splits
them because slash and prefix are separate implementations there. Here one object serves both surfaces through
`CommandInput`, and `src/core/prefix.ts` is the only file that knows prefix commands exist — so a suffix naming
one surface describes an architecture this codebase deliberately does not have. It is the same reasoning that
[§4](#4-folder-naming-and-grouping) uses to reject `SlashCommands/` / `PrefixCommands/` folders.

**Unsuffixed, deliberately:** `src/index.ts`, everything in `src/core/` and `src/config/`, everything in
`scripts/`, and `*.config.ts` at the root.

The reference's `.function.js` suffix has **no counterpart here and should not be introduced** — that layer is
`src/core/loader.ts`, and a typed loader is strictly better than a set of files that mutate the client.

> [!NOTE]
> Done in `edc86a5` — 188 files, one mechanical commit, loader globs updated alongside. Commands were renamed
> again from `.slash.ts` to `.command.ts` once the music system was removed, since nothing in the tree was ever
> `.prefix.ts` and the old suffix advertised a split that does not exist. The suffix is load-bearing:
> `commands/*/*.command.ts` and `events/**/*.event.ts` are what the loader looks for, so a file that misses its
> suffix is silently never registered. `tests/core/conventions.test.ts` enforces it.

---

## 4. Folder naming and grouping

**Group by type first, then by domain.** The top level of `src/` is organised by technical role, not by
feature — one feature is spread across layers. That is already true here (`commands/` + `core/` + `database/` +
`lib/` + `jobs/`) and should stay true.

The reference uses **two casing regimes** to mark a real distinction:

- **camelCase for the infrastructure layer** — `core/`, `config/`, `database/`, `lib/`, `jobs/`, `buttons/`.
  This repo already matches.
- **PascalCase for the user-facing category layer** — `SlashCommands/Moderation/`, `ReadyEvents/`,
  `LoggingEvents/`. This repo uses lowercase (`commands/moderation/`) and has no event grouping at all.

**Events (gap #7) — group them.** Seventeen files sit flat in `src/events/`. They already fall into obvious
clusters: the eight `*Audit.ts` files, the guild lifecycle pair, the dispatch entry points
(`interactionCreate`, `messageCreate`), and `ready` + `scheduleJobs`. Mirror the reference:
`ReadyEvents/`, `CreateEvents/`, `LoggingEvents/` (the audit handlers), `CommandEvents/`.

**Command category folders (gap #13) — a genuine decision, not an oversight.** The reference nests categories
under an _interaction-kind_ folder (`SlashCommands/Moderation/`, `PrefixCommands/Moderation/`) because slash
and prefix are separate implementations there. This repo deliberately unified them — a single command serves
both surfaces — so a `SlashCommands/` / `PrefixCommands/` split would actively misrepresent the architecture.

**Recommendation: keep the flat `commands/<category>/` layout and record the divergence as intentional
here.** Adopt only the casing if consistency with the reference is wanted. Do not restructure into
kind-then-domain — that would undo the deduplication this rewrite exists to achieve
([`13-DEDUPLICATION-MAP.md`](.codebase-notes/migration/13-DEDUPLICATION-MAP.md) covers all 46 pairs).

**Categories must be a type, not a string.** Keep `src/config/categories.ts` as the single source of truth,
exported `as const` with a derived union type, so a mistyped category is a compile error. In the JS codebase
the enum values drifted from the folder names (`"ModerationCommands"` vs `Moderation/`) and nothing caught it —
the audit notes flag it with ⚠️ per file.

---

## 5. Import aliases and barrels

Modules should be imported by alias, never by a relative path that climbs:

```ts
import { theme } from "@config/theme";
import { embed } from "@lib/embeds";
import { type CommandContext } from "@core/command";
```

**One alias map, not several.** The reference maintains the same map in three files by hand
(`package.json _moduleAliases`, `jsconfig.json paths`, `jest.config.js moduleNameMapper`) — do not copy that.
Declare it once in `tsconfig.json` and derive everywhere else:

- `tsconfig.json` → `compilerOptions.baseUrl` + `paths` — the source of truth;
- `tsup.config.ts` → resolve the same aliases at build time (tsup reads `tsconfig` paths; verify `dist/`
  actually runs, since `module: "CommonJS"` output must not keep `@`-specifiers);
- `jest.config.ts` → `pathsToModuleNameMapper(compilerOptions.paths)` from `ts-jest/utils`, or a hand-written
  mapper generated from the same object — never a second literal copy.

Aliases in use: `@core`, `@config`, `@lib`, `@commands`, `@events`, `@buttons`, `@database`, `@jobs`, `@root`
and `@tests`. Each is declared twice — bare for the barrel (`@lib`) and wildcard for a single module
(`@lib/embeds.util`) — because a bare specifier does not match a wildcard path.

> [!NOTE]
> esbuild does not rewrite alias specifiers when `bundle` is off, so `dist/` shipped `require("@core/…")` and
> would not have started. The build runs `tsc-alias` in `onSuccess` to rewrite them from the same tsconfig map.
> Verify with `grep -r 'require("@core' dist` after any change to the build.

**Barrels: one `index.ts` per aliased directory.** The reference hand-maintains a flat list of 40 names in
`src/utils/index.js`, which has to be edited for every new function. Use `export * from "./x"` instead so the
barrel maintains itself.

> [!WARNING]
> Barrels plus `import-x/no-cycle` need care — `src/lib/` and `src/core/` already reference each other, and a
> barrel can turn a fine dependency into a cycle. Add barrels leaf-first and let the lint rule (already
> configured at `maxDepth: 6`) be the check. In the reference, `folderLoader.util.js` and `asciiText.js` both
> `require("@utils")` _inside the function body_ purely to dodge a barrel cycle — that workaround is a smell,
> not a pattern to copy.

---

## 6. Config: constants vs environment

**The rule from the reference, and it is a good one: the constants module reads zero environment variables.**
`src/config.js` there holds only values that are identical for every deployment; everything per-deployment
comes from `process.env`. This repo already splits it correctly:

| Module                     | Holds                                                  |
| -------------------------- | ------------------------------------------------------ |
| `src/config/constants.ts`  | fixed operational values                               |
| `src/config/theme.ts`      | embed colours, repository URL — presentation constants |
| `src/config/strings.ts`    | user-facing copy                                       |
| `src/config/categories.ts` | the category union                                     |
| `src/config/env.ts`        | **everything from the environment**, and nothing else  |

Two rules to hold:

- **Export `as const`** so `embedColor` is the literal `"Blurple"` and not `string`.
- **No committed snowflakes.** The reference has its own logging-channel IDs and `developerIds` hardcoded in
  `config.js`, so a fresh clone logs into someone else's Discord channel. Every ID here goes through
  `env.ts` (`DISCORD_OWNER_IDS`, `CHANNEL_*_LOG`) — keep it that way.

---

## 7. Environment files and the dev/prod bot split

**The point: `npm run dev` must start a throwaway test bot, never the production one.**

This repo already implements it correctly — `loadEnv()` in `src/config/env.ts` is the first statement of
`main()`, before anything reads `process.env`:

```ts
const file = resolve(process.cwd(), process.env.NODE_ENV === "development" ? ".env.development" : ".env");
if (existsSync(file)) loadDotenv({ path: file, quiet: true });
```

Conventions to keep:

- **Validate once, at startup, and fail with a list.** A missing or malformed value stops the bot immediately
  rather than breaking halfway through a command hours later. The zod schema is the single declaration of every
  variable, its format (`/^\d{17,20}$/` for Discord IDs) and its default.
- **`SCREAMING_SNAKE` with a `DISCORD_` prefix** for Discord-owned values. The reference uses bare lowercase
  (`token`, `clientid`, `devid`) which is ambiguous and, per the audit notes, produced live casing bugs where
  the setup script wrote one case and the code read another.
- **Blank means absent.** `KEY=` in a file is an empty string, not an absent one, and optional settings are
  meant to be left blank — `withoutBlanks()` handles this. Keep it.
- **One source of truth for ownership.** `DISCORD_OWNER_IDS` only. The reference has two competing ones —
  `ownerOnly` checks `process.env.devid` while `devOnly` checks a hardcoded `config.developerIds` array.
- **Keep the interactive generator.** `npm run setup` (`scripts/setupEnv.ts`) is the equivalent of the
  reference's `setup-env`, and its required-field retry loop is the behaviour worth preserving.

**Gap #8 — add `.env.development.example`.** `loadEnv()` reads `.env.development`, but only `.env.example` is
committed, so there is nothing to copy when setting up a dev bot. The reference has the same fault in mirror
image: its template is named `.development.example.env` while its loader reads `.env.development`. **Name the
template after the file it becomes.** `.gitignore` already covers `.env*` — confirm the new template is
explicitly un-ignored.

Also make sure `npm run setup` can write _either_ file (a `--dev` flag), and that `.env.example`'s comments
say which values must differ between the dev and production bots — `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`
must, `DISCORD_DEV_GUILD_ID` should be set in development and blank in production.

---

## 8. Logging

Two separate jobs, and the reference conflates them. Keep them apart.

### Transport — `src/core/logger.ts`

`pino`, with a real level threshold from `LOG_LEVEL`, pretty-printed and colourised when
`process.stdout.isTTY` and structured JSON when it isn't. Rules:

- **`no-console: "error"`** is already enforced in application code (off for `scripts/` and tests). Keep it.
- **Pass the error as structured context, not as a second string argument:**
  `logger.error({ err }, "[BAN] Failed to ban member")`. The reference's logger takes exactly one argument and
  **silently discards** the error object at roughly five call sites, losing the stack trace every time.
- **Keep the message convention:** a `[SCREAMING_SNAKE_TAG]`, then a sentence-case sentence that usually ends
  with remediation advice. Tag suffixes are meaningful — `[X]` for a notice, `[X_ERROR]` for a failure in that
  subsystem, `[X_SUCCESS]` for a completion. Examples from the reference:

  ```
  [DATABASE] No MongoDB URL has been provided. Skipping database connection.
  [BAN] Failed to DM user. This can happen when their DM's are off, or the user is a bot.
  ```

  This is the most valuable logging habit in that repo and it is transport-independent.

- Never log a token, a connection string, or a full env dump.

### Presentation — `src/lib/banner.ts`

The boot banner is for a human watching a terminal and is `process.stdout.write`-n directly, never routed
through the logger. The current design is right and better than the reference's: `bannerLines()` is pure and
unit-testable, `printBanner()` writes once, colour is dropped when not a TTY, and there is no timestamp
prefixed to every line of ASCII art (the reference prints its six-line wordmark as six timestamped
`console.log` calls).

**Gap #9 — two details to bring across:**

1. **Emoji label icons**, column-aligned so the colons line up. The reference's ready block:

   ```
   [ts]  🤖 Bot Name   : Testify
   [ts]  🌍 Servers    : 12
   [ts]  👥 Members    : 3401
   [ts]  ⚡ Startup    :  ➜  Ready in: 812ms
   ```

   Here `fact()` already pads to 12 characters — adding the icon is a one-line change.

2. **A loaded-module count block.** `folderLoader.util.js` prints what was loaded, which is the fastest way to
   notice that a whole category silently failed to load:

   ```
   [ts]  📦 Loading project files...
   [ts]  🗃  Schemas     : 3 loaded
   [ts]  📜 Scripts     : 4 loaded
   [ts]  ⚡ Events      : 8 loaded
   ```

   `loadEverything(client)` already returns `counts` and it currently only goes to `logger.debug`. Surface it.

Glyph vocabulary, shared between banner and logs: `✓` done (green), `↻` in progress (yellow), `⚠` warning
(yellow), `➜` a measurement. Section rules are `"═".repeat(n)` heavy and `"─".repeat(n)` thin.

---

## 9. Startup

`src/index.ts` is the shape to keep — a single `async function main()` that awaits each step in order, with a
top-level catch that writes to stderr and exits non-zero:

```ts
async function main(): Promise<void> {
	const env = loadEnv(); // 1. env first, validated
	const logger = createLogger(env.LOG_LEVEL); // 2. then the logger
	const client = new TestifyClient(env, logger);
	handleProcessSignals(client); // registered exactly once
	await connectDatabase({ uri: env.MONGODB_URI, logger });
	const counts = loadEverything(client);
	await publishCommands(client); // awaited, before login
	await client.login(env.DISCORD_TOKEN);
}
```

Why each part matters — every one of these is a bug in the reference:

| Rule                                          | What it prevents there                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Env loaded and validated first                | token read before the env file loads, so `dev` runs the production bot                                   |
| `await` every registration step               | `client.login()` racing the REST command deploy                                                          |
| Signal handlers registered once, in one place | double registration, so every signal logs twice and `process.exit()` races                               |
| No circular import back into the entry point  | `require("@src/index")` resolving to `{}` and being used as a client                                     |
| Subclass the client; declare its fields       | six ad-hoc properties bolted onto the instance, documented nowhere                                       |
| Resolve paths from `__dirname`                | `readdirSync("./src/…")` breaking unless started from the repo root — and the reason `dist/` was blocked |
| Shutdown actually closes mongoose             | `SIGTERM` logging "Closing database and exiting..." and closing nothing                                  |

`src/core/shutdown.ts` owns graceful shutdown. `uncaughtException` and `unhandledRejection` must set a
non-zero exit code and terminate — never log and continue, which leaves the process in an undefined state.

---

## 10. Module contracts

Every loadable module gets its shape from a `define*` helper in `src/core/`, so the contract is checked at
compile time rather than by the loader at runtime:

| Kind    | Defined by            | Registered by             |
| ------- | --------------------- | ------------------------- |
| Command | `src/core/command.ts` | `src/core/loader.ts`      |
| Event   | `src/core/event.ts`   | `src/core/loader.ts`      |
| Button  | `src/core/button.ts`  | `src/core/loader.ts`      |
| Gate    | `src/core/checks.ts`  | called by the dispatchers |

Rules:

- **Components go in a registry keyed by `customId`, never an if-chain.** `src/buttons/` plus
  `src/core/button.ts` is the right structure; the reference routes eight `customId` values through a
  711-line `if`/`else` in one event file. The audit notes record 27 concurrent `interactionCreate` listeners,
  three separator conventions and a live collision in the JS codebase.
- **Component state is per-interaction.** Never stash it on the client — the reference's `client.helpData` is
  global, single-slot and shared across every guild and user, so two people using `/help` at once corrupt each
  other's session. Encode what you need in the `customId`, or look it up again.
- **Exactly one `interactionCreate` listener**, dispatching to the registries.
- **Build embeds with `embed()` from `src/lib/embeds.ts`** — enforced by the `no-restricted-syntax` rule
  banning bare `new EmbedBuilder()`. The JS codebase has 459 hand-built embeds; the factory removes ~800 lines.
- **Deploy guild-scoped commands to `DISCORD_DEV_GUILD_ID` when it is set**, globally when it isn't. The
  reference registers globally on every boot and collects a `guildid` it never uses, so dev command changes
  take up to an hour to appear.

---

## 11. Splitting code into helpers

**The dividing line: extract when a second call site appears, or when the logic is worth testing in
isolation.** The reference's rule was narrower — extract only what both the slash and prefix surfaces need —
and because those were separate implementations there, it produced a near-duplicate pair for every helper
(`checkDmUsability` / `checkMessageDmUsability`, and so on for five of six gate concerns).

**This repo's unified command model makes that pair pattern unnecessary — do not reintroduce it.** One
`CommandContext` covering both a slash interaction and a prefix message, with a `reply()` that does the right
thing for each, means one `checkX(ctx)` per concern.

Two further improvements on the reference:

- **Gates should be pure and return a result, not reply.** The reference's gates are side-effecting predicates
  that both decide _and_ reply, which makes them untestable without a mock interaction, and inconsistent —
  the sync ones don't await their replies while `checkBlacklist*` is async, so call sites mix
  `if (!(await checkBlacklistSlash(...)))` with `if (!checkDmUsability(...))`. Return a discriminated result
  (`{ ok: true } | { ok: false; reason: string }`) and let the dispatcher reply.
- **Extract what the reference left copy-pasted:** the missing-permissions diff, the error embed, and the
  `replied || deferred ? followUp : reply` decision. All three exist here (`lib/embeds.ts`, `lib/reply.ts`) —
  keep them the only implementations.

Where a helper belongs: `src/lib/` for domain helpers and formatters, `src/core/` for framework concerns
(loading, dispatch, contracts, errors, shutdown), `src/config/` for constants. A helper that pre-formats its
output with Discord markdown is doing presentation — keep formatting at the edge, as `lib/format.ts` does.

---

## 12. Testing

`tests/` mirrors `src/` (`tests/config/`, `tests/core/`, `tests/database/`, `tests/lib/`, plus
`tests/helpers/` for shared harness code), tests drop the source suffix, and `tests/setup.ts` runs via
`setupFilesAfterEnv`. Coverage is configured and thresholded — keep both.

The pattern to bring over from the reference is its **mock factory layer**, which is the strongest idea in
that test suite:

- **A factory per surface**, pre-stubbing everything: `createMockInteraction()`, `createMockMessage()`,
  `createMockSubcommandInteraction()`. Every method is already a `jest.fn()`, so a test only configures what
  it cares about.
- **`overrides` spread last**, so any single branch can be replaced without rebuilding the object.
- **Defaults that respect falsy overrides.** The reference's `createMockModel(defaultDoc, methodOverrides)`
  uses a `hasOwnProperty`-aware helper so an override of `null` / `0` / `false` is honoured rather than
  falling through to the default — a subtle bug that a naive `??` default would introduce.
- **Type the factories** (`createMockInteraction(overrides?: Partial<ChatInputCommandInteraction>)`) so a mock
  that drifts from the real Discord shape is a compile error. This is the part the reference cannot do.

Use `mongodb-memory-server` where the query itself is under test, and a mocked model where it isn't.

---

## 13. Linting and formatting

**Prettier stays fully decoupled from ESLint** — `eslint-config-prettier` last in the config, no
`eslint-plugin-prettier`. Settings match the reference exactly, and both repos agree:

```json
{
	"useTabs": true,
	"printWidth": 120,
	"trailingComma": "all",
	"arrowParens": "always"
}
```

`eslint.config.mjs` already exceeds the reference's config: type-aware rules via `projectService`, `import-x`
ordering and cycle detection, `no-console: "error"`, and per-area overrides for `src/core/loader.ts`,
`scripts/**` and `tests/**`. Two conventions in it worth calling out because they are unusual and deliberate:

- **`no-restricted-syntax` banning `new EmbedBuilder()`** outside the three files that legitimately build
  embeds. An architectural rule enforced by the linter, which is exactly where it belongs.
- **Every override carries a comment explaining why.** Keep that — an unexplained rule override rots.

**Gap #12, optional:** the reference's `lintRunner.js` drives the ESLint **Node API** to print a colourised
per-file report and a summary, and **exits non-zero on errors only — warnings never fail the build.** That
error/warn split is the substance; the pretty report is taste. If ported to `scripts/lintRunner.ts`, keep the
split.

---

## 14. Git hooks and commit convention

### Hooks

| Hook         | Reference                      | Here today                    | Target                                                 |
| ------------ | ------------------------------ | ----------------------------- | ------------------------------------------------------ |
| `pre-commit` | `npm run lint` + `lint-staged` | `lint-staged`                 | add `npm run typecheck` (gap #10)                      |
| `commit-msg` | — (none; the gap)              | —                             | **`commitlint`** (gap #6)                              |
| `pre-push`   | `test:coverage`                | `typecheck` + `lint` + `test` | `test:coverage`, so thresholds gate the push (gap #11) |

Staged-only linting cannot see a type error introduced in an unstaged file, which is why `typecheck` belongs
in `pre-commit` and not only in `pre-push`.

### Commit format

**`type: Capitalized subject`** — no scopes, no bodies, no `!` markers, no trailers. Eleven types:

| Type       | Meaning                                  |
| ---------- | ---------------------------------------- |
| `feat`     | A new feature                            |
| `fix`      | A bug fix                                |
| `docs`     | Documentation changes                    |
| `style`    | Code style changes (formatting, etc)     |
| `refactor` | Code refactoring with no feature changes |
| `perf`     | Performance improvements                 |
| `test`     | Adding or updating tests                 |
| `chore`    | Maintenance tasks, dependency updates    |
| `add`      | Adding new features or files             |
| `update`   | Updating existing features or files      |
| `remove`   | Removing features or files               |

`add`, `update` and `remove` are extensions beyond Conventional Commits and are part of the house style.
Examples from the reference's history:

```
feat: Added in blacklist command system and unit tests
refactor: Updated file names to include slash & prefix
chore: Upgraded flatted package version
```

Branches: `feature/your-feature-name`.

**Gap #6 — do this in two halves, and the second half is the important one.**

1. `scripts/commitRunner.ts` (`npm run commit`): banner, numbered type menu, reject empty, capitalise the
   subject, confirm, commit. Use `prompts` (already a dependency) rather than raw `readline`, and
   **`execFile("git", ["commit", "-m", message])` with an argv array** — the reference interpolates the message
   into a double-quoted shell string, so a `"`, a backtick or a `$` breaks or injects.
2. A **`commit-msg` hook running `commitlint`**, configured with exactly these eleven types, no scope, and a
   capitalised subject. The reference has no such hook, so its convention is enforced only by asking nicely —
   and a malformed commit (`ea0fe07 add: Add: Added in helper directory…`) is already in its history. A wizard
   helps the people who use it; the hook is what makes the convention true.

---

## 15. CI workflows

### `ci.yml` — keep, and widen the trigger

The four jobs (`check`, `test`, `build`, `audit`) and the `dist/` verification step are ahead of the reference
and should stay. Two changes:

- **Gap #2: trigger on all branches.** The reference runs on `branches: ['**']` for both `push` and
  `pull_request`, so a feature branch is checked before a PR exists. Currently `[main, master]` only, which
  means most work is unverified until PR time.
- Read the Node version from `engines`/`.nvmrc` rather than the hardcoded `NODE_VERSION: "22"`, so there is one
  source of truth. (The reference has the opposite problem — three sources that disagree.)

### `nightly.yml` — add (gap #1, the highest-value item here)

Scheduled dependency scanning belongs on a nightly, not on every commit: it is slow, it depends on third-party
APIs, and a new CVE published overnight should be found without waiting for someone to push. Copy the
reference's structure:

`on: schedule: cron: '0 0 * * *'` plus `workflow_dispatch`, and four jobs:

1. **`unit-tests`** — with an `if: always()` artifact upload, `retention-days: 7`.
2. **`npm-audit`** — `better-npm-audit audit --level=high`, reading `.nsprc`.
3. **`snyk`** — `snyk/actions/node@master` with `--severity-threshold=high --policy-path=.snyk`, and
   **`continue-on-error: true`** so a transient Snyk 403 (token quota, org permissions) cannot fail the
   pipeline and raise a false alarm.
4. **`notify-on-failure`** — `needs: [...]` + `if: failure()`, opening an issue via `actions/github-script@v7`
   titled `🚨 Nightly pipeline failed — <date>`, labelled `['bug', 'ci-failure']`, with a "What to check" list
   and a link to the run.

**Least privilege, escalated per job:**

At the top of the workflow, default everything to read-only:

```yaml
permissions:
  contents: read
```

Then grant write access on the one job that needs it, and nowhere else:

```yaml
jobs:
  notify-on-failure:
    permissions:
      issues: write
```

**And the pattern that matters most: suppressions expire.** Both allowlists require three things — a written
reason, the version that fixes it, and a hard expiry — so a suppression cannot rot silently into a permanent
blind spot.

`.nsprc`:

```json
{
	"1112496": {
		"active": true,
		"notes": "Introduced transitively via discord.js@14.x -> undici@6.21.3. Cannot upgrade undici without a breaking downgrade of discord.js. Fixed in undici@6.24.0 — re-evaluate when discord.js ships a compatible release.",
		"expiry": 1789776000000
	}
}
```

`.snyk` carries the same three facts in Snyk's YAML form with `expires: '2026-09-19T00:00:00.000Z'`.

This repo already pins several `overrides` (including `discord-html-transcripts` → `undici`) — those need the
same treatment: each one gets a comment saying why it exists and when to re-check.

> [!NOTE]
> Two mistakes in the reference's `nightly.yml` not to copy: it uploads `coverage/` and `junit.xml` from a job
> that runs plain `npm test` (no `--coverage`, no junit reporter), and uploads `npm-audit.json` from a tool
> that only writes to stdout — three artifact paths that never contain anything. Make the uploads match what
> the commands actually produce.

---

## 16. Anti-patterns from the JS codebase that must not come back

The full, numbered list is [`04-AUDIT-FINDINGS.md`](.codebase-notes/04-AUDIT-FINDINGS.md) (100 findings) and
the standards doc's own list is in
[`17-CODING-STANDARDS.md`](.codebase-notes/migration/17-CODING-STANDARDS.md). This is the short version — the
classes of defect that the conventions above exist to prevent:

1. **Reading `process.env` before the env file is loaded**, and relying on `dotenv` to override an
   already-loaded value (it doesn't). One validated `loadEnv()` first, always.
2. **Un-awaited async registration**, so login races command deployment. `no-floating-promises` is on; keep it
   on.
3. **Handlers registered twice** because a directory scan re-invokes a module that was already called directly.
4. **A circular import back into the entry point**, resolving to `{}` and being used as though it were a client.
5. **Properties bolted onto the client at runtime** — 20 of them in the JS codebase. Declare fields on
   `TestifyClient`.
6. **Global single-slot state for per-interaction data** (`client.helpData`).
7. **A handler whose parameters are in the wrong order**, so its first guard always returns and the feature is
   silently dead. Two features in the JS codebase never ran once. Typed `defineEvent()` prevents exactly this.
8. **`catch` blocks calling `interaction.reply()` with no `replied`/`deferred` guard** → unhandled
   `InteractionAlreadyReplied`. Use `lib/reply.ts`.
9. **Raw errors interpolated into user-visible embeds** — leaks internal paths and can exceed the 4096-char
   description limit.
10. **Swallowing an error into a `.catch()` that only logs**, then continuing on a possibly-undefined value.
11. **Read-modify-`save()` on balances with no atomic operation** — money can be duplicated. Use atomic updates.
12. **Two models sharing one collection with different shapes** — the single worst finding in the audit.
13. **Directory scans resolved against the CWD** (`readdirSync("./src/…")`), which breaks `dist/` and any start
    from another directory.
14. **`console.*` as the log path**, and a logger that drops the error object it was handed.
15. **Undeclared dependencies** resolving through transitive hoisting, and declared-but-unused packages.
    `import-x/no-extraneous-dependencies` is on.
16. **An alias map duplicated across several files**, and a category enum whose values drift from the folders.
17. **A commit convention with nothing enforcing it.**
18. **A README describing features and scripts that do not exist.** Regenerate `COMMANDS.md` with
    `npm run docs:commands` rather than hand-maintaining it.
