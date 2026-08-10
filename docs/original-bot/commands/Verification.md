# commands/Verification

**1 files · 75 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`verify.js`](#verifyjs) | 75 | `/verify` | `Server Utils` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `verifySystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 1 |
| `catch` blocks | 0 |

## Files

### `verify.js`

`src/commands/Verification/verify.js` · **75 lines**

`/verify` — subcommands `setup` and `disable`.

Emits an unnamespaced `verify` button handled by `verifyUsersEvent.js`.

| | |
|---|---|
| **Registers** | `/verify` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `verifySystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/verifySystem` |

**Issues**

- `category: "Server Utils"`
- Unnamespaced custom IDs (`verify`, `captchaenter`, `vermodal`)
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
