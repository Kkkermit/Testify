# commands/LightModeration

**12 files · 1,074 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`createEmbedThread.js`](#createembedthreadjs) | 150 | `/create` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`voiceChannelStats.js`](#voicechannelstatsjs) | 142 | `/members-vc` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`autoRole.js`](#autorolejs) | 124 | `/autorole` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`addEmojiAndSticker.js`](#addemojiandstickerjs) | 100 | `/add` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`slowMode.js`](#slowmodejs) | 87 | `/slow-mode` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`sticky.js`](#stickyjs) | 80 | `/sticky-message` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`welcomeSystem.js`](#welcomesystemjs) | 70 | `/welcome-system` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`clear.js`](#clearjs) | 67 | `/clear` | `Moderation` ⚠️ | ✗ | ✅ |
| [`announcement.js`](#announcementjs) | 66 | `/announce` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`role.js`](#rolejs) | 66 | `/role` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`botSendMessage.js`](#botsendmessagejs) | 64 | `/say` | `Server Utils` ⚠️ | ✗ | ✅ |
| [`changeNickname.js`](#changenicknamejs) | 58 | `/nick` | `Moderation` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `voiceChannelMembersSystem`, `voiceChannelBotSystem`, `autoRoleSystem`, `stickyMessageSystem`, `welcomeSystem` |
| npm dependencies | `discord.js`, `axios` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 20 |
| `catch` blocks | 16 |

## Files

### `createEmbedThread.js`

`src/commands/LightModeration/createEmbedThread.js` · **150 lines**

`/create` — subcommands `embed` and `thread`.

**19 options** — the widest option surface in the repo.

| | |
|---|---|
| **Registers** | `/create` |
| **Command name** | `${threadtitle}` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `execute(interaction)` — no `client` param
- Inlines a 60000 auto-delete
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `var` ×1

---

### `voiceChannelStats.js`

`src/commands/LightModeration/voiceChannelStats.js` · **142 lines**

`/members-vc` — subcommands `total-set`, `total-remove`, `bot-set`, `bot-remove`.

| | |
|---|---|
| **Registers** | `/members-vc` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `voiceChannelMembersSystem`, `voiceChannelBotSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/voiceChannelMembersSystem`, `../../schemas/voiceChannelBotSystem` |

**Issues**

- **`execute(interaction, client, err)`** — a third parameter the dispatcher never passes
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `autoRole.js`

`src/commands/LightModeration/autoRole.js` · **124 lines**

`/autorole` — subcommands `add`, `remove`, `disable`, `list`.

| | |
|---|---|
| **Registers** | `/autorole` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `autoRoleSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/autoRoleSystem` |

**Issues**

- Paired with `autoRoleEvent.js`, which has an `if (length < 0)` guard that is never true
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- loose `==` ×1

---

### `addEmojiAndSticker.js`

`src/commands/LightModeration/addEmojiAndSticker.js` · **100 lines**

`/add` — subcommands `emoji` and `sticker`.

| | |
|---|---|
| **Registers** | `/add` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js`, `axios` |
| **External URLs** | `https://cdn.discordapp.com/emojis/${id}.gif`<br>`https://cdn.discordapp.com/emojis/${id}.${type}?quality=lossless` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `.then()` ×2 — mixed with async/await

---

### `slowMode.js`

`src/commands/LightModeration/slowMode.js` · **87 lines**

`/slow-mode` — subcommands `set`, `off`, `check`.

| | |
|---|---|
| **Registers** | `/slow-mode` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `sticky.js`

`src/commands/LightModeration/sticky.js` · **80 lines**

`/sticky-message` — subcommands `setup`, `disable`, `check`.

| | |
|---|---|
| **Registers** | `/sticky-message` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `stickyMessageSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/stickyMessageSystem` |

**Issues**

- Paired with `stickyMessageEvent.js`, which does `await data.forEach(async …)` — the writes race
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- loose `==` ×1
- `var` ×2

---

### `welcomeSystem.js`

`src/commands/LightModeration/welcomeSystem.js` · **70 lines**

`/welcome-system` — subcommands `set` and `remove`.

| | |
|---|---|
| **Registers** | `/welcome-system` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `welcomeSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/welcomeSystem` |

**Issues**

- **The welcome card it configures never renders** — `guildMemberAddEvent.js` is permanently dead (finding 1)
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `clear.js`

`src/commands/LightModeration/clear.js` · **67 lines**

`/clear` — bulk-delete messages.

| | |
|---|---|
| **Registers** | `/clear` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data`, `if`, `while` |
| **npm deps** | `discord.js` |

**Issues**

- Unused `PermissionsBitField` import
- Category mismatch with its folder
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `.then()` ×2 — mixed with async/await
- commented-out lines ×2

---

### `announcement.js`

`src/commands/LightModeration/announcement.js` · **66 lines**

`/announce` — post a formatted announcement.

| | |
|---|---|
| **Registers** | `/announce` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `role.js`

`src/commands/LightModeration/role.js` · **66 lines**

`/role` — subcommands `add` and `remove`.

| | |
|---|---|
| **Registers** | `/role` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

**Rewrite note.** Merges with `prefix/LightModeration/{addRole,removeRole}.js`.

---

### `botSendMessage.js`

`src/commands/LightModeration/botSendMessage.js` · **64 lines**

`/say` — send a message as the bot.

| | |
|---|---|
| **Registers** | `/say` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- Inlines `time: 300000`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `changeNickname.js`

`src/commands/LightModeration/changeNickname.js` · **58 lines**

`/nick` — change a member's nickname.

| | |
|---|---|
| **Registers** | `/nick` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `category: "Moderation"` while the rest of the folder uses `"Server Utils"`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---
