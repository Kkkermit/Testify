# events/InteractionEvents

**3 files · 487 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`userInfoButtonEvent.js`](#userinfobuttoneventjs) | 213 | `InteractionCreate` | — |
| [`guildListPaginationEvent.js`](#guildlistpaginationeventjs) | 181 | `InteractionCreate` | — |
| [`respondButtonEvent.js`](#respondbuttoneventjs) | 93 | `InteractionCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `dmLoggerSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 4 |
| `catch` blocks | 11 |

## Files

### `userInfoButtonEvent.js`

`src/events/InteractionEvents/userInfoButtonEvent.js` · **213 lines**

`userinfo-<id>` and `back-<…>` buttons.

| | |
|---|---|
| **Command name** | `User Information for ${user.tag}` |
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `dmLoggerSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects`, `../../schemas/dmLoggerSystem`, `../../lib/discordBadges` |

**Issues**

- **`back-` is an unbounded land-grab — it claims every custom ID bot-wide beginning `back-`**
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory
- `console.*` ×3 — should route through the logger

---

### `guildListPaginationEvent.js`

`src/events/InteractionEvents/guildListPaginationEvent.js` · **181 lines**

Guild-list pagination.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |

**Issues**

- **Recovers state by fetching 10 surrounding channel messages and regex-parsing a ```json blob out of a bot message** — extremely fragile

---

### `respondButtonEvent.js`

`src/events/InteractionEvents/respondButtonEvent.js` · **93 lines**

`respond-<userId>` button → DM-response modal.

Handles both the button and the modal in one file.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×4 — should route through the logger

---
