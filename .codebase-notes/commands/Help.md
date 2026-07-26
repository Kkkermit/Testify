# commands/Help

**1 files · 110 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`help.js`](#helpjs) | 110 | `/help` | `Info` ⚠️ | ✗ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `prefixSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 0 |

## Files

### `help.js`

`src/commands/Help/help.js` · **110 lines**

`/help` — subcommands `server` and `manual`.

Writes the **global** `client.helpData`, consumed by the 661-line `helpInteractions.js`.

| | |
|---|---|
| **Registers** | `/help` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `prefixSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/prefixSystem.js`, `../../utils/helpCommandUtils.js` |
| **External URLs** | `https://discord.gg/xcMVwAVjSD`<br>`https://i.postimg.cc/8CbGp6D5/Screenshot-300.png` |

**Issues**

- **`client.helpData` is a single global slot — concurrent users overwrite each other**
- Hardcodes the support invite twice despite `config.botServerInvite` existing
- Advertises the non-existent `/suggestion`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- commented-out lines ×1

---
