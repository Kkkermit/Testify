# events/HelpCommandEvents

**1 files · 661 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`helpInteractions.js`](#helpinteractionsjs) | 661 | `InteractionCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 10 |
| `catch` blocks | 0 |

## Files

### `helpInteractions.js`

`src/events/HelpCommandEvents/helpInteractions.js` · **661 lines**

The entire help UI, for both `/help` and `t?help`.

Eight custom-ID branches across category selects, pagination and surface switching.

| | |
|---|---|
| **Command name** | `${isSlash ? ` |
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/helpCommandUtils.js` |
| **External URLs** | `https://i.postimg.cc/8CbGp6D5/Screenshot-300.png` |

**Issues**

- **661 lines**
- All state comes from the single global `client.helpData`
- Infers slash-vs-prefix mode by inspecting `interaction.message.components[0].components[0].customId`
- Six near-identical embed builders
- `new EmbedBuilder()` ×10 — candidate for the shared embed factory
- commented-out lines ×8

---
