# prefix/LightModeration

**5 files · 355 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`clear.js`](#clearjs) | 144 | `clear` | `Moderation` ⚠️ | ✗ | ✅ |
| [`slowMode.js`](#slowmodejs) | 105 | `slowmode` | `Moderation` ⚠️ | ✗ | ✅ |
| [`addRole.js`](#addrolejs) | 39 | `addrole` | `Moderation` ⚠️ | ✗ | ✅ |
| [`removeRole.js`](#removerolejs) | 34 | `removerole` | `Moderation` ⚠️ | ✗ | ✅ |
| [`changeNickname.js`](#changenicknamejs) | 33 | `nick` | `Moderation` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 7 |
| `catch` blocks | 14 |

## Files

### `clear.js`

`src/prefix/LightModeration/clear.js` · **144 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `clear` |
| **Aliases** | `purge,delete` |
| **Binds to** | `clear` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×4 — should route through the logger

---

### `slowMode.js`

`src/prefix/LightModeration/slowMode.js` · **105 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `slowmode` |
| **Aliases** | `slow,sm` |
| **Binds to** | `slowmode` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `addRole.js`

`src/prefix/LightModeration/addRole.js` · **39 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `addrole` |
| **Binds to** | `addrole` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `removeRole.js`

`src/prefix/LightModeration/removeRole.js` · **34 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `removerole` |
| **Aliases** | `rrole` |
| **Binds to** | `removerole` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `changeNickname.js`

`src/prefix/LightModeration/changeNickname.js` · **33 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `nick` |
| **Binds to** | `nick` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `permissions` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
