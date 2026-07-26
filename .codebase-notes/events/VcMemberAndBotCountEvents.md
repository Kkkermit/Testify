# events/VcMemberAndBotCountEvents

**4 files · 86 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`totalBotsVoiceChannelAddEvent.js`](#totalbotsvoicechanneladdeventjs) | 22 | `GuildMemberAdd` | — |
| [`totalBotsVoiceChannelRemoveEvent.js`](#totalbotsvoicechannelremoveeventjs) | 22 | `GuildMemberRemove` | — |
| [`totalMembersVoiceChannelAddEvent.js`](#totalmembersvoicechanneladdeventjs) | 21 | `GuildMemberAdd` | — |
| [`totalMembersVoiceChannelRemoveEvent.js`](#totalmembersvoicechannelremoveeventjs) | 21 | `GuildMemberRemove` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `voiceChannelBotSystem`, `voiceChannelMembersSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 0 |
| `catch` blocks | 4 |

## Files

### `totalBotsVoiceChannelAddEvent.js`

`src/events/VcMemberAndBotCountEvents/totalBotsVoiceChannelAddEvent.js` · **22 lines**

Bot-count stat channel on join.

| | |
|---|---|
| **Registers** | `/• Total Bots: ${botsList}` |
| **Binds to** | `GuildMemberAdd` |
| **Export keys** | `name` |
| **Schemas** | `voiceChannelBotSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/voiceChannelBotSystem` |

**Issues**

- Same duplication and same broken catch

---

### `totalBotsVoiceChannelRemoveEvent.js`

`src/events/VcMemberAndBotCountEvents/totalBotsVoiceChannelRemoveEvent.js` · **22 lines**

The leave counterpart.

| | |
|---|---|
| **Registers** | `/• Total Bots: ${botsList1}` |
| **Binds to** | `GuildMemberRemove` |
| **Export keys** | `name` |
| **Schemas** | `voiceChannelBotSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/voiceChannelBotSystem` |

**Issues**

- Same duplication and same broken catch

---

### `totalMembersVoiceChannelAddEvent.js`

`src/events/VcMemberAndBotCountEvents/totalMembersVoiceChannelAddEvent.js` · **21 lines**

Renames the member-count stat channel on join.

| | |
|---|---|
| **Registers** | `/• Total Members: ${totalMembers}` |
| **Binds to** | `GuildMemberAdd` |
| **Export keys** | `name` |
| **Schemas** | `voiceChannelMembersSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/voiceChannelMembersSystem` |

**Issues**

- **`.catch(err)` where `err` is undefined — no handler at all** (finding 26)
- Misnamed: a `GuildMemberAdd` handler in a folder called `VcMemberAndBotCountEvents`

---

### `totalMembersVoiceChannelRemoveEvent.js`

`src/events/VcMemberAndBotCountEvents/totalMembersVoiceChannelRemoveEvent.js` · **21 lines**

The leave counterpart.

| | |
|---|---|
| **Registers** | `/• Total Members: ${totalMembers1}` |
| **Binds to** | `GuildMemberRemove` |
| **Export keys** | `name` |
| **Schemas** | `voiceChannelMembersSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/voiceChannelMembersSystem` |

**Issues**

- Byte-identical to the add variant apart from `1`-suffixed variables

---
