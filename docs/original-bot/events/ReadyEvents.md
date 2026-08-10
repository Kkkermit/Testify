# events/ReadyEvents

**5 files · 252 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`directMessageLoggerEvent.js`](#directmessageloggereventjs) | 105 | `MessageCreate` | — |
| [`passiveIncome.js`](#passiveincomejs) | 64 | `ClientReady` | — |
| [`ready.js`](#readyjs) | 35 | `ready` | ✅ |
| [`setActivityEvent.js`](#setactivityeventjs) | 29 | `ClientReady` | — |
| [`setBotStatusEvent.js`](#setbotstatuseventjs) | 19 | `ClientReady` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `dmLoggerSystem`, `economySchema` |
| npm dependencies | `discord.js`, `mongoose` |
| Env vars read | `mongodb` |
| `EmbedBuilder` instantiations | 1 |
| `catch` blocks | 4 |

## Files

### `directMessageLoggerEvent.js`

`src/events/ReadyEvents/directMessageLoggerEvent.js` · **105 lines**

Logs DMs to the configured channel and persists them.

| | |
|---|---|
| **Command name** | `${message.author.tag} sent a direct message!` |
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **Schemas** | `dmLoggerSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects`, `../../schemas/dmLoggerSystem`, `../../utils/getMessagePrefix` |

**Issues**

- **Misfiled — this is a `MessageCreate` handler in `ReadyEvents/`**
- Independently re-calls `getMessagePrefix`, adding 2 more DB queries per message
- Unused `MessageFlags` import
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×4 — should route through the logger

---

### `passiveIncome.js`

`src/events/ReadyEvents/passiveIncome.js` · **64 lines**

Credits house/business income hourly.

| | |
|---|---|
| **Binds to** | `ClientReady` |
| **Export keys** | `name`, `once` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems` |

**Issues**

- `once: false` explicitly — stacks on re-identify
- A full-collection scan every hour

---

### `ready.js`

`src/events/ReadyEvents/ready.js` · **35 lines**

Connects Mongoose, then runs the folder loader and the ASCII banner.

| | |
|---|---|
| **Command name** | `ready` |
| **Binds to** | `ready` (`once: true`) |
| **Export keys** | `name`, `once` |
| **npm deps** | `mongoose` |
| **Internal imports** | `../../utils/folderLoader.js`, `../../utils/loggingEffects.js`, `../../lib/asciiText.js` |
| **Env vars** | `mongodb` |

**Issues**

- `name` is the raw string `'ready'`
- Passes `keepAlive`, `useNewUrlParser`, `useUnifiedTopology` — all removed in Mongoose 7
- Calls `folderLoader`, which loads nothing

---

### `setActivityEvent.js`

`src/events/ReadyEvents/setActivityEvent.js` · **29 lines**

Rotates the bot presence.

| | |
|---|---|
| **Binds to** | `ClientReady` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |

**Issues**

- **A 7.5-second `setInterval`** — the highest-frequency timer in the bot
- Not `once`, so it stacks on every re-identify

---

### `setBotStatusEvent.js`

`src/events/ReadyEvents/setBotStatusEvent.js` · **19 lines**

Sets the bot status once at ready.

| | |
|---|---|
| **Binds to** | `ClientReady` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |

**Issues**

- Not `once`

---
