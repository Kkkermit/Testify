# commands/Tickets

**1 files · 97 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`ticket.js`](#ticketjs) | 97 | `/ticket` | `Server Utils` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `ticketSetupSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 3 |
| `catch` blocks | 3 |

## Files

### `ticket.js`

`src/commands/Tickets/ticket.js` · **97 lines**

`/ticket` — set up the ticket panel.

The panel button ID is **stored in the database**, so a guild admin can register an ID that shadows a built-in one.

| | |
|---|---|
| **Registers** | `/ticket` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `ticketSetupSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/ticketSetupSystem` |

**Issues**

- `category: "Server Utils"`
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---
