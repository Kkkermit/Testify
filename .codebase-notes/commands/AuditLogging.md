# commands/AuditLogging

**1 files · 254 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`auditLogging.js`](#auditloggingjs) | 254 | `/logs` | `Server Utils` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `auditLoggingSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 6 |
| `catch` blocks | 0 |

## Files

### `auditLogging.js`

`src/commands/AuditLogging/auditLogging.js` · **254 lines**

`/logs` — subcommands `setup`, `configure`, `disable`, `status`.

A `log_selection` string-select drives `auditLoggingSystem.EnabledLogs`, consumed by the 752-line `handleLogsEvent.js`.

| | |
|---|---|
| **Registers** | `/logs` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data`, `if` |
| **Schemas** | `auditLoggingSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/auditLoggingSystem` |

**Issues**

- Uses `withResponse: true` while other files still use `fetchReply`
- `new EmbedBuilder()` ×6 — candidate for the shared embed factory

---
