# commands/Giveaway

**1 files · 151 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`giveaway.js`](#giveawayjs) | 151 | `/giveaway` | `Giveaway` | ✗ | ✅ |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js`, `ms`, `discord-giveaways` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 0 |
| `catch` blocks | 3 |

## Files

### `giveaway.js`

`src/commands/Giveaway/giveaway.js` · **151 lines**

`/giveaway` — subcommands `start`, `edit`, `end`, `reroll`.

| | |
|---|---|
| **Registers** | `/giveaway` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js`, `ms`, `discord-giveaways` |

**Issues**

- Requires **undeclared** `ms`
- Unused `PermissionsBitField` import
- `threshold: 60000000000000` repeated 4× as a 'never' sentinel
- `.then()` ×3 — mixed with async/await

---
