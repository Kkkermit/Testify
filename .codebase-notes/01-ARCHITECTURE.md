# 01 — Architecture

How Testify is wired today: boot sequence, dispatch paths, and the runtime shape of the client.

---

## 1. Layer map

```
src/
├── index.js            Entry point. Creates the Client, attaches ~20 ad-hoc properties,
│                       loads everything via fs.readdirSync + dynamic require, then logs in.
├── config.js           One flat 110-key object → client.config (~976 reads)
│
├── functions/          The loader layer. Each file attaches a method to `client`.
│                       handleCommands · handleEvents · handlePrefix · handleTriggers · processHandlers
├── client/             Third-party client wiring: DisTube, discord-giveaways, discord-logs
│
├── commands/           103 slash commands, 24 category folders  → client.commands
├── prefix/             67 prefix commands, 11 category folders  → client.pcommands + client.aliases
├── events/             55 event modules, 13 folders             → raw client.on / client.once
├── triggers/           2 message-scanning modules               → same contract as events
│
├── schemas/            32 Mongoose models. No connection module, no repository layer.
├── api/                3 external API clients: Instagram, Spotify, Valorant
├── utils/ + lib/       Helpers: logging, embeds, time, permissions, economy data
├── jobs/               The lottery draw job (driven by setInterval from index.js)
├── server/             Express + ngrok, for the Spotify OAuth callback. Self-starts on import.
├── scripts/            10 CLI/maintenance scripts
├── jsons/ + images/    Static data (200 KB perk DB, profanity list) and ~330 PNG assets
└── __tests__/          12 files — 8 command tests out of ~170 commands
```

---

## 2. Boot sequence

`src/index.js`, in execution order:

| Step | What happens | Note |
|---|---|---|
| 1 | Requires `discord.js`, `config`, `ytdlUpdater`, `intents`, `loggingEffects`, `setupLoggers` | |
| 2 | `botStartTime = Date.now()` | |
| 3 | **`updateYTDLPackages()` — runs `npm install` synchronously** | ⚠️ Blocks boot for seconds-to-minutes and mutates `package.json` at runtime |
| 4 | `bootMode()` loads `.env` or `.env.development` | |
| 5 | `require('dotenv').config()` | ⚠️ Redundant second load |
| 6 | `setupLoggers()` — called with no argument, though its signature takes `client` | |
| 7 | `new Client({ intents, partials })` inside a try/catch | ⚠️ On failure `client` stays `undefined` and the next line throws anyway |
| 8 | `setMaxListeners(config.eventListeners \|\| 20)` | ⚠️ 27 listeners will bind to `interactionCreate` alone |
| 9 | `client.logs`, `client.config` attached | |
| 10 | DisTube / giveaways / audit-logs clients required | |
| 11 | **`processHandlers()` called with `undefined`** | ⚠️ Will be called *again* by step 15 — every process handler binds twice |
| 12 | `require('./server/server.js')` — no call | ⚠️ Self-starts Express + an ngrok tunnel on import |
| 13 | `client.commands` / `pcommands` / `aliases` = `new Collection()` | |
| 14 | **Five `fs.readdirSync("./src/…")` calls** | ⚠️ CWD-relative — breaks under any `dist/` build |
| 15 | `if (!token) return;` | ⚠️ Top-level `return` — a syntax error under ESM/`tsc` |
| 16 | `distubeClient(client)`, `giveawayClient(client)`, `auditLogsClient(client)` | |
| 17 | async IIFE: `for (file of functions)` → dynamic `require` each | ⚠️ `file` is an implicit global |
| 18 | `handleEvents` → `handleTriggers` → `handleCommands` → `prefixCommands` | |
| 19 | `setInterval(checkLotteries, 60000)` | ⚠️ No overlap guard |
| 20 | `await fetchValorantAPI(client)` | ⚠️ An upstream API outage here prevents login entirely |
| 21 | `client.login(token)` → `handleLogs(client)` + `checkVersion()` | |

Six of these steps are structural blockers for the TypeScript migration. See `04-AUDIT-FINDINGS.md` §S8.

---

## 3. Command registration

`src/functions/handleCommands.js`:

```
for each folder in src/commands/
  for each .js file
    command = require(...)
    client.commands.set(command.data.name, command)   ← no guard; a file missing .data crashes boot
    client.commandArray.push(command.data.toJSON())

REST.put(Routes.applicationCommands(clientId), { body: client.commandArray })
```

Registration is **global only**. `process.env.guildid` is read into a variable that is never used, so
guild-scoped (instant) registration does not exist — every command change takes up to an hour to propagate.

The loader reads files via a **CWD-relative** path but `require`s them via a **`__dirname`-relative** path —
two independent path schemes for the same files.

---

## 4. Dispatch: slash command

```
Gateway INTERACTION_CREATE
  └─ Client emits 'interactionCreate'
      └─ Node EventEmitter fans out to ALL 27 listeners CONCURRENTLY
         (no router — each handler type-guards and string-matches, then returns early)
```

The canonical path, `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`:

| Step | Action |
|---|---|
| 1 | **Autocomplete branch** → `command.autocomplete(interaction, client)`, return |
| 2 | `if (!interaction.isCommand()) return` — **all buttons/selects/modals exit here**, which is why 26 other listeners exist |
| 3 | **Blacklist gate** — `blacklistSchema.findOne({ userId })`, a DB round-trip on *every* command |
| 4 | `client.commands.get(interaction.commandName)` |
| 5 | `checkDmUsability(command, interaction)` → reads `command.usableInDms` |
| 6 | `checkUnderDevelopment(command, interaction)` → reads `command.underDevelopment` |
| 7 | **Permission gate** — filters `command.permissions`, reverse-maps bits to names, replies `config.noPerms(missing)` |
| 8 | **`await command.execute(interaction, client)`** |
| 9 | catch → `logCommandError()` posts a triage embed with recolour buttons, then replies with an error embed |

## 5. Dispatch: prefix command

`src/events/SlashAndPrefixCreateEvents/messageCreate.js`:

| Step | Action |
|---|---|
| 1 | Drop bot / system / webhook messages |
| 2 | `getMessagePrefix(message, client)` — **2 DB queries** (`prefixEnableSystem`, then `prefixSystem`) |
| 3 | If the guild has no enabled prefix system → reply and auto-delete |
| 4 | `if (!content.toLowerCase().startsWith(prefix)) return` — ⚠️ lowercases content but not the prefix |
| 5 | Blacklist gate — a character-for-character duplicate of the slash path |
| 6 | `args = content.slice(prefix.length).trim().split(/ +/)`; `cmd = args.shift().toLowerCase()` |
| 7 | `client.pcommands.get(cmd)` → fallback `client.pcommands.get(client.aliases.get(cmd))` |
| 8 | Unknown → error embed. ⚠️ The `return` is *inside* the `try`, so a failed reply falls through |
| 9 | DM check, under-development check, `command.args` check (⚠️ dead — no file declares `args`) |
| 10 | Permission gate — again a verbatim duplicate |
| 11 | **`command.execute(message, client, args)`** — ⚠️ **not awaited**, so async errors escape the catch |

---

## 6. Event binding

`src/functions/handleEvents.js` is the whole loader:

```js
if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
else            client.on(event.name,   (...args) => event.execute(...args, client));
```

No validation of `name` or `execute`. No dedup. No routing table.

**Binding tally — 54 real listeners plus 1 bogus:**

| Event | Listeners |
|---|---|
| `interactionCreate` | **27** |
| `messageCreate` | **10** |
| `ClientReady` / `ready` | 7 (only 2 are `once`) |
| `guildMemberAdd` | 4 |
| `guildMemberRemove` | 3 |
| `guildCreate` | 2 |
| `guildDelete` | 1 |
| `undefined` | 1 — `handleLogsEvent.js` exports `{ handleLogs }`, not an event module |

Separately, `handleLogsEvent.js` registers **~36 more `client.on` listeners** for `discord-logs` synthetic
events when `handleLogs(client)` is called after login.

---

## 7. Runtime state

### On the client — 20 ad-hoc properties

Four of these are **single global slots** shared across all guilds and users, which makes them correctness bugs
rather than merely untyped:

- `client.helpData` — two users running `/help` in different guilds overwrite each other's state
- `client.errorMessageInteraction` / `errorEmbedInteraction` / `errorRowInteraction` — concurrent command errors
  overwrite, so the triage button edits the wrong message
- `client.blackjackGames`, `client.activeHeists` — keyed by user ID only, so one game per user **globally**
- `client.modPanels` — created lazily in two places, and `checkSoftbans.js` **unconditionally overwrites it**

Full table in `02-CONTRACTS.md` §6.

### In module scope

`randomMoneyEvent.js` holds two never-evicted `Map`s (one entry per guild, forever, lost on restart);
`inventoryPagination.js` schedules a **new** 5-minute timeout on every button press;
`evalEvent.js` holds arbitrary user code in a `Map` that leaks if the user never clicks.

### Timers — none are ever cleared

| Interval | Source |
|---|---|
| 7.5 s | presence rotation |
| 60 s | lottery check (`index.js`) |
| 60 s | softban check — self-rescheduling `setTimeout`, **cannot be cancelled** |
| 5 min | fixed bot-stats message edit |
| 15 min | Instagram poll |
| 1 h | passive income — a full-collection economy scan |

Because only 2 of 7 `ClientReady` handlers are `once`, **every gateway re-identify stacks another full set of
these intervals.**

---

## 8. Data flow

```
Discord ──► Client ──► event listeners (54)
                          │
                          ├─ interactionCreate ─┬─ slash dispatcher ─► client.commands ─► execute()
                          │                     └─ 26 component handlers (ad-hoc customId matching)
                          │
                          └─ messageCreate ─────┬─ prefix dispatcher ─► client.pcommands ─► execute()
                                                ├─ levelling · counting · anti-link · sticky · AI
                                                ├─ treasure drops · DM logger · prefix logging
                                                └─ 2 triggers (mentionBot, sendBotName)
                                                        │
                        ┌───────────────────────────────┘
                        ▼
              32 Mongoose models  (direct require, inline queries, no repository layer)
                        │
                        ▼
                    MongoDB
```

**The hot path is expensive.** A single message in a single guild triggers up to **7 uncached DB queries**
before any feature logic runs — 2 from `getMessagePrefix`, 1 from the dispatcher, and 2 each from the two
triggers — and `getMessagePrefix` is *separately* re-called by the prefix-logging and DM-logger events.

---

## 9. External integrations

| Integration | Entry point | Notes |
|---|---|---|
| **MongoDB** | `events/ReadyEvents/ready.js` | Mongoose 6 with 3 removed/no-op options; a second independent connect in `scripts/wipeDatabase.js` |
| **Music** | `client/distubeClientEvent.js` | DisTube + Spotify/SoundCloud/yt-dlp plugins; only the prefix layer uses it |
| **Giveaways** | `client/giveawayClientEvent.js` | `discord-giveaways` with a custom Mongo-backed manager |
| **Audit logs** | `client/auditLogsClientEvent.js` | `discord-logs` with `debug: true` hardcoded; **the package source is patched inside `node_modules`** |
| **Valorant** | `api/valorantApi.js`, `utils/fetchValorantApi.js` | Riot OAuth; **EU region hardcoded**; tokens stored in plaintext; awaited before login |
| **Spotify** | `api/spotifyTrackerApi.js`, `server/server.js` | OAuth via Express + ngrok; **`state` unvalidated**; tokens in plaintext; no refresh logic |
| **Instagram** | `api/instagramApi.js` | A 391-line anti-bot scraping layer with cookie rotation and a rate limiter; every failure collapses to `null` |
| **Clash Royale / DBD / TMDB / Reddit / Wikipedia / weather** | individual command files | Untyped `axios`/`fetch` responses throughout |

---

## 10. What the rewrite must change structurally

The current architecture has no seams: loaders resolve paths from the CWD, commands reach directly into
Mongoose models, event handlers own their own routing, and shared state lives on the client object.

The four changes that unlock everything else:

1. **A compiled-safe loader** resolving from the module's own location, with a validated module contract — this
   is the prerequisite for `dist/` working at all.
2. **A component router + custom-ID codec** replacing the 27-listener fan-out and three separator conventions.
3. **A repository layer** between commands and Mongoose, with atomic writes and a guild-settings cache.
4. **A shared command core** that both a slash adapter and a prefix adapter drive, collapsing the 46 duplicated
   command pairs.

Target design in `migration/10-TARGET-ARCHITECTURE.md`.
