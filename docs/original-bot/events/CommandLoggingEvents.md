# events/CommandLoggingEvents

**2 files · 93 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`prefixCommandLogging.js`](#prefixcommandloggingjs) | 47 | `MessageCreate` | — |
| [`slashCommandLogging.js`](#slashcommandloggingjs) | 46 | `InteractionCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | `webhookPrefixLogging`, `webhookSlashLogging` |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 2 |

## Files

### `prefixCommandLogging.js`

`src/events/CommandLoggingEvents/prefixCommandLogging.js` · **47 lines**

Mirrors prefix invocations to a webhook.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/getMessagePrefix.js` |
| **Env vars** | `webhookPrefixLogging` |

**Issues**

- Same lowercase env bug
- **Fires for non-existent commands too**
- Independently re-queries the prefix
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `slashCommandLogging.js`

`src/events/CommandLoggingEvents/slashCommandLogging.js` · **46 lines**

Mirrors slash invocations to a webhook.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |
| **Env vars** | `webhookSlashLogging` |

**Issues**

- **Reads `process.env.webhookSlashLogging`, which the setup script writes lowercase — silently disabled for most users** (finding 3)
- Constructs a `WebhookClient` per invocation
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
