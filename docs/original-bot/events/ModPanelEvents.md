# events/ModPanelEvents

**2 files · 529 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`modPanelModalHandler.js`](#modpanelmodalhandlerjs) | 401 | `InteractionCreate` | — |
| [`modPanelButtonHandler.js`](#modpanelbuttonhandlerjs) | 128 | `InteractionCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `softbanSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 3 |
| `catch` blocks | 26 |

## Files

### `modPanelModalHandler.js`

`src/events/ModPanelEvents/modPanelModalHandler.js` · **401 lines**

Executes warn/timeout/kick/ban/softban from the mod-panel modals.

Parses human duration strings such as `"5 minutes"`, `"2 weeks"`.

| | |
|---|---|
| **Command name** | `Message Deletion` |
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `softbanSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/softbanSystem` |

**Issues**

- 401 lines
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `modPanelButtonHandler.js`

`src/events/ModPanelEvents/modPanelButtonHandler.js` · **128 lines**

Mod-panel buttons → action modals.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |

---
