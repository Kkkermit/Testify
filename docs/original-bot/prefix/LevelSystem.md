# prefix/LevelSystem

**2 files · 107 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`leaderboard.js`](#leaderboardjs) | 56 | `leaderboard` | `Leveling` ⚠️ | ✗ | — |
| [`rank.js`](#rankjs) | 51 | `rank` | `Leveling` ⚠️ | ✗ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `userLevelSystem` |
| npm dependencies | `canvafy`, `discord.js`, `canvacord` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 1 |
| `catch` blocks | 0 |

## Files

### `leaderboard.js`

`src/prefix/LevelSystem/leaderboard.js` · **56 lines**

`leaderboard` — level leaderboard (canvafy).

| | |
|---|---|
| **Command name** | `leaderboard` |
| **Aliases** | `lb` |
| **Binds to** | `leaderboard` |
| **Export keys** | `name`, `aliases`, `category`, `description`, `usage`, `usableInDms` |
| **Schemas** | `userLevelSystem` |
| **npm deps** | `canvafy` |
| **Internal imports** | `../../schemas/userLevelSystem` |
| **External URLs** | `https://cdn.discordapp.com/avatars/${user.User}/${fetchedUser.avatar}.png`<br>`https://img.freepik.com/free-photo/ultra-detailed-nebula-abstract-wallpaper-4_1562-749.jpg` |

**Issues**

- `category: "Leveling"`

---

### `rank.js`

`src/prefix/LevelSystem/rank.js` · **51 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `rank` |
| **Aliases** | `rankcard,levelcard` |
| **Binds to** | `rank` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **Schemas** | `userLevelSystem` |
| **npm deps** | `discord.js`, `canvacord` |
| **Internal imports** | `../../schemas/userLevelSystem` |
| **External URLs** | `https://img.freepik.com/free-photo/ultra-detailed-nebula-abstract-wallpaper-4_1562-749.jpg` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
