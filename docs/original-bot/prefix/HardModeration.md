# prefix/HardModeration

**4 files · 191 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`kick.js`](#kickjs) | 57 | `kick` | `Moderation` ⚠️ | ✗ | ✅ |
| [`ban.js`](#banjs) | 53 | `ban` | `Moderation` ⚠️ | ✗ | ✅ |
| [`unban.js`](#unbanjs) | 41 | `unban` | `Moderation` ⚠️ | ✗ | ✅ |
| [`updateGuildsPrefix.js`](#updateguildsprefixjs) | 40 | `change-prefix` | `Moderation` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `prefixSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 8 |
| `catch` blocks | 5 |

## Files

### `kick.js`

`src/prefix/HardModeration/kick.js` · **57 lines**

`kick` — kick a user.

| | |
|---|---|
| **Command name** | `kick` |
| **Aliases** | `boot` |
| **Binds to** | `kick` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |

**Issues**

- **Reads `args[1]` where it should read `args[0]` for an ID lookup**
- `MessageFlags.Ephemeral` on `channel.send()` — silently ignored
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

**Rewrite note.** When merging with the slash twin, take the slash version's argument handling.

---

### `ban.js`

`src/prefix/HardModeration/ban.js` · **53 lines**

`ban` — ban a user.

| | |
|---|---|
| **Command name** | `ban` |
| **Aliases** | `banish` |
| **Binds to** | `ban` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |

**Issues**

- Unused `PermissionsBitField` import
- Meaningless `MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `unban.js`

`src/prefix/HardModeration/unban.js` · **41 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `unban` |
| **Aliases** | `unbanuser` |
| **Binds to** | `unban` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- loose `==` ×2

---

### `updateGuildsPrefix.js`

`src/prefix/HardModeration/updateGuildsPrefix.js` · **40 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `change-prefix` |
| **Aliases** | `uprefix,cprefix` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **Schemas** | `prefixSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/prefixSystem.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
