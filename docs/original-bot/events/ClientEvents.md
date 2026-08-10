# events/ClientEvents

**1 files · 75 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`checkSoftbans.js`](#checksoftbansjs) | 75 | `ClientReady` | ✅ |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `softbanSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 0 |
| `catch` blocks | 3 |

## Files

### `checkSoftbans.js`

`src/events/ClientEvents/checkSoftbans.js` · **75 lines**

Polls for expired softbans and unbans.

Self-rescheduling 60-second `setTimeout`.

| | |
|---|---|
| **Binds to** | `ClientReady` (`once: true`) |
| **Export keys** | `name`, `once` |
| **Schemas** | `softbanSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/softbanSystem` |

**Issues**

- **Unconditionally overwrites `client.modPanels`, wiping active panels**
- The recursion cannot be cancelled — no handle is stored

---
