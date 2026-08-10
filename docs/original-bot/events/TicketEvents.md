# events/TicketEvents

**3 files · 332 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`ticketAction.js`](#ticketactionjs) | 164 | `InteractionCreate` | — |
| [`ticketResponse.js`](#ticketresponsejs) | 113 | `InteractionCreate` | — |
| [`ticketManage.js`](#ticketmanagejs) | 55 | `InteractionCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `ticketSetupSystem`, `ticketSystem` |
| npm dependencies | `discord.js`, `discord-html-transcripts` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 12 |
| `catch` blocks | 39 |

## Files

### `ticketAction.js`

`src/events/TicketEvents/ticketAction.js` · **164 lines**

Ticket close / lock / unlock / manage / claim.

Close generates an HTML transcript.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `ticketSetupSystem`, `ticketSystem` |
| **npm deps** | `discord.js`, `discord-html-transcripts` |
| **Internal imports** | `../../schemas/ticketSetupSystem`, `../../schemas/ticketSystem` |

**Issues**

- **`.has()` given a function instead of a permission bit** (finding 29)
- **Bitwise `&` used where `&&` was meant, 5×** (finding 30)
- Removed Mongoose callback API
- ~25 `.catch(() => {})` swallows
- `new EmbedBuilder()` ×6 — candidate for the shared embed factory
- loose `==` ×3

---

### `ticketResponse.js`

`src/events/TicketEvents/ticketResponse.js` · **113 lines**

Opens a ticket when the configured panel button is pressed.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `ticketSystem`, `ticketSetupSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/ticketSystem`, `../../schemas/ticketSetupSystem` |

**Issues**

- **Matches DB-supplied button IDs, so a guild admin can shadow any built-in ID**
- Ticket IDs are random 5-digit ints with no uniqueness check
- `.catch(...).then(...)` — the `then` runs after a caught failure
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory
- `.then()` ×1 — mixed with async/await

---

### `ticketManage.js`

`src/events/TicketEvents/ticketManage.js` · **55 lines**

The `ticket-manage-menu` user select.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `ticketSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/ticketSystem` |

**Issues**

- No `isUserSelectMenu()` guard
- `deferUpdate()` then `deleteReply()` before validating
- Deprecated `DocumentArray.remove()`
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---
