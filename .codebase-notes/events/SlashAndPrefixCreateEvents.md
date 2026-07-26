# events/SlashAndPrefixCreateEvents

**3 files · 322 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`messageCreate.js`](#messagecreatejs) | 116 | `messageCreate` | — |
| [`interactionErrorLoggingButton.js`](#interactionerrorloggingbuttonjs) | 109 | `interactionCreate` | — |
| [`interactionCreate.js`](#interactioncreatejs) | 97 | `interactionCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `prefixEnableSystem`, `blacklistSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 5 |
| `catch` blocks | 8 |

## Files

### `messageCreate.js`

`src/events/SlashAndPrefixCreateEvents/messageCreate.js` · **116 lines**

**The prefix dispatch core.**

Resolves the guild prefix (2 DB queries) → blacklist gate → arg split → `pcommands`/`aliases` lookup → gates → `command.execute(message, client, args)`.

| | |
|---|---|
| **Command name** | `messageCreate` |
| **Binds to** | `messageCreate` |
| **Export keys** | `name` |
| **Schemas** | `prefixEnableSystem`, `blacklistSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/prefixEnableSystem.js`, `../../schemas/blacklistSystem`, `../../utils/loggingEffects.js`, `../../utils/commandParams/dmCommandCheck.js`, `../../utils/commandParams/underDevelopmentCheck.js`, `../../utils/getMessagePrefix.js` |

**Issues**

- **The execute call is not awaited — async errors escape the catch entirely** (finding 19)
- The unknown-command `return` is inside the `try`, so a failed reply falls through with `command === undefined` (finding 20)
- Lowercases the content but not the prefix (finding 21)
- `withResponse: true` on `message.reply()` — not a valid key
- Never calls `logCommandError`, so prefix errors are never reported
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

**Rewrite note.** Same middleware pipeline as the slash path, with the prefix adapter.

---

### `interactionErrorLoggingButton.js`

`src/events/SlashAndPrefixCreateEvents/interactionErrorLoggingButton.js` · **109 lines**

Handles the `change_color_*_slash` triage buttons minted by `utils/errorLogging.js`.

| | |
|---|---|
| **Command name** | `interactionCreate` |
| **Binds to** | `interactionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects.js` |

**Issues**

- Validates by checking the embed *title* contains `Command Execution Error` — brittle
- `console.*` ×4 — should route through the logger

---

### `interactionCreate.js`

`src/events/SlashAndPrefixCreateEvents/interactionCreate.js` · **97 lines**

**The slash dispatch core.**

Autocomplete branch → `isCommand()` guard → blacklist gate → command lookup → DM check → under-development check → permission gate → `await command.execute(interaction, client)` → error boundary.

| | |
|---|---|
| **Command name** | `interactionCreate` |
| **Binds to** | `interactionCreate` |
| **Export keys** | `name` |
| **Schemas** | `blacklistSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/blacklistSystem`, `../../utils/loggingEffects.js`, `../../utils/commandParams/dmCommandCheck.js`, `../../utils/commandParams/underDevelopmentCheck.js`, `../../utils/errorLogging.js` |

**Issues**

- `name` is the raw string `'interactionCreate'`, not `Events.InteractionCreate`
- `interaction.member` is `null` in DMs — crashes DM-usable commands that declare `permissions` (finding 22)
- `.delete()` called on an `InteractionCallbackResponse` (finding 23)
- The blacklist and permission gates are verbatim duplicates of `messageCreate.js`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×3 — should route through the logger

**Rewrite note.** Becomes `core/dispatcher.ts` + `core/middleware.ts`.

---
