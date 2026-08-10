# `src/utils/` and `src/lib/` — Helpers

**24 files · 1,338 lines.**

---

## `src/utils/` — 20 files, 1,222 lines

| File | Lines | Exports | Notes |
|---|---:|---|---|
| `intents.js` | 35 | `{ intents, partials }` | 19 intents, 7 partials. **`MessageContent` and `GuildWebhooks` are each listed twice** — harmless, but a typed `as const` would catch it. |
| `loggingEffects.js` | 33 | `{ color, getTimestamp, textEffects }` | Required by **44 files** — the most-imported util. `torquise` is a misspelling of "turquoise". **`getTimestamp()` does not zero-pad the month** (`2026-7-26`). |
| `logs.js` | 52 | `{ write, info, warn, error, success, debug, logging, torquise, purple }` | 8 near-identical wrappers over `write()`. **`write(message, prefix, colors)` takes only ONE message argument — every `client.logs.error('msg', err)` call silently discards the error object.** Confirmed at 6+ sites. `error()` also never emits a colour reset, so terminal colour bleeds. |
| `setupLoggers.js` | 23 | default fn | Reads `LOG_WEBHOOK_URL` or `client?.config?.logging?.webhookUrl` — **the second does not exist**, and it is called from `index.js` with no client anyway. |
| `folderLoader.js` | 35 | default fn | **`loadFolder()` loads nothing** — it only logs a count. `if (mongoose.connect)` tests a *function reference*, so it is always truthy and reports "connected successfully" regardless of connection state. Uses callback-style `fs.readdir` inside an async flow. **Pure boot theatre — delete.** |
| `errorLogging.js` | 67 | `{ logCommandError }` | Posts a triage embed with 3 buttons. **`.setStyle('1'\|'3'\|'4')` — raw strings instead of the `ButtonStyle` enum; will not type-check.** Stores state on three **single global client slots**, so concurrent errors overwrite and the button edits the wrong message. **Only the slash dispatcher calls it — prefix errors are never reported.** |
| `timeUtils.js` | 32 | `{ getTimeBetween, getFormattedTime }` | Two overlapping formatters. **Only 5 files use it; ~20 other sites inline the ms maths.** |
| `getMessagePrefix.js` | 22 | `{ getMessagePrefix }` | **Two sequential DB round-trips on every message in every guild, uncached** — and it is independently re-called by `prefixCommandLogging.js` and `directMessageLoggerEvent.js`. **Finding 49.** |
| `helpCommandUtils.js` | 107 | 4 functions | `getSlashCommandsByCategory` / `getPrefixCommandsByCategory` are **near-duplicates**. `createCommandPages(…, prefix)` never uses `prefix`. Uses the magic number `1` for `ApplicationCommandOptionType.Subcommand`. Hardcodes a 19-entry category→emoji map kept in sync by hand, including three categories **no command uses**. |
| `createStatsEmbed.js` | 89 | `{ createStatsEmbed }` | Spotify collage via `@napi-rs/canvas`. Two `switch(type)` blocks with **no `default`**. `items[i].artists[0].name` unguarded. Requires `../config` directly instead of taking `client.config` — inconsistent with every other util. |
| `dbdPerkHelper.js` | 22 | `{ findPerkKeyByName }` | **Two sequential linear scans over a 200 KB JSON per call.** No Map index. |
| `fetchValorantApi.js` | 43 | `{ fetchValorantAPI }` | Requires **undeclared** `node-fetch`. On a non-200 it logs and continues, then `res.json()` throws — and because `index.js` awaits it before login, **an upstream outage prevents the bot logging in**. Hardcodes a third-party personal API domain. Duplicates tier→price UUIDs that `api/valorantApi.js` also hardcodes. Mixed tabs and spaces. |
| `instagramAuthHelper.js` | 10 | 5 bound methods | **DEAD — zero consumers.** A pure passthrough re-export. Delete. |
| `giveaway.js` | 20 | `class GiveawaysManager` | Overrides 4 persistence methods. **`saveGiveaway(messageId, data)` ignores `messageId`.** `{ omitUndefined: true }` is a **Mongoose 5 option removed in v6** — silently ignored. Lives in `utils/` but belongs beside `client/giveawayClientEvent.js`. |
| `commandParams/dmCommandCheck.js` | 28 | `{ checkDmUsability, checkMessageDmUsability }` | A duplicated pair differing only in `.data.name` vs `.name`. **Both replies are un-`await`ed and un-`catch`ed** → unhandled rejections. Contains a redundant `!interaction.guild` re-check. |
| `commandParams/underDevelopmentCheck.js` | 25 | `{ checkUnderDevelopment, checkMessageUnderDevelopment }` | Same duplicated shape, same un-awaited replies. |
| `economyUtils/lotteryUtils.js` | 31 | `{ getNextDrawTime }` | **`const` declared inside a `case` without a block** → `no-case-declarations`. The `daysUntilSunday === 0 ? 7 : …` branch is unreachable. |
| `economyUtils/dailyPetIncomeBonus.js` | 50 | `{ applyPetIncomeBonus }` | **DEAD — zero consumers.** Also an N+1 write pattern (`find()` then `save()` in a loop). Delete. |
| `economyUtils/items/shopItems.js` | 161 | `{ items, houses, businesses, jobs, pets }` | Pure static data, 11 consumers. **Ideal `as const`** → derived union types (`type ItemId = typeof items[number]['id']`). |
| `economyUtils/items/petItems.js` | 318 | rarity tiers + lookups | Static pet catalogue, 10 consumers. Same `as const` treatment. |

---

## `src/lib/` — 4 files, 116 lines

| File | Lines | Exports | Notes |
|---|---:|---|---|
| `addSuffix.js` | 12 | `{ addSuffix }` | Ordinal suffix. Correct. No trailing newline. |
| `asciiText.js` | 56 | 3 banner printers | ~40 `console.log` lines of hardcoded box art. `asciiText(client, …)` reads `client.user.username` and **will throw if called before `ready`**. Zero indentation in one function. |
| `discordBadges.js` | 20 | `{ addBadges }` | Maps 12 `UserFlags` to 12 hardcoded emoji from one guild. **`"Staff"` and `"Partner"` are both labelled `partner`** — a copy-paste bug. Returns the magic sentinel `["X"]` for empty input. |
| `version.js` | 24 | `{ getLatestVersion, checkVersion }` | Hits a hardcoded GitHub repo — note the owner is spelled **`Kkkermit`** against the author name `Kkermit`. **`if (currentVersion < latestVersion)` is a lexicographic string comparison, so `"v1.9.0" < "v1.10.0"` is `false`.** **Finding 28.** Mixes `.then()` and `async/await` in 24 lines. |

---

## Rewrite targets

| Current | Target |
|---|---|
| `logs.js` + `loggingEffects.js` + `setupLoggers.js` + `scripts/consoleLogger.js` | **one** `core/logger.ts` (pino), with structured fields so error objects are no longer discarded |
| `errorLogging.js` | `core/errors.ts` — error classes + one boundary covering **both** surfaces |
| `commandParams/*` (4 functions) | `core/middleware.ts` — one pipeline, one implementation per gate |
| `getMessagePrefix.js` | `database/repositories/guildSettingsRepository.ts` **with a cache** — removes 6 of the 7 per-message queries |
| `timeUtils.js` + `addSuffix.js` + the ~20 inline duration sites | `ui/format.ts` |
| `helpCommandUtils.js` | `features/help/service.ts`, driven by the `Category` enum so the emoji map is exhaustive by construction |
| `economyUtils/items/*` | `features/economy/data/*.ts` as `as const` |
| `dbdPerkHelper.js` | `integrations/dbd/perks.ts`, Map-indexed |
| `fetchValorantApi.js` + `api/valorantApi.js` | `integrations/valorant/`, **lazy** — never blocking login |
| `folderLoader.js`, `instagramAuthHelper.js`, `dailyPetIncomeBonus.js`, `asciiText.js` | **deleted** |
