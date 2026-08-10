# commands/LevelAndEconomy

**3 files · 542 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`leaderboard.js`](#leaderboardjs) | 278 | `/leaderboard` | `Level and Economy` | ✗ | — |
| [`reset.js`](#resetjs) | 134 | `/reset` | `Level and Economy` | ✗ | ✅ |
| [`give.js`](#givejs) | 130 | `/give` | `Level and Economy` | ✗ | ✅ |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `userLevelSystem`, `economySystem`, `levelSetupSystem` |
| npm dependencies | `discord.js`, `canvafy`, `canvas` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 6 |
| `catch` blocks | 6 |

## Files

### `leaderboard.js`

`src/commands/LevelAndEconomy/leaderboard.js` · **278 lines**

`/leaderboard` — subcommands `levels` and `economy`.

Renders with canvas + canvafy.

| | |
|---|---|
| **Registers** | `/leaderboard` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `userLevelSystem`, `economySystem` |
| **npm deps** | `discord.js`, `canvafy`, `canvas` |
| **Internal imports** | `../../schemas/userLevelSystem`, `../../schemas/economySystem` |
| **External URLs** | `https://cdn.discordapp.com/avatars/${user.User}/${fetchedUser.avatar}.png`<br>`https://img.freepik.com/free-photo/ultra-detailed-nebula-abstract-wallpaper-4_1562-749.jpg` |

**Issues**

- 277 lines
- **Reads the legacy `economySystem` model** (finding 36)
- `console.*` ×5 — should route through the logger

---

### `reset.js`

`src/commands/LevelAndEconomy/reset.js` · **134 lines**

`/reset` — subcommands `all-xp`, `all-currency`, `currency`, `xp`.

| | |
|---|---|
| **Registers** | `/reset` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `userLevelSystem`, `economySystem`, `levelSetupSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/levelSetupSystem` |

**Issues**

- **Writes through the legacy `economySystem` model** (finding 36)
- Uses `PermissionsBitField.Flags.X`, a different idiom from the other 40 files
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `give.js`

`src/commands/LevelAndEconomy/give.js` · **130 lines**

`/give` — subcommands `currency` and `xp`.

| | |
|---|---|
| **Registers** | `/give` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `economySystem`, `userLevelSystem`, `levelSetupSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySystem`, `../../schemas/userLevelSystem`, `../../schemas/levelSetupSystem` |

**Issues**

- **Writes through the legacy `economySystem` model** (finding 36)
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---
