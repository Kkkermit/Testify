# commands/Owner

**5 files · 380 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`guildList.js`](#guildlistjs) | 134 | `/guild-list` | `Owner` | ✗ | ✅ |
| [`blacklist.js`](#blacklistjs) | 88 | `/blacklist` | `Owner` | ✅ | ✅ |
| [`eval.js`](#evaljs) | 65 | `/eval` | `Owner` | ✅ | ✅ |
| [`flushLogs.js`](#flushlogsjs) | 50 | `/flush-logs` | `Owner` | ✅ | ✅ |
| [`directMessage.js`](#directmessagejs) | 43 | `/direct-message` | `Owner` | ✗ | ✅ |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `blacklistSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 7 |
| `catch` blocks | 7 |

## Files

### `guildList.js`

`src/commands/Owner/guildList.js` · **134 lines**

`/guild-list` — paginated list of guilds.

| | |
|---|---|
| **Registers** | `/guild-list` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- **`permissions: [PermissionsBitField.Administrator]` — that property does not exist, so the gate crashes** (finding 8)
- Pagination state recovered by fetching 10 surrounding messages and regex-parsing a JSON blob out of a bot message
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger
- `.then()` ×1 — mixed with async/await

---

### `blacklist.js`

`src/commands/Owner/blacklist.js` · **88 lines**

`/blacklist` — subcommands `add` and `remove`.

Writes `blacklistSystem`, checked by both dispatchers on every invocation.

| | |
|---|---|
| **Registers** | `/blacklist` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `blacklistSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/blacklistSystem` |

**Issues**

- Owner check duplicated inline twice
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `eval.js`

`src/commands/Owner/eval.js` · **65 lines**

`/eval` — modal-driven code evaluation.

The modal is handled by `evalEvent.js`, which scans for token/Mongo leakage and can require a confirmation.

| | |
|---|---|
| **Registers** | `/eval` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- **Uses `.includes()` on `config.developers`, which is a single string — substring matching** (finding 27)
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `flushLogs.js`

`src/commands/Owner/flushLogs.js` · **50 lines**

`/flush-logs` — flush the console-log buffer to the webhook.

| | |
|---|---|
| **Registers** | `/flush-logs` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../scripts/consoleLogger`, `../../utils/loggingEffects` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

---

### `directMessage.js`

`src/commands/Owner/directMessage.js` · **43 lines**

`/direct-message` — DM a user as the bot.

| | |
|---|---|
| **Registers** | `/direct-message` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- Owner check duplicated inline twice
- Inlines a 4000ms auto-delete
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `.then()` ×1 — mixed with async/await

---
