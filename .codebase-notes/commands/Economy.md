# commands/Economy

**19 files · 4,111 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`lottery.js`](#lotteryjs) | 700 | `/lottery` | `Economy` | ✗ | — |
| [`gamble.js`](#gamblejs) | 513 | `/gamble` | `Economy` | ✗ | — |
| [`account-info.js`](#account-infojs) | 465 | `/economy-info` | `Economy` | ✗ | — |
| [`treasureconfig.js`](#treasureconfigjs) | 352 | `/treasureconfig` | `Economy` | ✗ | — |
| [`heist.js`](#heistjs) | 270 | `/heist` | `Economy` | ✗ | — |
| [`shop.js`](#shopjs) | 270 | `/shop` | `Economy` | ✗ | — |
| [`pet.js`](#petjs) | 255 | `/pet` | `Economy` | ✗ | — |
| [`use.js`](#usejs) | 190 | `/use` | `Economy` | ✗ | — |
| [`inventory.js`](#inventoryjs) | 183 | `/inventory` | `Economy` | ✗ | — |
| [`cooldowns.js`](#cooldownsjs) | 172 | `/cooldowns` | `Economy` | ✗ | — |
| [`rob.js`](#robjs) | 159 | `/rob` | `Economy` | ✗ | — |
| [`transfer.js`](#transferjs) | 119 | `/transfer` | `Economy` | ✗ | — |
| [`work.js`](#workjs) | 77 | `/work` | `Economy` | ✗ | — |
| [`create.js`](#createjs) | 75 | `/economy` | `Economy` | ✗ | — |
| [`deposit.js`](#depositjs) | 69 | `/deposit` | `Economy` | ✗ | — |
| [`withdraw.js`](#withdrawjs) | 69 | `/withdraw` | `Economy` | ✗ | — |
| [`daily.js`](#dailyjs) | 68 | `/daily` | `Economy` | ✗ | — |
| [`rehome.js`](#rehomejs) | 64 | `/rehome` | `Economy` | ✗ | — |
| [`balance.js`](#balancejs) | 41 | `/balance` | `Economy` | ✗ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `lotterySchema`, `economySchema`, `treasureConfigSchema` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 45 |
| `catch` blocks | 12 |
| **Deprecated `ephemeral:`** | **98** |

## Files

### `lottery.js`

`src/commands/Economy/lottery.js` · **700 lines**

`/lottery` — subcommands `setup`, `edit`, `freeze`, `disable`, `info`, `buy`, `forcedraw`.

Contains the entire draw engine alongside the command surface.

| | |
|---|---|
| **Registers** | `/lottery` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `lotterySchema`, `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/lotterySchema`, `../../schemas/economySchema`, `../../utils/economyUtils/lotteryUtils` |

**Issues**

- 700 lines — the 3rd largest file
- 22 `ephemeral: true` — the highest count in the repo
- Draw logic duplicated with `jobs/lotteryDrawJob.js`
- `ephemeral: true/false` ×22 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×8 — candidate for the shared embed factory
- `console.*` ×4 — should route through the logger

**Rewrite note.** One `lotteryService`, consumed by both the command and the job.

---

### `gamble.js`

`src/commands/Economy/gamble.js` · **513 lines**

`/gamble` — subcommands `basic`, `blackjack`, `slots`, `roulette`.

Implements a full 52-card deck. Lazily creates `client.blackjackGames` and hands off to `events/EconCommandEvents/blackjackInteractions.js`.

| | |
|---|---|
| **Registers** | `/gamble` |
| **Export keys** | `usableInDms`, `category`, `data`, `if` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- 513 lines
- `client.blackjackGames` is keyed by user ID only — one game per user *globally*
- Money duplication under concurrent play
- Unused `StringSelectMenuBuilder` import
- 6 `ephemeral: true`
- `ephemeral: true/false` ×6 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

**Rewrite note.** Split per game; move deck logic to a pure, testable service; key games by `guildId:userId` with a TTL.

---

### `account-info.js`

`src/commands/Economy/account-info.js` · **465 lines**

`/economy-info` — economy stats viewer.

Subcommands `acc-info` and `server-info`. Aggregates balances, streaks, job, house, businesses and pet into a multi-field embed.

| | |
|---|---|
| **Registers** | `/economy-info` |
| **Command name** | `${pet.emoji} Pet: ${petName}` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems`, `../../utils/economyUtils/items/petItems`, `../../utils/timeUtils` |

**Issues**

- 465 lines — decompose
- Inlines the 86400000 daily-window literal
- 1 `ephemeral: true`
- `ephemeral: true/false` ×1 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

**Rewrite note.** Split into a service that returns a view-model plus a thin embed renderer.

---

### `treasureconfig.js`

`src/commands/Economy/treasureconfig.js` · **352 lines**

`/treasureconfig` — random money-drop configuration.

Subcommands `setup`, `view`, `edit`, `toggle`, `disable`, writing `treasureConfigSchema`.

| | |
|---|---|
| **Registers** | `/treasureconfig` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `treasureConfigSchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/treasureConfigSchema` |

**Issues**

- 352 lines
- 18 `ephemeral: true`
- `ephemeral: true/false` ×18 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×5 — candidate for the shared embed factory

---

### `heist.js`

`src/commands/Economy/heist.js` · **270 lines**

`/heist` — multiplayer heist lobby.

Join/start/cancel buttons with a 5-minute expiry; lazily creates `client.activeHeists`; the simulation lives in `events/EconCommandEvents/heistHandler.js`.

| | |
|---|---|
| **Registers** | `/heist` |
| **Command name** | `Bank Heist` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- Deprecated `fetchReply: true`
- Orphaned heists survive restarts in the in-memory Map
- Unused `StringSelectMenuBuilder` import
- 5 `ephemeral: true`
- `ephemeral: true/false` ×5 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

**Rewrite note.** Persist lobby state; atomic payouts; move the simulation into a service.

---

### `shop.js`

`src/commands/Economy/shop.js` · **270 lines**

`/shop` — subcommands `items`, `houses`, `businesses`, `jobs`, `pets`.

Opens the select-menu UI handled by the 883-line `shopInteractions.js`.

| | |
|---|---|
| **Registers** | `/shop` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems`, `../../utils/economyUtils/items/petItems` |

**Issues**

- 1 `ephemeral: true`
- `ephemeral: true/false` ×1 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

**Rewrite note.** Catalogue data becomes `as const`, giving derived union types for item IDs.

---

### `pet.js`

`src/commands/Economy/pet.js` · **255 lines**

`/pet` — subcommands `status`, `feed`, `walk`, `rename`.

| | |
|---|---|
| **Registers** | `/pet` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/petItems` |

**Issues**

- Inlines 3600000 twice
- 6 `ephemeral: true`
- `ephemeral: true/false` ×6 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

**Rewrite note.** Share cooldown logic with `events/EconCommandEvents/petInteractions.js`.

---

### `use.js`

`src/commands/Economy/use.js` · **190 lines**

`/use` — use an inventory item.

Handlers for fishing, hunting and bank upgrades. Autocomplete is served by a *separate* file, `events/EconCommandEvents/itemAutocomplete.js`.

| | |
|---|---|
| **Registers** | `/use` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems` |

**Issues**

- 6 `ephemeral: true`
- `ephemeral: true/false` ×6 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- commented-out lines ×1

**Rewrite note.** Co-locate the autocomplete with the command.

---

### `inventory.js`

`src/commands/Economy/inventory.js` · **183 lines**

`/inventory` — paginated inventory.

| | |
|---|---|
| **Registers** | `/inventory` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems` |

**Issues**

- Deprecated `fetchReply: true`
- Pagination state recovered by regex-parsing the embed footer
- 3 `ephemeral: true`
- `ephemeral: true/false` ×3 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

**Rewrite note.** Encode the page in the custom ID; use the shared paginator.

---

### `cooldowns.js`

`src/commands/Economy/cooldowns.js` · **172 lines**

`/cooldowns` — view all active economy cooldowns.

Computes remaining time for daily, work, rob, heist and pet actions.

| | |
|---|---|
| **Registers** | `/cooldowns` |
| **Command name** | `Daily Reward` |
| **Binds to** | `Work` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/timeUtils` |

**Issues**

- Inlines 86400000 and 3600000
- Duplicates duration maths that `utils/timeUtils.js` already provides
- `ephemeral: true/false` ×1 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

**Rewrite note.** Named constants in `config/constants.ts`; one `formatDuration()`.

---

### `rob.js`

`src/commands/Economy/rob.js` · **159 lines**

`/rob` — rob another user (1h cooldown).

| | |
|---|---|
| **Registers** | `/rob` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/timeUtils` |

**Issues**

- Inlines 3600000
- Read-modify-save on two accounts — the clearest duplication race
- 7 `ephemeral: true`
- `ephemeral: true/false` ×7 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

**Rewrite note.** A single atomic transfer in the repository.

---

### `transfer.js`

`src/commands/Economy/transfer.js` · **119 lines**

`/transfer` — move money between users.

| | |
|---|---|
| **Registers** | `/transfer` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- Two separate `findOne` calls then two saves — not atomic
- 5 `ephemeral: true`
- `ephemeral: true/false` ×5 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

**Rewrite note.** One repository `transfer()` with a session.

---

### `work.js`

`src/commands/Economy/work.js` · **77 lines**

`/work` — earn money.

| | |
|---|---|
| **Registers** | `/work` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems`, `../../utils/timeUtils` |

**Issues**

- Read-modify-save
- 2 `ephemeral: true`
- `ephemeral: true/false` ×2 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `create.js`

`src/commands/Economy/create.js` · **75 lines**

`/economy` — account lifecycle.

Subcommands `create` and `delete`.

| | |
|---|---|
| **Registers** | `/economy` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- 2 `ephemeral: true`
- `ephemeral: true/false` ×2 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

**Rewrite note.** Fold into the repository's upsert; `delete` needs a confirm component.

---

### `deposit.js`

`src/commands/Economy/deposit.js` · **69 lines**

`/deposit` — wallet → bank.

| | |
|---|---|
| **Registers** | `/deposit` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- Read-modify-save
- 3 `ephemeral: true`
- `ephemeral: true/false` ×3 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

**Rewrite note.** Single atomic two-field update.

---

### `withdraw.js`

`src/commands/Economy/withdraw.js` · **69 lines**

`/withdraw` — bank → wallet.

| | |
|---|---|
| **Registers** | `/withdraw` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- Read-modify-save
- 3 `ephemeral: true`
- `ephemeral: true/false` ×3 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `daily.js`

`src/commands/Economy/daily.js` · **68 lines**

`/daily` — collect the daily reward.

24h window via the literal `86400000`; maintains `DailyStreak`.

| | |
|---|---|
| **Registers** | `/daily` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/timeUtils` |

**Issues**

- Read-modify-save → lost updates
- 2 `ephemeral: true`
- `ephemeral: true/false` ×2 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

**Rewrite note.** Atomic `$inc` + `$set` on the streak.

---

### `rehome.js`

`src/commands/Economy/rehome.js` · **64 lines**

`/rehome` — delete a pet, with confirm buttons.

| | |
|---|---|
| **Registers** | `/rehome` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/petItems` |

**Issues**

- 4 `ephemeral: true`
- `ephemeral: true/false` ×4 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `balance.js`

`src/commands/Economy/balance.js` · **41 lines**

`/balance` — check your or another user's balance.

Single `economySchema.findOne({Guild,User})` then a wallet/bank embed.

| | |
|---|---|
| **Registers** | `/balance` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- Duplicates the account lookup verbatim
- 1 `ephemeral: true`
- `ephemeral: true/false` ×1 — **deprecated**, must become `flags: MessageFlags.Ephemeral`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

**Rewrite note.** `getOrCreateAccount()` from the economy repository.

---
