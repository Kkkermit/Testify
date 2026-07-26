# events/FixedBotStatsEvents

**1 files · 60 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`fixedBotStatsEvent.js`](#fixedbotstatseventjs) | 60 | `ClientReady` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `fixedBotsStatsSystem` |
| npm dependencies | `discord.js`, `os` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 1 |
| `catch` blocks | 1 |

## Files

### `fixedBotStatsEvent.js`

`src/events/FixedBotStatsEvents/fixedBotStatsEvent.js` · **60 lines**

Edits a persisted stats message every 5 minutes.

| | |
|---|---|
| **Binds to** | `ClientReady` |
| **Export keys** | `name` |
| **Schemas** | `fixedBotsStatsSystem` |
| **npm deps** | `discord.js`, `os` |
| **Internal imports** | `../../schemas/fixedBotsStatsSystem`, `../../utils/loggingEffects.js` |

**Issues**

- Declares `execute(interaction, client)` for a `ClientReady` event — works only by accident
- Not `once`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×5 — should route through the logger

---
