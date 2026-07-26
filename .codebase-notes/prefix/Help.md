# prefix/Help

**1 files · 143 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`help.js`](#helpjs) | 143 | `help` | `Info` ⚠️ | ✅ | — |

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

`src/prefix/Help/help.js` · **143 lines**

`help` — the prefix help menu.

Writes the **global** `client.helpData` consumed by `helpInteractions.js`.

| | |
|---|---|
| **Command name** | `help` |
| **Binds to** | `help` |
| **Export keys** | `name`, `description`, `category`, `usableInDms` |
| **Schemas** | `prefixSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/prefixSystem.js`, `../../utils/helpCommandUtils.js` |
| **External URLs** | `https://i.postimg.cc/8CbGp6D5/Screenshot-300.png` |

**Issues**

- The only prefix file without a `usage` field
- Shares the global-slot bug with the slash `/help`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---
