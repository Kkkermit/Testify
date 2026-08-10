# commands/Automod

**1 files · 224 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`automod.js`](#automodjs) | 224 | `/automod` | `Moderation` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | `clientid` |
| `EmbedBuilder` instantiations | 4 |
| `catch` blocks | 4 |

## Files

### `automod.js`

`src/commands/Automod/automod.js` · **224 lines**

`/automod` — subcommands `flagged-words`, `spam-messages`, `mention-spam`, `keyword`.

Creates native Discord `guild.autoModerationRules`.

| | |
|---|---|
| **Registers** | `/automod` |
| **Command name** | `Block profanity, sexual content, and slurs by ${client.user.username}.` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |
| **Env vars** | `clientid` |

**Issues**

- **Raw numeric enums** — `eventType: 1`, `triggerType: 4`, `presets: [1,2,3]`
- 4 reads of `process.env.clientid`
- 8 unlabelled `setTimeout` delays
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---
