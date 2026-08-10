# commands/PrefixSettings

**1 files · 185 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`prefixSettings.js`](#prefixsettingsjs) | 185 | `/prefix` | `Prefix Settings` | ✗ | ✅ |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `prefixSystem`, `prefixEnableSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 4 |
| `catch` blocks | 5 |

## Files

### `prefixSettings.js`

`src/commands/PrefixSettings/prefixSettings.js` · **185 lines**

`/prefix` — subcommands `change`, `check`, `reset`, `enable`, `disable`.

Writes both `prefixSystem` and `prefixEnableSystem` — the two schemas `getMessagePrefix` reads on every message.

| | |
|---|---|
| **Registers** | `/prefix` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `prefixSystem`, `prefixEnableSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/prefixSystem.js`, `../../schemas/prefixEnableSystem.js` |

**Issues**

- `new EmbedBuilder()` ×4 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

---
