# commands/LevelSystem

**3 files · 214 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`levellingSystem.js`](#levellingsystemjs) | 113 | `/leveling-system` | `Leveling` ⚠️ | ✗ | ✅ |
| [`rank.js`](#rankjs) | 52 | `/rank` | `Leveling` ⚠️ | ✗ | — |
| [`rankContextMenu.js`](#rankcontextmenujs) | 49 | `/• Rank` | `Leveling` ⚠️ | ✗ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `levelSetupSystem`, `userLevelSystem` |
| npm dependencies | `discord.js`, `canvacord` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 4 |
| `catch` blocks | 0 |

## Files

### `levellingSystem.js`

`src/commands/LevelSystem/levellingSystem.js` · **113 lines**

`/leveling-system` — subcommands `role-multiplier`, `disable`, `enable`, `disable-multiplier`.

| | |
|---|---|
| **Registers** | `/leveling-system` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `levelSetupSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/levelSetupSystem` |

**Issues**

- Unused `PermissionsBitField` import
- `levelSetupSystem.Disabled` and `.Multi` are typed `String`, not `Boolean`/`Number`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `rank.js`

`src/commands/LevelSystem/rank.js` · **52 lines**

`/rank` — canvacord rank card.

| | |
|---|---|
| **Registers** | `/rank` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `userLevelSystem` |
| **npm deps** | `discord.js`, `canvacord` |
| **Internal imports** | `../../schemas/userLevelSystem` |
| **External URLs** | `https://img.freepik.com/free-photo/ultra-detailed-nebula-abstract-wallpaper-4_1562-749.jpg` |

**Issues**

- XP curve `level² * 20 + 20` duplicated with the context-menu variant and `levellingEvent.js`
- Hotlinks a freepik background
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `rankContextMenu.js`

`src/commands/LevelSystem/rankContextMenu.js` · **49 lines**

Context menu `• Rank`.

| | |
|---|---|
| **Registers** | `/• Rank` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `userLevelSystem` |
| **npm deps** | `discord.js`, `canvacord` |
| **Internal imports** | `../../schemas/userLevelSystem` |
| **External URLs** | `https://img.freepik.com/free-photo/ultra-detailed-nebula-abstract-wallpaper-4_1562-749.jpg` |

**Issues**

- Duplicates `rank.js`
- `.setDiscriminator('0000')` — a post-username-migration artifact
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
