# commands/Counting

**1 files · 63 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`countingSetup.js`](#countingsetupjs) | 63 | `/counting` | `Fun` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `countingSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 0 |

## Files

### `countingSetup.js`

`src/commands/Counting/countingSetup.js` · **63 lines**

`/counting` — subcommands `setup` and `disable`.

| | |
|---|---|
| **Registers** | `/counting` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `countingSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/countingSystem` |

**Issues**

- `category: "Fun"` while the folder is `Counting`
- Unused `PermissionsBitField` import
- The paired `countingEvent.js` has no race protection
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---
