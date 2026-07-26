# commands/Other

**1 files · 17 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`testCommand.js`](#testcommandjs) | 17 | `/test` | `Community` ⚠️ | ✅ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 1 |
| `catch` blocks | 0 |

## Files

### `testCommand.js`

`src/commands/Other/testCommand.js` · **17 lines**

`/test` — a 16-line debug ping.

| | |
|---|---|
| **Registers** | `/test` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- **Registered globally in production**, and `category: "Community"` puts it in `/help`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

**Rewrite note.** Delete.

---
