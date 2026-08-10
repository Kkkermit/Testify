# commands/Profile

**2 files · 215 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`profiles.js`](#profilesjs) | 159 | `/profile` | `Community` ⚠️ | ✗ | — |
| [`profileViewContextMenu.js`](#profileviewcontextmenujs) | 56 | `/• Profile View` | `Community` ⚠️ | ✗ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `profileSystem` |
| npm dependencies | `discord.js`, `moment` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 2 |

## Files

### `profiles.js`

`src/commands/Profile/profiles.js` · **159 lines**

`/profile` — subcommands `create`, `edit`, `view`.

| | |
|---|---|
| **Registers** | `/profile` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `profileSystem` |
| **npm deps** | `discord.js`, `moment` |
| **Internal imports** | `../../schemas/profileSystem`, `../../jsons/filter.json` |

**Issues**

- Ships the placeholder URL `https://example.com/default-banner.jpg`
- Profanity filter re-implemented 4×
- Uses the deprecated `moment`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

---

### `profileViewContextMenu.js`

`src/commands/Profile/profileViewContextMenu.js` · **56 lines**

Context menu `• Profile View`.

| | |
|---|---|
| **Registers** | `/• Profile View` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `profileSystem` |
| **npm deps** | `discord.js`, `moment` |
| **Internal imports** | `../../schemas/profileSystem` |

**Issues**

- `category: "Community"` while the folder is `Profile`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
