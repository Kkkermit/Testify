# commands/InstaNotification

**1 files · 134 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`instaNotification.js`](#instanotificationjs) | 134 | `/insta-notification` | `Instagram` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `instaNotificationSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 3 |
| `catch` blocks | 3 |

## Files

### `instaNotification.js`

`src/commands/InstaNotification/instaNotification.js` · **134 lines**

`/insta-notification` — subcommands `add-user`, `delete-user`, `check`.

| | |
|---|---|
| **Registers** | `/insta-notification` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `instaNotificationSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/instaNotificationSystem`, `../../api/instagramApi`, `../../utils/loggingEffects` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory
- `console.*` ×3 — should route through the logger

---
