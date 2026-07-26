# prefix/Economy

**16 files · 2,088 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`account-info.js`](#account-infojs) | 276 | `account-info` | `Economy` | ✗ | — |
| [`heist.js`](#heistjs) | 248 | `heist` | `Economy` | ✗ | — |
| [`leaderboard.js`](#leaderboardjs) | 222 | `leaderboard-economy` | `Economy` | ✗ | — |
| [`pet.js`](#petjs) | 210 | `pet` | `Economy` | ✗ | — |
| [`cooldowns.js`](#cooldownsjs) | 169 | `cooldowns` | `Economy` | ✗ | — |
| [`server-economy.js`](#server-economyjs) | 166 | `server-economy` | `Economy` | ✗ | — |
| [`rob.js`](#robjs) | 144 | `rob` | `Economy` | ✗ | — |
| [`transfer.js`](#transferjs) | 106 | `transfer` | `Economy` | ✗ | — |
| [`rehome.js`](#rehomejs) | 99 | `rehome` | `Economy` | ✗ | — |
| [`give.js`](#givejs) | 80 | `give` | `Economy` | ✗ | ✅ |
| [`work.js`](#workjs) | 72 | `work` | `Economy` | ✗ | — |
| [`reset.js`](#resetjs) | 70 | `reset` | `Economy` | ✗ | ✅ |
| [`daily.js`](#dailyjs) | 63 | `daily` | `Economy` | ✗ | — |
| [`deposit.js`](#depositjs) | 62 | `deposit` | `Economy` | ✗ | — |
| [`withdraw.js`](#withdrawjs) | 62 | `withdraw` | `Economy` | ✗ | — |
| [`balance.js`](#balancejs) | 39 | `balance` | `Economy` | ✗ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `economySchema` |
| npm dependencies | `discord.js`, `canvas` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 26 |
| `catch` blocks | 15 |

## Files

### `account-info.js`

`src/prefix/Economy/account-info.js` · **276 lines**

`account-info` — detailed economy account view.

| | |
|---|---|
| **Command name** | `account-info` |
| **Aliases** | `acc-info,profile,economy-info` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems`, `../../utils/economyUtils/items/petItems`, `../../utils/timeUtils` |

**Issues**

- 276 lines — the largest prefix file
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `heist.js`

`src/prefix/Economy/heist.js` · **248 lines**

`heist` — plan a heist.

| | |
|---|---|
| **Command name** | `heist` |
| **Aliases** | `robbery,crew` |
| **Binds to** | `heist` |
| **Export keys** | `name`, `aliases`, `description`, `usableInDms`, `usage`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- Lazily creates `client.activeHeists` — the second of two creation sites
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

---

### `leaderboard.js`

`src/prefix/Economy/leaderboard.js` · **222 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `leaderboard-economy` |
| **Aliases** | `lb-econ,rich,top` |
| **Export keys** | `name`, `aliases`, `description`, `usableInDms`, `usage`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js`, `canvas` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- `console.*` ×5 — should route through the logger

---

### `pet.js`

`src/prefix/Economy/pet.js` · **210 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `pet` |
| **Aliases** | `mypet` |
| **Binds to** | `pet` |
| **Export keys** | `name`, `aliases`, `description`, `usableInDms`, `usage`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/petItems` |

**Issues**

- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `cooldowns.js`

`src/prefix/Economy/cooldowns.js` · **169 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `cooldowns` |
| **Aliases** | `cd,cooldown` |
| **Binds to** | `cooldowns` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/timeUtils` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `server-economy.js`

`src/prefix/Economy/server-economy.js` · **166 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `server-economy` |
| **Aliases** | `server-eco,eco-stats,economy-stats` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `rob.js`

`src/prefix/Economy/rob.js` · **144 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `rob` |
| **Aliases** | `steal` |
| **Binds to** | `rob` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/timeUtils` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `transfer.js`

`src/prefix/Economy/transfer.js` · **106 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `transfer` |
| **Aliases** | `pay,send` |
| **Binds to** | `transfer` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `rehome.js`

`src/prefix/Economy/rehome.js` · **99 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `rehome` |
| **Aliases** | `giveuppet,abandonment` |
| **Binds to** | `rehome` |
| **Export keys** | `name`, `aliases`, `description`, `usableInDms`, `usage`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/petItems` |

**Issues**

- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `give.js`

`src/prefix/Economy/give.js` · **80 lines**

`give` — award money (Administrator).

| | |
|---|---|
| **Command name** | `give` |
| **Aliases** | `award,addmoney` |
| **Binds to** | `give` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category`, `permissions` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- **Writes through the legacy `economySystem` model** (finding 36)
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `work.js`

`src/prefix/Economy/work.js` · **72 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `work` |
| **Aliases** | `job` |
| **Binds to** | `work` |
| **Export keys** | `name`, `aliases`, `description`, `usableInDms`, `usage`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/economyUtils/items/shopItems`, `../../utils/timeUtils` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `reset.js`

`src/prefix/Economy/reset.js` · **70 lines**

`reset` — reset economy data.

| | |
|---|---|
| **Command name** | `reset` |
| **Aliases** | `wipe,reseteconomy` |
| **Binds to** | `reset` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category`, `permissions` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- Unused `economySchema` import — it delegates to a button handler
- **Pairs with the legacy-model bug** (finding 36)
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `daily.js`

`src/prefix/Economy/daily.js` · **63 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `daily` |
| **Aliases** | `day` |
| **Binds to** | `daily` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema`, `../../utils/timeUtils` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `deposit.js`

`src/prefix/Economy/deposit.js` · **62 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `deposit` |
| **Aliases** | `dep` |
| **Binds to** | `deposit` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `withdraw.js`

`src/prefix/Economy/withdraw.js` · **62 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `withdraw` |
| **Aliases** | `with,wd` |
| **Binds to** | `withdraw` |
| **Export keys** | `name`, `aliases`, `description`, `usableInDms`, `usage`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `balance.js`

`src/prefix/Economy/balance.js` · **39 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `balance` |
| **Aliases** | `bal,money,wallet` |
| **Binds to** | `balance` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `usableInDms`, `category` |
| **Schemas** | `economySchema` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/economySchema` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
