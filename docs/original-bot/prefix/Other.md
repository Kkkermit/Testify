# prefix/Other

**1 files · 22 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`ping.js`](#pingjs) | 22 | `ping` | `Community` ⚠️ | ✅ | — |

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

### `ping.js`

`src/prefix/Other/ping.js` · **22 lines**

`ping` — bot latency.

| | |
|---|---|
| **Command name** | `ping` |
| **Aliases** | `latency` |
| **Binds to** | `ping` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |

**Issues**

- `category: 'Community'` while the folder is `Other`
- **Prefix-only — no `/ping` exists**
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
