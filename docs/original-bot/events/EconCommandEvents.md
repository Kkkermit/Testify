# events/EconCommandEvents

**9 files · 2,575 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`shopInteractions.js`](#shopinteractionsjs) | 883 | `InteractionCreate` | — |
| [`heistHandler.js`](#heisthandlerjs) | 583 | `InteractionCreate` | — |
| [`petInteractions.js`](#petinteractionsjs) | 320 | `InteractionCreate` | — |
| [`blackjackInteractions.js`](#blackjackinteractionsjs) | 270 | `InteractionCreate` | — |
| [`resetButtonHandler.js`](#resetbuttonhandlerjs) | 124 | `InteractionCreate` | — |
| [`lotteryInteractions.js`](#lotteryinteractionsjs) | 121 | `InteractionCreate` | — |
| [`randomMoneyEvent.js`](#randommoneyeventjs) | 117 | `MessageCreate` | — |
| [`inventoryPagination.js`](#inventorypaginationjs) | 90 | `InteractionCreate` | — |
| [`itemAutocomplete.js`](#itemautocompletejs) | 67 | `InteractionCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `economySchema`, `lotterySchema`, `treasureConfigSchema` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 29 |
| `catch` blocks | 22 |
| **Deprecated `ephemeral:`** | **60** |

## Files

### `shopInteractions.js`

`src/events/EconCommandEvents/shopInteractions.js` · **883 lines**

The entire shop UI.

Nav buttons, five select menus and five confirm-button families, all behind a `shop_` prefix guard.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems`, `../../utils/economyUtils/items/petItems` |

**Issues**

- **883 lines — the 2nd largest file**
- 20 `ephemeral: true`
- The `pet_check_` branch is unreachable behind the `shop_` guard
- `ephemeral: true/false` ×20 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×12 — candidate for the shared embed factory

---

### `heistHandler.js`

`src/events/EconCommandEvents/heistHandler.js` · **583 lines**

The heist simulation and payout engine.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name`, `if` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- 583 lines
- Destructures `[action, command, heistId]` so `action` is literally the string `"heist"`
- Three `setTimeout` phase transitions that survive restarts as orphaned state
- 17 `ephemeral: true`
- `ephemeral: true/false` ×17 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `petInteractions.js`

`src/events/EconCommandEvents/petInteractions.js` · **320 lines**

Pet feed/walk/check plus rehome confirm/cancel.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/petItems` |

**Issues**

- 320 lines
- 12 `ephemeral: true`
- `ephemeral: true/false` ×13 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `blackjackInteractions.js`

`src/events/EconCommandEvents/blackjackInteractions.js` · **270 lines**

`blackjack_hit` / `blackjack_stand`.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- `client.blackjackGames` keyed by user ID only — one game per user globally
- 5 `ephemeral: true`
- `ephemeral: true/false` ×5 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `resetButtonHandler.js`

`src/events/EconCommandEvents/resetButtonHandler.js` · **124 lines**

Economy reset confirmations.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- 1 `ephemeral: true`
- `ephemeral: true/false` ×1 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×6 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `lotteryInteractions.js`

`src/events/EconCommandEvents/lotteryInteractions.js` · **121 lines**

Lottery disable confirm/cancel, refunding every entry.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `lotterySchema`, `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/lotterySchema`, `../../schemas/economySchema` |

**Issues**

- 3 `ephemeral: true`
- `ephemeral: true/false` ×3 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `randomMoneyEvent.js`

`src/events/EconCommandEvents/randomMoneyEvent.js` · **117 lines**

'Treasure drop' — credits a random user after N messages.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **Schemas** | `economySchema`, `treasureConfigSchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../schemas/treasureConfigSchema` |

**Issues**

- Two module-scope `Map`s that are never evicted and are lost on restart, resetting cooldowns
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `inventoryPagination.js`

`src/events/EconCommandEvents/inventoryPagination.js` · **90 lines**

`inventory_prev` / `inventory_next`.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |

**Issues**

- Schedules a **new** 5-minute timeout on every button press
- Recovers state by regex-parsing the embed footer
- `ephemeral: true/false` ×1 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- commented-out lines ×1

---

### `itemAutocomplete.js`

`src/events/EconCommandEvents/itemAutocomplete.js` · **67 lines**

Autocomplete for `/use`'s `item` option.

| | |
|---|---|
| **Command name** | `${item.emoji} ${item.name} (x${item.count})` |
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems` |

**Issues**

- Duplicates the autocomplete branch already in `interactionCreate.js`

---
