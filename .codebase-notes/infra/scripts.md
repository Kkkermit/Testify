# `src/scripts/` — Maintenance Scripts

**10 files · 988 lines.** Exposed as npm scripts.

---

| File | npm script | Lines | Verdict |
|---|---|---:|---|
| `bootMode.js` | (called from `index.js`) | 24 | Port |
| `consoleLogger.js` | (used by `setupLoggers`) | 316 | Rewrite into the logger |
| `commitRunner.js` | `commit` | 89 | Port — **fix the injection** |
| `linesOfCode.js` | `codebase-info` | 106 | Port |
| `postInstallation.js` | `postinstall` | 22 | **Delete** |
| `setupEnvFile.js` | `setup-env:prod` / `:dev` | 81 | Port — **fix the casing bug** |
| `setupLogs.js` | `log-setup` | 132 | **Delete** |
| `updatePackages.js` | `update-packages` | 41 | **Delete** |
| `wipeDatabase.js` | `wipe-data:prod` / `:dev` | 118 | Port |
| `ytdlUpdater.js` | `update-ytdl-core` | 49 | **Delete** |

---

## `setupEnvFile.js` — the highest-impact bug in the repo

Interactive `readline` prompts for 16 values, then `fs.writeFileSync`.

**It writes four keys all-lowercase that the code reads camelCase:**

```
webhookslashlogging=        ← written        process.env.webhookSlashLogging      ← read
webhookprefixlogging=                        process.env.webhookPrefixLogging
webhookbuglogging=                           process.env.webhookBugLogging
webhooksuggestionlogging=                    process.env.webhookSuggestionLogging
```

On Linux and macOS `process.env` is case-sensitive, so **anyone who set up their `.env` using the documented
`npm run setup-env:prod` flow has slash-command logging, prefix-command logging, bug reports and suggestions
silently disabled.** No error is raised. **Finding 3.**

Also: **no quoting or escaping** of entered values, so a password or connection string containing `#`, a quote
or a newline produces a malformed `.env`. `rl.close()` runs only on the success path, so the process hangs on
any throw.

---

## `setupLogs.js` — patches `node_modules`

Computes `path.join(__dirname, '../../node_modules/discord-logs/lib/index.js')` and **overwrites that file**
with a 120-line hardcoded string. The README documents doing the same edit by hand.

This is destroyed by every `npm install` — **including the one that runs at every boot** via `ytdlUpdater`.
It is invisible to source control, makes builds non-reproducible, and is silently lost in any Docker or CI
deployment. The embedded copy also re-implements `color` and `getTimestamp` (the **third** definition in the
repo) and faithfully preserves an upstream bug: `intents.has(Flags.GuildMessages && Flags.MessageContent)`
uses `&&` on bitfields where `|` was meant. **Finding 88.**

**Delete it.** The patch only adds coloured, timestamped registration logging — vendor the ~90 lines of
handler registration into our own typed module and drop the dependency, or wrap it normally and do our own
logging.

---

## `ytdlUpdater.js` — `npm install` at boot

`execSync('npm install @distube/ytdl-core@latest --save --no-fund')` and the same for `@distube/ytsr`.

Called from `index.js` **on every single boot**, and again from the DisTube `error` handler. It blocks
startup, mutates `package.json` and `package-lock.json` at runtime, and directly contradicts `.npmrc`'s
`save-exact=true` and any reproducible deployment. **Finding 40.**

It is the only script with a proper `require.main === module` guard.

**Delete from the boot path.** Keep dependency updates as a deliberate, human-run operation.

---

## `commitRunner.js` — shell injection

An interactive conventional-commit picker (11 types) that ends in
`exec(\`git commit -m "${message}"\`)`.

**The user-typed message is interpolated straight into a shell string**, so a `"` or `$(…)` executes.
**Finding 16.** Use `execFile('git', ['commit', '-m', message])` — no shell, no injection.

Also: `rl.close()` runs *before* the async `exec` callback, and the file declares `prompts` and `inquirer` as
dependencies while using raw `readline`.

---

## `wipeDatabase.js`

`fs.readdirSync('../schemas')` plus dynamic `require(\`../schemas/${name}\`)` — **the second dynamic-require
site that breaks under TypeScript compilation** (**finding 78**). Then a `prompts` multiselect →
`deleteMany({})`.

| Issue | Detail |
|---|---|
| **A second `mongoose.connect`** | Independent of the one in `ready.js`, with `useNewUrlParser`/`useUnifiedTopology` — **removed no-ops in Mongoose 6+**. |
| **Unguarded dereference** | `schemaResponse.selectedSchemas` — pressing Ctrl-C at the multiselect throws. |
| **No confirmation before "wipe entire database"** | For a destructive, irreversible operation. |

**Rewrite:** import models from the typed registry rather than scanning the filesystem, share the single
connection module, add a typed confirmation step.

---

## `consoleLogger.js` — 316 lines

Exports `{ setup, logger, flushLogs }` plus a module-level singleton.

**Monkeypatches `process.stdout.write`, `process.stderr.write`, and `console.log/error/warn/info`.**
Because `console.log` internally calls `stdout.write`, **every message is captured twice** — only a
second-granularity `messageHash` dedupe hides it.

| Issue | Detail |
|---|---|
| **Unbounded log file** | `fs.appendFileSync` on **every** log line to `logs/console.log`, synchronously, with **no rotation**. **Finding 48.** |
| **Double capture** | See above. |
| **Three timers** | Only cleared on `'exit'`. |
| **Double-setup double-wraps** | The constructor snapshots `stdout`/`stderr`, so calling setup twice nests the patches. |
| **Undeclared `node-fetch`** | **Finding 13.** |

Its one genuinely good idea — a manual Discord rate-limit queue with exponential backoff — is worth keeping as
a **pino transport** rather than a global monkeypatch.

---

## `postInstallation.js` — 22 lines

22 `console.log` lines embedding the entire installation guide, duplicating the README.

It documents only the seven original env vars and **never mentions** the Spotify trio, `PORT`,
`NGROK_AUTH_TOKEN`, `CLASH_ROYAL_API_KEY` or `LOG_WEBHOOK_URL`. It also tells users to run **`npm run start`,
a script that does not exist** (the real one is `npm run prod`).

Because it is wired as `postinstall`, **it runs on every CI `npm ci`**.

**Delete.** Regenerate any install guidance from the env schema so it cannot drift again.

---

## `updatePackages.js` — 41 lines

`npm outdated --json` → `npm install <pkg>@latest` in a loop. Self-executes at import. Runs unbounded
installs with no review step. **Delete** — dependency bumps belong to a human or to Dependabot/Renovate.

---

## `bootMode.js` and `linesOfCode.js`

**`bootMode.js`** picks `.env.development` when `NODE_ENV === 'development'`, else `.env`, and exits 1 if
missing. Correct, but note the naming trap: **the committed example is `.development.example.env` while the
loader expects `.env.development`.** Folds into `config/env.ts`.

**`linesOfCode.js`** is a recursive LOC counter. Its `!file.startsWith('node_modules')` guard is dead (it only
scans `src/`), and comment detection is line-prefix heuristics that miscount block comments and `*` inside
strings. Port as `scripts/codebaseInfo.ts`.

---

## Rewrite summary

```
scripts/
  commit.ts          ← commitRunner.js, execFile instead of exec
  setupEnv.ts        ← setupEnvFile.js, generated FROM the env schema, with escaping
  wipeDatabase.ts    ← wipeDatabase.js, typed registry + confirmation
  codebaseInfo.ts    ← linesOfCode.js
```

Deleted: `setupLogs.js`, `ytdlUpdater.js`, `updatePackages.js`, `postInstallation.js`.
Absorbed: `bootMode.js` → `config/env.ts`, `consoleLogger.js` → `core/logger.ts` (as a transport).
