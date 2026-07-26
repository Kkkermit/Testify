# events/GuildCreateDeleteEvents

**2 files · 91 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`guildCreate.js`](#guildcreatejs) | 52 | `GuildCreate` | — |
| [`guildDelete.js`](#guilddeletejs) | 39 | `GuildDelete` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | `devid` |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 7 |

## Files

### `guildCreate.js`

`src/events/GuildCreateDeleteEvents/guildCreate.js` · **52 lines**

Posts a join embed to the configured channel.

| | |
|---|---|
| **Binds to** | `GuildCreate` |
| **Export keys** | `name`, `if` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects.js` |
| **Env vars** | `devid` |

**Issues**

- **Footer hardcoded to `"Orbit"` — leftover branding from a different bot**
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger
- `.then()` ×1 — mixed with async/await

---

### `guildDelete.js`

`src/events/GuildCreateDeleteEvents/guildDelete.js` · **39 lines**

Posts a leave embed.

| | |
|---|---|
| **Binds to** | `GuildDelete` |
| **Export keys** | `name`, `if` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects.js` |
| **Env vars** | `devid` |

**Issues**

- **Log tag says `[GUILD_CREATE]`**
- Reads `guild.memberCount` after leaving — unreliable
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger
- `.then()` ×1 — mixed with async/await

---
