# commands/Devs

**2 files · 158 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`bugReport.js`](#bugreportjs) | 90 | `/bug-report` | `Developer` ⚠️ | ✗ | — |
| [`suggestion.js`](#suggestionjs) | 68 | `/suggest` | `Developer` ⚠️ | ✗ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | `webhookBugLogging`, `webhookSuggestionLogging` |
| `EmbedBuilder` instantiations | 6 |
| `catch` blocks | 7 |

## Files

### `bugReport.js`

`src/commands/Devs/bugReport.js` · **90 lines**

`/bug-report` — modal → webhook.

| | |
|---|---|
| **Registers** | `/bug-report` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |
| **Env vars** | `webhookBugLogging` |

**Issues**

- Reads `process.env.webhookBugLogging`, **which the setup script writes lowercase** (finding 3)
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `suggestion.js`

`src/commands/Devs/suggestion.js` · **68 lines**

`/suggest` — modal → webhook.

| | |
|---|---|
| **Registers** | `/suggest` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |
| **Env vars** | `webhookSuggestionLogging` |

**Issues**

- Reads `process.env.webhookSuggestionLogging` — same lowercase bug
- **`/help` advertises this as `/suggestion`, which does not exist**
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---
