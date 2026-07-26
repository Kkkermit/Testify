# prefix/Owner

**1 files · 39 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`flushLogs.js`](#flushlogsjs) | 39 | `flushlogs` | `Owner` | ✅ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 1 |
| `catch` blocks | 1 |

## Files

### `flushLogs.js`

`src/prefix/Owner/flushLogs.js` · **39 lines**

`flushlogs` — flush the log buffer.

| | |
|---|---|
| **Command name** | `flushlogs` |
| **Aliases** | `sendlogs,pushlogs` |
| **Binds to** | `flushlogs` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../scripts/consoleLogger`, `../../utils/loggingEffects` |

**Issues**

- Owner check inlined against `config.developers`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

---
