# commands/InfoCommands

**10 files · 756 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`serverInfo.js`](#serverinfojs) | 130 | `/server-info` | `Info` ⚠️ | ✗ | — |
| [`avatar.js`](#avatarjs) | 100 | `/avatar` | `Info` ⚠️ | ✗ | — |
| [`fixedBotsStats.js`](#fixedbotsstatsjs) | 94 | `/bot-stats-channel` | `Info` ⚠️ | ✗ | ✅ |
| [`userInfo.js`](#userinfojs) | 79 | `/user-info` | `Info` ⚠️ | ✗ | — |
| [`userInfoContextMenu.js`](#userinfocontextmenujs) | 78 | `/• User Info` | `Info` ⚠️ | ✗ | — |
| [`botStats.js`](#botstatsjs) | 67 | `/bot` | `Info` ⚠️ | ✅ | — |
| [`memberCountGraph.js`](#membercountgraphjs) | 65 | `/member-count` | `Info` ⚠️ | ✗ | — |
| [`movieInfo.js`](#movieinfojs) | 56 | `/movie-tracker` | `Info` ⚠️ | ✅ | — |
| [`roleInfo.js`](#roleinfojs) | 47 | `/role-info` | `Info` ⚠️ | ✗ | — |
| [`permissionTracker.js`](#permissiontrackerjs) | 40 | `/permissions` | `Info` ⚠️ | ✗ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `fixedBotsStatsSystem` |
| npm dependencies | `discord.js`, `os`, `discord-arts`, `quickchart-js`, `axios` |
| Env vars read | `movietrackerapi` |
| `EmbedBuilder` instantiations | 13 |
| `catch` blocks | 5 |

## Files

### `serverInfo.js`

`src/commands/InfoCommands/serverInfo.js` · **130 lines**

`/server-info` — guild statistics.

| | |
|---|---|
| **Registers** | `/server-info` |
| **Command name** | `General` |
| **Binds to** | `General` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `avatar.js`

`src/commands/InfoCommands/avatar.js` · **100 lines**

`/avatar` — show a user's avatar.

Buttons switch between avatar and banner.

| | |
|---|---|
| **Registers** | `/avatar` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `fixedBotsStats.js`

`src/commands/InfoCommands/fixedBotsStats.js` · **94 lines**

`/bot-stats-channel` — subcommands `set` and `remove`.

Persists a message that `fixedBotStatsEvent.js` edits every 5 minutes.

| | |
|---|---|
| **Registers** | `/bot-stats-channel` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `fixedBotsStatsSystem` |
| **npm deps** | `discord.js`, `os` |
| **Internal imports** | `../../schemas/fixedBotsStatsSystem`, `../../utils/loggingEffects.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `userInfo.js`

`src/commands/InfoCommands/userInfo.js` · **79 lines**

`/user-info` — user detail with a `discord-arts` profile card.

Emits `userinfo-<id>` buttons handled by `userInfoButtonEvent.js`.

| | |
|---|---|
| **Registers** | `/user-info` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `discord-arts` |
| **Internal imports** | `../../lib/discordBadges`, `../../lib/addSuffix` |
| **External URLs** | `https://example.com/default-banner.jpg` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `userInfoContextMenu.js`

`src/commands/InfoCommands/userInfoContextMenu.js` · **78 lines**

Context menu `• User Info` (`ApplicationCommandType.User`).

One of only 3 `ContextMenuCommandBuilder` commands.

| | |
|---|---|
| **Registers** | `/• User Info` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `discord-arts` |
| **Internal imports** | `../../lib/discordBadges`, `../../lib/addSuffix` |
| **External URLs** | `https://example.com/default-banner.jpg` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `botStats.js`

`src/commands/InfoCommands/botStats.js` · **67 lines**

`/bot` — subcommands `uptime` and `specs`.

| | |
|---|---|
| **Registers** | `/bot` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `os` |

**Issues**

- Overlaps `fixedBotsStats.js`; near-identical `os`-based stat gathering
- The uptime computation is duplicated in 3+ places
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `memberCountGraph.js`

`src/commands/InfoCommands/memberCountGraph.js` · **65 lines**

`/member-count` — renders a member-count graph via quickchart.

| | |
|---|---|
| **Registers** | `/member-count` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `quickchart-js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `movieInfo.js`

`src/commands/InfoCommands/movieInfo.js` · **56 lines**

`/movie-tracker` — TMDB lookup.

| | |
|---|---|
| **Registers** | `/movie-tracker` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `axios` |
| **Env vars** | `movietrackerapi` |
| **External URLs** | `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(name)}`<br>`https://image.tmdb.org/t/p/w500${movie.poster_path}` |

**Issues**

- Reads `process.env.movietrackerapi`
- Untyped TMDB response
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `roleInfo.js`

`src/commands/InfoCommands/roleInfo.js` · **47 lines**

`/role-info` — role detail including permissions.

| | |
|---|---|
| **Registers** | `/role-info` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `permissionTracker.js`

`src/commands/InfoCommands/permissionTracker.js` · **40 lines**

`/permissions` — list a member's permissions.

| | |
|---|---|
| **Registers** | `/permissions` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
