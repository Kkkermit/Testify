# `src/index.js` — Entry Point

**126 lines.** `package.json#main`. Exports **nothing** — which matters, because
`src/functions/processHandlers.js` requires it back and receives `{}`.

Full boot table in [`../01-ARCHITECTURE.md`](../01-ARCHITECTURE.md#2-boot-sequence).

---

## What it does

1. Requires `discord.js`, `fs`, `./config`, `./scripts/ytdlUpdater`, and three utils
2. Records `botStartTime`
3. **Runs `npm install` synchronously** via `updateYTDLPackages()`
4. Loads the environment via `./scripts/bootMode.js`, then again via `dotenv.config()`
5. Calls `setupLoggers()` — with no argument, though its signature takes `client`
6. Constructs the `Client` inside a try/catch
7. Attaches `logs`, `config`, `swatch`, `skins`, `skinsTier`, `commands`, `pcommands`,
   `aliases`, `reloadValoAPI`, `botStartTime`
8. Requires the DisTube, giveaway and audit-log client modules
9. Calls `processHandlers()` with `undefined`
10. Requires `./server/server.js` — which self-starts Express and ngrok
11. Reads five directory listings with `fs.readdirSync("./src/…")`
12. Guards on `process.env.token` with a bare top-level `return`
13. Wires the three third-party clients
14. In an async IIFE: loads functions, events, triggers, commands and prefix commands;
    starts the 60-second lottery interval; awaits the Valorant API; logs in

---

## Line-level notes

| Concern | Detail |
|---|---|
| **`updateYTDLPackages()` at boot** | `execSync('npm install @distube/ytdl-core@latest --save')` with `stdio: 'inherit'`. Blocks startup for seconds to minutes, mutates `package.json` and `package-lock.json` at runtime, and contradicts `.npmrc`'s `save-exact=true`. Also invoked from the DisTube `error` handler, so a bad token can trigger an npm install. **Finding 40.** |
| **Two dotenv loads** | `bootMode()` loads the correct file; `dotenv.config()` then loads the CWD default. A third load lives in `server/server.js`, pointing three levels above the repo root. **Finding 89.** |
| **`setupLoggers()` called with no client** | The signature is `setupLoggers(client)`. Its `client?.config?.logging?.webhookUrl` fallback is doubly dead — `config.logging` does not exist either. |
| **Client construction in try/catch** | On failure `client` remains `undefined`, and the very next line calls `client.setMaxListeners(...)`, so the catch buys nothing. |
| **`setMaxListeners(20)`** | 27 listeners bind to `interactionCreate` alone → `MaxListenersExceededWarning` on every boot. **Finding 42.** |
| **`require('./server/server.js')`** | No call, no semicolon. The module self-executes, binding a port and opening an ngrok tunnel purely as an import side effect. **Finding 47.** |
| **`processHandlers()` then the loop** | `src/functions/` contains 5 files, one of which is `processHandlers.js`. It is therefore invoked directly *and* again by the loop — **every process handler binds twice**. **Finding 38.** |
| **Five `fs.readdirSync("./src/…")`** | CWD-relative. **The single biggest structural blocker for the TS move** — these break entirely under a `dist/` layout. **Finding 79.** |
| **Top-level `return`** | Legal in CommonJS, a **syntax error** under ESM/`tsc`. **Finding 76.** |
| **`for (file of functions)`** | No `const`/`let` — `file` becomes an implicit global. Fails under `"use strict"`. **Finding 77.** |
| **Dynamic template-literal `require`** | `require(\`./functions/${file}\`)` — unresolvable and untypeable by `tsc`. **Finding 78.** |
| **`setInterval(checkLotteries, 60000)`** | No handle stored, never cleared, **no overlap guard** — a draw exceeding 60 s runs concurrently with the next tick and can double-pay. **Finding 15.** |
| **`await fetchValorantAPI(client)` before login** | On a non-200 the helper logs and continues, then `res.json()` throws. **An upstream Valorant API outage therefore prevents the bot from ever logging in.** **Finding 46.** |

---

## Rewrite target

`src/index.ts` becomes thin — build the container, start it, wire shutdown:

```ts
import { createClient } from '@core/client.js';
import { loadEverything } from '@core/loader.js';
import { connectDatabase } from '@db/connection.js';
import { env } from '@config/env.js';
import { registerShutdown } from '@core/shutdown.js';

const client = createClient();
await connectDatabase(env.MONGODB_URI);   // fails fast, before login
await loadEverything(client);             // validated modules, resolved from this file's location
registerShutdown(client);                 // clears every timer, closes the DB, destroys the gateway
await client.login(env.TOKEN);
```

Everything else moves out:

| Current responsibility | Target |
|---|---|
| Client construction + property attachment | `core/client.ts` |
| Directory scanning + dynamic require | `core/loader.ts` |
| Process handlers | `core/shutdown.ts` |
| Env loading | `config/env.ts` |
| Lottery interval | `jobs/` + `core/timers.ts` |
| Valorant preload | lazy, in the integration — **never** blocking login |
| `npm install` at boot | **deleted** |
