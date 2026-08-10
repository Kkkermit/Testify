# prefix/InfoCommands

**9 files · 595 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`serverInfo.js`](#serverinfojs) | 131 | `server-info` | `Info` ⚠️ | ✗ | — |
| [`botInfo.js`](#botinfojs) | 97 | `bot-info` | `Info` ⚠️ | ✅ | — |
| [`roleInfo.js`](#roleinfojs) | 74 | `roleinfo` | `info` ⚠️ | ✗ | — |
| [`userInfo.js`](#userinfojs) | 71 | `userinfo` | `Info` ⚠️ | ✗ | — |
| [`memberCountGraph.js`](#membercountgraphjs) | 63 | `member-graph` | `Info` ⚠️ | ✗ | — |
| [`avatar.js`](#avatarjs) | 55 | `avatar` | `Info` ⚠️ | ✅ | — |
| [`permissionTracker.js`](#permissiontrackerjs) | 37 | `perms` | `Info` ⚠️ | ✗ | — |
| [`botHardware.js`](#bothardwarejs) | 34 | `bot-specs` | `Info` ⚠️ | ✅ | — |
| [`uptime.js`](#uptimejs) | 33 | `uptime` | `Info` ⚠️ | ✅ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `prefixSystem` |
| npm dependencies | `discord.js`, `discord-arts`, `quickchart-js`, `os` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 15 |
| `catch` blocks | 1 |

## Files

### `serverInfo.js`

`src/prefix/InfoCommands/serverInfo.js` · **131 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `server-info` |
| **Aliases** | `serverinfo,guildinfo,guild,server` |
| **Binds to** | `General` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `botInfo.js`

`src/prefix/InfoCommands/botInfo.js` · **97 lines**

`bot-info` — bot information.

| | |
|---|---|
| **Command name** | `bot-info` |
| **Aliases** | `bi,botinfo` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **Schemas** | `prefixSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/prefixSystem.js` |

**Issues**

- **A leaked component collector: no `time`, no `filter`, no `componentType`, no `end` handler — it never expires and any user can drive it** (finding 45)
- Unnamespaced `refresh` custom ID
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- loose `==` ×1

---

### `roleInfo.js`

`src/prefix/InfoCommands/roleInfo.js` · **74 lines**

`roleinfo` — role information.

| | |
|---|---|
| **Command name** | `roleinfo` |
| **Aliases** | `roles` |
| **Binds to** | `roleinfo` |
| **Export keys** | `name`, `description`, `usage`, `category`, `aliases`, `usableInDms`, `execute`, `administrator`, `manageGuild`, `manageRoles`, `manageChannels`, `manageMessages`, `manageWebhooks`, `manageNicknames`, `manageEmojis`, `kickMembers`, `banMembers`, `mentionEveryone`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- **`category: 'info'` lowercase — breaks help grouping**, which matches on `'Info'`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `userInfo.js`

`src/prefix/InfoCommands/userInfo.js` · **71 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `userinfo` |
| **Aliases** | `users,user` |
| **Binds to** | `userinfo` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js`, `discord-arts` |
| **Internal imports** | `../../lib/discordBadges`, `../../lib/addSuffix` |
| **External URLs** | `https://example.com/default-banner.jpg` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `memberCountGraph.js`

`src/prefix/InfoCommands/memberCountGraph.js` · **63 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `member-graph` |
| **Aliases** | `mg,member-count-graph,membergraph,membercountgraph` |
| **Export keys** | `name`, `aliases`, `description`, `category`, `usage`, `usableInDms` |
| **npm deps** | `discord.js`, `quickchart-js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `avatar.js`

`src/prefix/InfoCommands/avatar.js` · **55 lines**

`avatar` — show a user's avatar.

| | |
|---|---|
| **Command name** | `avatar` |
| **Aliases** | `pfp` |
| **Binds to** | `avatar` |
| **Export keys** | `name`, `description`, `aliases`, `usage`, `category`, `usableInDms`, `execute` |
| **npm deps** | `discord.js` |

**Issues**

- Uses `execute: async function(…)` rather than the shorthand method form used everywhere else
- `new EmbedBuilder()` ×5 — candidate for the shared embed factory
- loose `==` ×1

---

### `permissionTracker.js`

`src/prefix/InfoCommands/permissionTracker.js` · **37 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `perms` |
| **Aliases** | `permissions` |
| **Binds to** | `perms` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `botHardware.js`

`src/prefix/InfoCommands/botHardware.js` · **34 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `bot-specs` |
| **Aliases** | `bs,bot-hardware` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js`, `os` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `uptime.js`

`src/prefix/InfoCommands/uptime.js` · **33 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `uptime` |
| **Aliases** | `botuptime` |
| **Binds to** | `uptime` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
