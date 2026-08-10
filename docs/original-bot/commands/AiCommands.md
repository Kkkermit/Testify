# commands/AiCommands

**1 files · 244 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`aiCommands.js`](#aicommandsjs) | 244 | `/ai` | `AI Commands` | ✗ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `aiChannelSystem` |
| npm dependencies | `discord.js`, `apexify.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 6 |
| `catch` blocks | 6 |

## Files

### `aiCommands.js`

`src/commands/AiCommands/aiCommands.js` · **244 lines**

`/ai` — subcommands `image-generate`, `image-analyser`, `chat`, `setup-channel`, `disable-channel`, `update-ai-instructions`.

Built on `apexify.js` — **not** `hercai`, despite the README.

| | |
|---|---|
| **Registers** | `/ai` |
| **Export keys** | `underDevelopment`, `usableInDms`, `category`, `data` |
| **Schemas** | `aiChannelSystem` |
| **npm deps** | `discord.js`, `apexify.js` |
| **Internal imports** | `../../schemas/aiChannelSystem`, `../../jsons/filter.json` |

**Issues**

- **`underDevelopment: true` — all 244 lines are unreachable at runtime** (finding 4)
- Re-declares its own copy of `config.filterMessage` 5 times
- `apexify.js` is untyped with an unstable API
- `new EmbedBuilder()` ×6 — candidate for the shared embed factory
- `console.*` ×6 — should route through the logger

**Rewrite note.** Delete the dependency and rebuild against a typed SDK.

---
