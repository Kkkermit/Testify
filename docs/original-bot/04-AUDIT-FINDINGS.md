# 04 — Audit Findings

Every defect, smell and dead-code finding, severity-ranked. Each entry names the file so it can be acted on
directly. **Severity reflects user-visible impact, not effort.**

Legend: 🔴 broken today · 🟠 latent/exploitable · 🟡 correctness risk · 🔵 structural/maintainability

---

## S1 — Features that are silently dead

These are features users and the README believe exist, which never execute.

| # | Finding | File |
|---|---|---|
| 🔴 1 | **Welcome cards never render.** `execute(member, message)` — the loader passes `(member, client)`, so `message` is the Client and the guard `if (!message.guild \|\| message.author.bot) return` always fires. The entire canvas welcome-card feature is unreachable. It also calls `canvas.context`, which does not exist (should be `context`). | `src/events/CommandEvents/guildMemberAddEvent.js` |
| 🔴 2 | **Default guild prefixes are never seeded.** Same defect: `execute(guild, message)` against a `GuildCreate` payload. This event has never run once. | `src/events/CommandEvents/createDefaultPrefixEvent.js` |
| 🔴 3 | **Four logging features are disabled for anyone who used the setup script.** `setupEnvFile.js` writes `webhookslashlogging=` etc. all-lowercase; the code reads `process.env.webhookSlashLogging` camelCase. On Linux/macOS these never meet, so slash logging, prefix logging, bug reports and suggestions silently do nothing. | `src/scripts/setupEnvFile.js` |
| 🔴 4 | **`/ai` is registered but hard-blocked.** `underDevelopment: true` means all 244 lines are unreachable at runtime, while the command still appears in Discord's picker. | `src/commands/AiCommands/aiCommands.js` |
| 🔴 5 | **The music VC pre-check never fires in guilds with a custom prefix.** It parses using the global `config.prefix` instead of the resolved guild prefix. It also contains `try { } catch { … ${error} }` — an empty `try` and an unbound `error`. | `src/events/CommandEvents/musicPrefixHandleEvent.js` |
| 🔴 6 | **`stop`'s `leave` alias is permanently shadowed** by `leave.js`'s own `name`, because the dispatcher checks `pcommands` before `aliases`. | `src/prefix/Music/stop.js` |
| 🟠 7 | **`/help` advertises `/suggestion`, which does not exist** (the real command is `/suggest`). The prefix dispatcher's unknown-command message points at `/help-manual`, which also does not exist. | `src/commands/Help/help.js`, `src/events/SlashAndPrefixCreateEvents/messageCreate.js` |

---

## S2 — Live crashes and exploitable bugs

| # | Finding | File |
|---|---|---|
| 🔴 8 | **`permissions: [PermissionsBitField.Administrator]` — that property does not exist**, so the array is `[undefined]`. The permission gate then calls `.has(undefined)` and `.replace()` on an `undefined` name, throwing. `/guild-list` crashes for anyone who triggers the gate. | `src/commands/Owner/guildList.js` |
| 🔴 9 | **`permissions: [PermissionFlagsBits.createWebhook]` — wrong casing** (the real flag is `ManageWebhooks`). Same `undefined` crash path. | `src/commands/Community/impersonate.js` |
| 🔴 10 | **Triggers crash on every DM.** `message.guild.id` is dereferenced with only a `message.author.bot` guard, so any DM containing a bot mention or the word "testify" throws `TypeError: Cannot read properties of null`. | `src/triggers/mentionBot.js`, `src/triggers/sendBotName.js` |
| 🔴 11 | **AI channel replies throw on moderated content.** `const chatResponse` is declared, then reassigned when the model returns `@here`/`@everyone` → `TypeError: Assignment to constant variable`. | `src/events/CommandEvents/aiChannelEvent.js` |
| 🔴 12 | **`spotify-tracks` is claimed by two handlers.** One matches exactly, the other via `startsWith('spotify-')`. The second destructures `userId = undefined`, `users.fetch(undefined)` rejects, and its catch calls `interaction.reply` after the first already called `update` → `InteractionAlreadyReplied`. | `src/events/CommandEvents/spotifyTrackerEvent.js` + `spotifyButtonEvent.js` |
| 🔴 13 | **`node-fetch` is required but not declared** in `package.json`, and v3 is ESM-only — a `require` of v3 throws `ERR_REQUIRE_ESM` at load time, which in `dbdRerollEvent.js` would take down the entire event loader. 6 call sites. | `src/events/CommandEvents/dbdRerollEvent.js` + 5 others |
| 🟠 14 | **Money duplication via lost updates.** Every balance mutation is read-modify-`save()` with no atomic `$inc`. Two interleaved `/gamble` or `/heist` calls credit both payouts against the same starting balance. Exploitable, not theoretical. | all of `src/commands/Economy/`, `src/jobs/lotteryDrawJob.js` |
| 🟠 15 | **Lottery double-payout.** `setInterval(checkLotteries, 60000)` has no overlap guard, so a draw taking >60 s runs concurrently with the next tick. The draw also calls `lottery.save()` twice. | `src/index.js`, `src/jobs/lotteryDrawJob.js` |
| 🟠 16 | **Shell injection in the commit helper.** The user-typed commit message is interpolated straight into an `exec()` shell string, so a `"` or `$(…)` executes. | `src/scripts/commitRunner.js` |
| 🟠 17 | **OAuth `state` is unvalidated.** The Spotify callback takes `req.query.state` as the Discord user ID with no signature or nonce, so anyone can bind their Spotify account to an arbitrary Discord ID — or overwrite someone else's. It also writes the token to Mongo even when the exchange returned no token. | `src/server/server.js` |
| 🟠 18 | **Third-party OAuth tokens stored in plaintext.** Spotify access/refresh tokens and Riot access/entitlement tokens are written unencrypted. | `src/schemas/spotifyTrackerSystem.js`, `valorantUserSystem.js` |
| 🟡 19 | **Async prefix-command errors escape the catch entirely.** `command.execute(message, client, args)` is **not awaited** inside its `try`, and every prefix command is `async`. Failures surface as unhandled rejections, and prefix errors are never reported to the error channel (the slash path is). | `src/events/SlashAndPrefixCreateEvents/messageCreate.js` |
| 🟡 20 | **Fall-through on unknown prefix command.** The `return` for "command does not exist" sits *inside* the `try`; if `message.reply` throws, execution continues to the dispatch line with `command === undefined`. | `src/events/SlashAndPrefixCreateEvents/messageCreate.js` |
| 🟡 21 | **Uppercase prefixes never match.** The content is lowercased but compared against the raw prefix. | `src/events/SlashAndPrefixCreateEvents/messageCreate.js` |
| 🟡 22 | **DM-usable commands that declare `permissions` crash.** `interaction.member` is `null` in DMs and the gate dereferences it. | `src/events/SlashAndPrefixCreateEvents/interactionCreate.js` |
| 🟡 23 | **`.delete()` on an `InteractionCallbackResponse`.** `reply({ withResponse: true })` no longer returns a Message in dj.s 14.17, so the auto-delete timer throws unhandled. | `src/events/SlashAndPrefixCreateEvents/interactionCreate.js` |
| 🟡 24 | **`withResponse: true` passed to `message.reply()`** — not a valid `MessageReplyOptions` key. | `src/events/SlashAndPrefixCreateEvents/messageCreate.js` |
| 🟡 25 | **Levelling double-credits XP** — adds `give * multiplier` and then `give` again. No per-user cooldown either, so XP is trivially farmable. | `src/events/CommandEvents/levellingEvent.js` |
| 🟡 26 | **`.catch(err)` where `err` is `undefined`** — i.e. no handler at all — on channel renames that hit Discord's 2-per-10-minutes rate limit. | all 4 files in `src/events/VcMemberAndBotCountEvents/` |
| 🟡 27 | **Substring owner check.** `config.developers` is a single string and `/eval` tests it with `.includes()`, which performs substring matching. Other call sites use `!==`. | `src/commands/Owner/eval.js` |
| 🟡 28 | **Broken version check.** `if (currentVersion < latestVersion)` is a lexicographic string comparison, so `"v1.9.0" < "v1.10.0"` is **false**. | `src/lib/version.js` |
| 🟡 29 | **`.has()` given a function** instead of a permission bit — always takes the falsy path. | `src/events/TicketEvents/ticketAction.js` |
| 🟡 30 | **Bitwise `&` used where `&&` was meant**, 5 occurrences. | `src/events/TicketEvents/ticketAction.js` |
| 🟡 31 | **`if (data.Roles.length < 0) return;`** — never true. | `src/events/CommandEvents/autoRoleEvent.js` |
| 🟡 32 | **`await data.forEach(async …)`** — `forEach` is not awaitable; the writes race. | `src/events/CommandEvents/stickyMessageEvent.js` |
| 🟡 33 | **Counting game has no race protection** — concurrent messages double-increment. | `src/events/CommandEvents/countingEvent.js` |
| 🟡 34 | **Broken template literal** — single-quoted, so it prints literal backticks and `${query}` instead of interpolating. | `src/client/distubeClientEvent.js` |
| 🟡 35 | **Ticket IDs are random 5-digit ints with no uniqueness check.** | `src/events/TicketEvents/ticketResponse.js` |

---

## S3 — The two data-integrity findings

| # | Finding |
|---|---|
| 🔴 36 | **Two Mongoose models over the same collection.** `economySchema.js` (`model('Economy')`, 27 fields) and `economySystem.js` (`model('economy')`, 10 fields) both pluralise to **`economies`**. `src/commands/LevelAndEconomy/{give,leaderboard,reset}.js` use the legacy model; all 19 `src/commands/Economy/*` files use the modern one. **Writing through the legacy model can strip the 17 fields it does not declare** — inventory, pets, houses, businesses, streaks. Fix this *before* the rewrite. |
| 🟠 37 | **Almost nothing is indexed.** One index exists across 32 schemas. `economySchema` is queried by `{ Guild, User }` from ~43 sites with no compound index — a collection scan per economy command. |

---

## S4 — Boot, process and lifecycle

| # | Finding | File |
|---|---|---|
| 🔴 38 | **Process handlers are registered twice.** `processHandlers` is invoked directly *and* again by the `for (file of functions)` loop over `src/functions/`, so every `SIGINT`/`uncaughtException`/`SIGTERM` handler is attached twice. | `src/index.js` |
| 🔴 39 | **Circular require resolving to `{}`.** `processHandlers.js` does `require('../index')`, but `index.js` never assigns `module.exports`, so it gets an empty object and then attaches `logs` to that orphan. It "works" entirely by accident and **cannot survive a TS rewrite**. | `src/functions/processHandlers.js` |
| 🔴 40 | **`npm install` runs synchronously on every boot.** `updateYTDLPackages()` shells out to `npm install @distube/ytdl-core@latest --save`, blocking startup and mutating `package.json`/`package-lock.json` at runtime — directly contradicting `.npmrc`'s `save-exact=true` and any reproducible deploy. It is *also* triggered from the DisTube `error` handler, so a bad token can start an npm install. | `src/index.js`, `src/scripts/ytdlUpdater.js`, `src/client/distubeClientEvent.js` |
| 🟠 41 | **Only 2 of 7 `ClientReady` handlers are `once`.** The other five re-run on every gateway re-identify, **stacking duplicate `setInterval`s** — including a 7.5-second presence rotation, a 1-hour full-collection economy scan, a 5-minute stats edit and a 15-minute Instagram poll. This is the highest-priority correctness issue in the events layer. | `src/events/ReadyEvents/*` |
| 🟠 42 | **27 concurrent `interactionCreate` listeners** against `setMaxListeners(20)` → `MaxListenersExceededWarning` on every boot. There is no router; every handler independently type-guards and string-matches. `messageCreate` has 10. | `src/functions/handleEvents.js` |
| 🟠 43 | **`uncaughtException` and `unhandledRejection` log but never exit**, leaving the process in an undefined state. One handler is registered for `'uncaughtReferenceError'`, **which is not a real Node event**. | `src/functions/processHandlers.js` |
| 🟠 44 | **No timer is ever cleared.** No handles are stored; there is no graceful shutdown. `checkSoftbans` uses self-rescheduling `setTimeout` recursion, which cannot be cancelled at all. | `src/events/ReadyEvents/*`, `ClientEvents/checkSoftbans.js`, `src/index.js` |
| 🟠 45 | **A leaked, unbounded component collector.** `createMessageComponentCollector()` with no `time`, no `filter`, no `componentType` and no `end` handler — it never expires and any user can drive it. | `src/prefix/InfoCommands/botInfo.js` |
| 🟡 46 | **An upstream API outage prevents login.** `fetchValorantAPI` is awaited before `client.login()`; on a non-200 it logs and continues, then `res.json()` throws. | `src/utils/fetchValorantApi.js`, `src/index.js` |
| 🟡 47 | **`require`-ing the server module boots a listener and an ngrok tunnel** — it self-executes at import, making it untestable and unmockable. | `src/server/server.js` |
| 🟡 48 | **Unbounded log file.** `fs.appendFileSync` on every log line to `logs/console.log`, with no rotation. The logger also monkeypatches both `console.*` and `process.stdout.write`, so **every message is captured twice** and only a second-granularity hash dedupe hides it. | `src/scripts/consoleLogger.js` |

---

## S5 — Performance

| # | Finding |
|---|---|
| 🟠 49 | **Up to 7 uncached DB queries per message, in every guild.** `getMessagePrefix` (2) + `messageCreate` (1) + `mentionBot` (2) + `sendBotName` (2), before levelling, counting, anti-link, sticky and AI-channel handlers add their own. `getMessagePrefix` is *separately* re-called by `prefixCommandLogging.js` and `directMessageLoggerEvent.js`. Nothing is cached. |
| 🟠 50 | **A 7.5-second presence rotation** against the gateway. |
| 🟠 51 | **`.lean()` is used exactly once** in the entire codebase. Every other read hydrates a full Mongoose document with change tracking, even for read-only embed rendering. |
| 🟠 52 | **A 200 KB JSON perk database is parsed at boot and linearly scanned per lookup** — two sequential `Object.entries()` passes, no index or Map. |
| 🟠 53 | **~330 `AttachmentBuilder` objects constructed eagerly at import time**, driven by two `fs.readdirSync` scans. | `src/images/index.js` |
| 🟡 54 | **`new WebhookClient` is constructed per invocation** in both command-logging events. |
| 🟡 55 | **Prefix logging fires for non-existent commands too**, and re-queries the prefix independently of the dispatcher. |

---

## S6 — Duplication (the rewrite's biggest lever)

| # | Finding | Scale |
|---|---|---|
| 🔵 56 | **No embed factory.** 459 `new EmbedBuilder()` calls; the house style (`.setColor(config.embedX)` + `.setAuthor({name: … config.devBy})` + `.setTitle(… config.arrowEmoji)` + `.setTimestamp()` + `.setFooter()`) repeats across ~90 command files. `devBy` appears 112×, `arrowEmoji` 106×. **A single factory would delete roughly 800 lines.** | ~95/103 command files |
| 🔵 57 | **34 filenames duplicated between `src/commands/` and `src/prefix/`**, and **46 of 67 prefix commands duplicate a slash command** — 28 direct 1:1 pairs plus 11 that map to a slash *subcommand*. See `migration/13-DEDUPLICATION-MAP.md`. | 46 pairs |
| 🔵 58 | **The economy account lookup is copy-pasted ~18 times verbatim** (`findOne({Guild, User})` plus an identical "no account yet" guard embed) in `src/commands/Economy/` alone; ~43 sites codebase-wide. | 43 sites |
| 🔵 59 | **The blacklist gate and the permission gate are character-for-character duplicates** between the slash and prefix dispatchers. | 2×2 blocks |
| 🔵 60 | **The DM check and under-development check are duplicated per surface** (`checkDmUsability`/`checkMessageDmUsability`, `checkUnderDevelopment`/`checkMessageUnderDevelopment`), differing only in `.data.name` vs `.name` and the reply shape. | 4 functions |
| 🔵 61 | **The profanity filter is re-implemented at 13 call sites**, each with its own matching logic and no shared utility. `aiCommands.js` even re-declares its own local copy of `config.filterMessage` 5 times. | 13 sites |
| 🔵 62 | **The two trigger files are ~95% identical**; the four VC-counter events are one function duplicated four times with `1`-suffixed variables; `guildCreate`/`guildDelete` share ~80%; `helpInteractions.js` contains six near-identical embed builders. | — |
| 🔵 63 | **`getTimestamp()` is defined three times** and the ANSI log-prefix string is hand-built at hundreds of call sites. | — |
| 🔵 64 | **`getSlashCommandsByCategory` and `getPrefixCommandsByCategory` are near-duplicates**, as are `formatPerkName`/`formatPerkNameForImage`. The uptime computation appears in 3+ places. | — |

---

## S7 — Deprecated and legacy API

| # | Finding | Count |
|---|---|---|
| 🔵 65 | **`ephemeral: true`** instead of `flags: MessageFlags.Ephemeral` — deprecated in dj.s 14.16+. Concentrated entirely in the economy surface (98 in `src/commands/Economy/`, 60 in `src/events/EconCommandEvents/`). | **158** |
| 🔵 66 | **`MessageFlags.Ephemeral` passed to `message.reply()` / `channel.send()`** — silently ignored; ephemeral is interaction-only. | **63 sites / 32 files** |
| 🔵 67 | **`displayAvatarURL({ dynamic: true })`** — `dynamic` was removed in v14 (use `forceStatic: false`). | ~40 |
| 🔵 68 | **`user.tag`** — discriminator-era API. One file even hardcodes `.setDiscriminator('0000')`. | ~35 files |
| 🔵 69 | **Mongoose callback API**, removed in Mongoose 7. | 4 |
| 🔵 70 | **`keepAlive` / `useNewUrlParser` / `useUnifiedTopology`** — no-ops since v6, removed in v7. | 2 sites |
| 🔵 71 | **`ButtonBuilder().setStyle('1'\|'3'\|'4')`** — raw string style codes instead of the `ButtonStyle` enum. Will not type-check. | 3 |
| 🔵 72 | **Raw numeric Discord enums** — `eventType: 1`, `triggerType: 4`, `presets: [1,2,3]` instead of `AutoModerationRuleEventType.*`. | `src/commands/Automod/automod.js` |
| 🔵 73 | **`fetchReply: true`** (deprecated for `withResponse`) coexisting with `withResponse: true` in the same codebase. | 3 vs 2 |
| 🔵 74 | **`interaction.isCommand()`** — ambiguous vs `isChatInputCommand()`; includes context menus. | 1 |
| 🔵 75 | **Mongoose `DocumentArray.remove()`** — deprecated. | 1 |

---

## S8 — TypeScript hard blockers

Cannot be ported mechanically; each needs a redesign.

| # | Blocker | File |
|---|---|---|
| 76 | **Top-level `return`** — legal in CommonJS, a syntax error under ESM/`tsc`. | `src/index.js`, `src/functions/handleCommands.js` |
| 77 | **Implicit globals in `for…of`** — `for (file of functions)` with no `const`. Fails under `"use strict"`. | `src/index.js`, `handleCommands.js`, `handleEvents.js` |
| 78 | **Dynamic `require()` of directory contents** — 7 sites. `tsc` cannot resolve or type these; bundlers cannot analyse them. | `index.js`, `handleCommands.js`, `handleEvents.js`, `handlePrefix.js`, `handleTriggers.js`, `wipeDatabase.js`, `images/index.js` |
| 79 | **CWD-relative `fs.readdirSync("./src/…")`** — resolves against `process.cwd()`, not the module. **Breaks entirely under a `dist/` build.** `handleCommands` compounds this by *reading* via a CWD-relative path and *requiring* via a `__dirname`-relative one — two schemes for the same files. | `src/index.js`, `handlePrefix.js` |
| 80 | **Circular require resolving to `{}`** (finding 39). | `processHandlers.js` |
| 81 | **Duplicate object key `noPerms`** — declared as both a string and a function. | `src/config.js` |
| 82 | **`case`-scoped `let`/`const` without blocks** — `no-case-declarations`. | `utils/economyUtils/lotteryUtils.js`, `api/valorantApi.js` |
| 83 | **Unreachable `break` after `return`.** | `src/api/valorantApi.js` |
| 84 | **Non-TS assets must be copied to `dist/`** — `src/images/**` (~330 PNGs) and `src/jsons/*.json`; needs `resolveJsonModule` plus a copy step, and `__dirname` changes. | — |
| 85 | **20 ad-hoc `client.*` properties** need declaration merging. | see `02-CONTRACTS.md` |
| 86 | **`data` is a union of 4+ builder return types** because of discord.js v14 fluent-builder narrowing. The single biggest typing headache. | all 103 command files |
| 87 | **6 undeclared dependencies** (finding 13 and `05-DEPENDENCIES.md`). | — |

---

## S9 — Dead code to delete rather than port

| Target | Reason |
|---|---|
| `src/utils/instagramAuthHelper.js` | Zero consumers; a pure passthrough re-export |
| `src/utils/economyUtils/dailyPetIncomeBonus.js` | Zero consumers; also an N+1 write pattern |
| `src/schemas/verifyLeftUsersSystem.js` | Zero consumers repo-wide |
| `src/schemas/economySystem.js` | After migrating its 3 consumers (finding 36) |
| `src/utils/folderLoader.js` | `loadFolder()` loads nothing — it only logs a count, and `if (mongoose.connect)` tests a function reference, so it always reports success |
| `src/__tests__/mocks/emptyMock.js` | No `moduleNameMapper`; nothing references it |
| `src/commands/Other/testCommand.js` | A `/test` debug ping registered globally in production, and `category: "Community"` puts it in `/help` |
| `guildId` const in `handleCommands.js` | Assigned, never read — guild-scoped registration is dead |
| `UserUUIDCache` in `api/valorantApi.js` | Written, never read |
| Empty `if` bodies in `api/instagramApi.js` (2) | Rate limiter computed, branch does nothing |
| `'uncaughtReferenceError'` handler | Not a real Node event |
| The `command.name`/`aliases` branch in `handleCommands.js` | No slash command declares `name` |
| `pet_check_` branch in `shopInteractions.js` | Unreachable behind the `shop_` guard |
| `command.args` check in `messageCreate.js` | 0/67 prefix files declare `args` |
| Empty `guildMemberVoiceStateUpdate` handler in `handleLogsEvent.js` | No-op |
| `hercai`, `puppeteer`, `sharp`, `captcha-canvas`, `yt-search`, `inquirer`, `cors`, `uninstall`, `fs`, `os`, `ytdl-core` | Declared, never imported — see `05-DEPENDENCIES.md` |

---

## S10 — Hygiene and consistency

| # | Finding |
|---|---|
| 🔵 88 | **`node_modules` is monkey-patched.** `setupLogs.js` overwrites `node_modules/discord-logs/lib/index.js` with a hardcoded string, and the README documents doing it by hand. Destroyed by every install — including the one that runs at every boot (finding 40). The embedded copy also preserves an upstream bug: `intents.has(Flags.GuildMessages && Flags.MessageContent)` uses `&&` on bitfields. |
| 🔵 89 | **Three `.env` loaders**, one of which points three levels above the repo root. The example file is named `.development.example.env` but the loader expects `.env.development`. |
| 🔵 90 | **Four parallel logging systems** with no unified interface, and `client.logs.error(msg, err)` **silently discards the error object** — `write()` accepts only one message argument. `error()` also never emits a colour reset, so terminal colour bleeds after every error. |
| 🔵 91 | **Three Node version answers**: `.nvmrc` 21.7.1, CI Node 18, README 18.13.0+. No `engines` field. |
| 🔵 92 | **Three quote styles** for the same import (`'discord.js'` 74×, `"discord.js"` 25×, backticks 4×). Prettier is configured but nothing runs it — **no lint step exists in CI**. |
| 🔵 93 | **171 of 321 files have no trailing newline**; indentation mixes tabs, 2-space and 4-space, sometimes within one file. |
| 🔵 94 | **Zero JSDoc and essentially zero comments** — only 98 comment lines across 32,784, and only 4 in all 103 command files. |
| 🔵 95 | **Test coverage is 8 command files out of ~170**, with zero tests for `functions/`, `utils/`, `lib/`, `api/`, `schemas/`, `events/`, `client/`, `jobs/`, `server/` — and `coveragePathIgnorePatterns` excludes most of them, so the reported number never looks bad. The test env stubs `clientId` while the code reads `clientid`, and `testUtils.js`'s fake timers conflict with `setup.js`'s `Date.now` mock. |
| 🔵 96 | **Hardcoded IDs for one private guild** — developer ID, 5 logging channel IDs, ~30 custom emoji, and a `client_id` baked into the invite URL. Self-hosters silently log into the original author's server. |
| 🔵 97 | **Leftover branding and copy-paste errors**: a `"Orbit"` footer, a `[GUILD_CREATE]` tag on the guild-*delete* logger, a hardcoded executor ID/tag in the anti-link event, `"Staff"` and `"Partner"` badges both labelled `partner`, and the GitHub repo owner spelled `Kkkermit` against the author name `Kkermit`. |
| 🔵 98 | **Placeholder URLs shipped in production** — `https://example.com/default-banner.jpg` (2×) — plus hotlinked freepik/postimg personal uploads, an **expired session-bound lofi stream URL with a baked-in timestamp and UUID**, and a hardcoded EU-only Valorant region endpoint. |
| 🔵 99 | **Folder names do not describe contents.** `ReadyEvents/directMessageLoggerEvent.js` is a `MessageCreate` handler; all four `VcMemberAndBotCountEvents/*` are `GuildMemberAdd/Remove` handlers; `CommandEvents/` is a catch-all spanning 8 different event types. |
| 🔵 100 | **Fragile state recovery.** Pagination state is reconstructed by regex-parsing an embed footer, and in one case by fetching 10 surrounding channel messages and parsing a ```` ```json ```` blob out of a bot message. |

---

## Recommended order of attack

**Before writing any TypeScript** — these are data and correctness issues that a rewrite would otherwise
faithfully reproduce:

1. Finding **36** — the duplicate economy model. Migrate the 3 consumers, verify no documents were truncated.
2. Findings **1, 2, 3** — the silently dead features. Decide fix-or-delete; they change scope.
3. Findings **8, 9, 10, 11, 12, 13** — the live crashes.
4. Finding **40** — stop running `npm install` at boot.

**During the rewrite** — structural, and best done once rather than twice:

5. Finding **56** — the embed factory (biggest single line reduction).
6. Findings **57, 58** — the shared-core deduplication (see `migration/13-DEDUPLICATION-MAP.md`).
7. Findings **42, 7 (custom IDs)** — the component router and ID codec.
8. Findings **76–87** — the TypeScript blockers, in loader-first order.
9. Findings **14, 15** — atomic writes and the draw-overlap guard.
10. Findings **41, 44** — `once` semantics and a timer registry with graceful shutdown.
