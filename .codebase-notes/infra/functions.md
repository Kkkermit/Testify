# `src/functions/` — The Loader Layer

**5 files · 191 lines.** Every file follows the same pattern:
`module.exports = (client) => { client.<method> = async (...) => { … } }`.

They are loaded by the `for (file of functions)` loop in `src/index.js`, which is also why
`processHandlers.js` runs twice.

**This folder is the highest-priority rewrite target in the codebase.** Everything downstream depends on it,
and it contains most of the hard TypeScript blockers.

---

## `handleCommands.js` — 65 lines

Attaches `client.handleCommands(commandFolders, path)`.

**Flow:** read each category folder → `require` each file → `client.commands.set(command.data.name, command)`
→ push `command.data.toJSON()` into `client.commandArray` → `REST.put(Routes.applicationCommands(clientId))`.

| Issue | Detail |
|---|---|
| **Two path schemes for the same files** | Reads via `fs.readdirSync(\`${path}/${folder}\`)` where `path` is the CWD-relative `"./src/commands"`, but requires via the `__dirname`-relative `\`../commands/${folder}/${file}\``. **Finding 79.** |
| **Top-level `return`** | Guards on `process.env.clientid`; on failure `module.exports` is never assigned, so the caller gets `TypeError: require(...) is not a function` — a loud failure for the wrong reason. **Finding 76.** |
| **Dead `guildId`** | `const guildId = process.env.guildid` is assigned and never read. Only global registration exists, so **command changes take up to an hour to propagate** — guild-scoped instant registration was intended but never wired. |
| **No validation** | `command.data.name` is dereferenced with no guard; one malformed file crashes the entire boot with an opaque error. |
| **Dead alias branch** | `if (command.name) { … command.aliases … }` — **no slash command declares a top-level `name`**, so this branch never runs, and both branches do the same thing anyway. |
| **Implicit global** | `for (folder of commandFolders)` — no `const`. |
| **Module-scope mutable state** | `const table = new ascii()` at module level accumulates rows across reloads. |
| **Redundant REST client** | Builds a fresh `REST` with `process.env.token`, ignoring the token already validated in `index.js`. |
| **Unreachable error handling** | An `async` IIFE inside an already-`async` function wraps `await … .catch(...)`. The `.catch` swallows the rejection, so the outer `try/catch` is unreachable — **and the success log fires even when the PUT failed.** |
| **Undeclared deps** | Requires `@discordjs/rest` and `discord-api-types/v10`, neither of which is in `package.json`. Both are re-exported by `discord.js`. **Finding 13.** |

---

## `handleEvents.js` — 17 lines

Attaches `client.handleEvents(eventFolders, path)`. The entire loader:

```js
const event = require(`../events/${folder}/${file}`);
if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
else            client.on(event.name,   (...args) => event.execute(...args, client));
```

| Issue | Detail |
|---|---|
| **`client` is appended last** | This is the root cause of the arity confusion across the event layer, and of the three files whose signatures are so wrong they never execute. **Findings 1, 2.** |
| **No validation whatsoever** | Nothing checks that `name` or `execute` exist. `handleLogsEvent.js` exports `{ handleLogs }`, so the loader registers **`client.on(undefined, …)`** — a permanently dead listener. |
| **No error handling** | A single malformed event file kills boot, with no indication which file. |
| **No dedup, no routing table** | Every file becomes a raw `client.on`, producing 27 concurrent `interactionCreate` listeners. **Finding 42.** |
| **Inconsistent with siblings** | No ascii table, no logging — unlike `handleCommands` and `handlePrefix`. |
| **Implicit global** | `for (folder of eventFolders)`. |

---

## `handlePrefix.js` — 44 lines

Attaches `client.prefixCommands(eventFile, path)`.

**Flow:** read each folder → `require` each file → `client.pcommands.set(command.name, command)` →
`client.aliases.set(alias, command.name)` for each alias. Files without a `name` are skipped with a `❌` row.

| Issue | Detail |
|---|---|
| **Both parameters are misleading** | The first is named `eventFile` but is a folder list; the second, `path`, is **never used** — the function hardcodes `'./src/prefix/'`. |
| **Inconsistent status vocabulary** | Failures render `❌` while `handleCommands` renders `"Loaded"` for both success *and* failure. |
| **Pointless async IIFE** | Wraps a single `client.logs.success(...)` in a `try/catch` that cannot throw. |
| **Aliases share one Collection** | `client.aliases` is flat and shared, so a prefix alias could in principle shadow across categories — which is exactly how `stop`'s `leave` alias is lost. **Finding 6.** |
| **Broken indentation** | The loop body is under-indented relative to its opening. |

---

## `handleTriggers.js` — 11 lines

Attaches `client.handleTriggers(triggerFiles, path)`. Same `once`/`on` contract as `handleEvents`.

`path` is unused (hardcodes `../triggers/`). No error handling, no logging, no file-count report.
No trailing newline.

---

## `processHandlers.js` — 49 lines

**The most structurally broken file in the codebase.**

Registers six process listeners. Signature is `(db) => {…}` — a parameter named `db`, never used, and actually
passed `client` (or `undefined`, on the first of its two invocations).

| Issue | Detail |
|---|---|
| **Circular require resolving to `{}`** | `const client = require('../index')`. Because `index.js` never assigns `module.exports`, this is an **empty object**. The file then sets `client.logs` on that orphan and logs through it. It works entirely by accident and **cannot survive the TS rewrite.** **Finding 39.** |
| **Registered twice** | Invoked directly by `index.js` *and* by the `for (file of functions)` loop. Every handler binds twice, doubling all crash logging. **Finding 38.** |
| **`'uncaughtReferenceError'` is not a real Node event** | Dead listener. |
| **`uncaughtException` / `unhandledRejection` log but never exit** | The process continues in an undefined state. **Finding 43.** |
| **Hoisting dependency** | `error()` and `warn()` are declared *after* `module.exports` and hoisted into it, so the exported closure depends on module state initialised below it. |
| **Logs at require time** | `client.logs.success('[PROCESS] Process handlers loaded.')` fires before any handler is attached — and fires twice. |

---

## Rewrite target

The five files collapse into three core modules:

```ts
// src/core/loader.ts — replaces handleCommands + handleEvents + handlePrefix + handleTriggers
export async function loadModules<T>(pattern: string, validate: (m: unknown, p: string) => T): Promise<T[]>
```

Resolving from `__dirname` rather than `process.cwd()` — this is what makes `dist/` work — and
**validating every module**, which is what turns today's opaque boot crashes into named errors.

```ts
// src/core/registry.ts — typed collections + REST registration, with guild-scoped dev registration restored
// src/core/shutdown.ts — replaces processHandlers: registered ONCE, no circular import,
//                        clears the timer registry, closes the DB, destroys the gateway, then exits
```

Concrete wins: the `dist/` blocker disappears, malformed modules fail with a filename, the dead alias branch
and dead `guildId` go away, `client.on(undefined)` becomes impossible, process handlers bind once, and
guild-scoped registration can finally be used in development so command changes are instant.
