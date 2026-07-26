# commands/HardModeration

**10 files · 879 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`warn.js`](#warnjs) | 283 | `/warn` | `Moderation` ⚠️ | ✗ | ✅ |
| [`antiLink.js`](#antilinkjs) | 133 | `/anti-link` | `Moderation` ⚠️ | ✗ | ✅ |
| [`modPanel.js`](#modpaneljs) | 125 | `/mod-panel` | `Moderation` ⚠️ | ✗ | ✅ |
| [`mute.js`](#mutejs) | 79 | `/mute` | `Moderation` ⚠️ | ✗ | ✅ |
| [`kick.js`](#kickjs) | 53 | `/kick` | `Moderation` ⚠️ | ✗ | ✅ |
| [`unmute.js`](#unmutejs) | 52 | `/unmute` | `Moderation` ⚠️ | ✗ | ✅ |
| [`ban.js`](#banjs) | 51 | `/ban` | `Moderation` ⚠️ | ✗ | ✅ |
| [`unban.js`](#unbanjs) | 45 | `/unban` | `Moderation` ⚠️ | ✗ | ✅ |
| [`lock.js`](#lockjs) | 29 | `/lock` | `Moderation` ⚠️ | ✗ | ✅ |
| [`unlock.js`](#unlockjs) | 29 | `/unlock` | `Moderation` ⚠️ | ✗ | ✅ |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `warningSystem`, `antiLinkSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 22 |
| `catch` blocks | 8 |

## Files

### `warn.js`

`src/commands/HardModeration/warn.js` · **283 lines**

`/warn` — subcommands `create`, `list`, `info`, `edit`, `clear`, `remove`.

Writes `warningSystem`, which stores a full edit history per warning.

| | |
|---|---|
| **Registers** | `/warn` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `warningSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/warningSystem`, `../../config` |

**Issues**

- 282 lines
- `execute (interaction)` — no `client` param
- `new EmbedBuilder()` ×7 — candidate for the shared embed factory

---

### `antiLink.js`

`src/commands/HardModeration/antiLink.js` · **133 lines**

`/anti-link` — subcommands `setup`, `disable`, `check`, `edit`.

| | |
|---|---|
| **Registers** | `/anti-link` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **Schemas** | `antiLinkSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/antiLinkSystem` |

**Issues**

- Unused `PermissionsBitField` import
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `modPanel.js`

`src/commands/HardModeration/modPanel.js` · **125 lines**

`/mod-panel` — an interactive moderation panel.

Lazily creates `client.modPanels`; buttons open modals handled by `modPanelButtonHandler.js` / `modPanelModalHandler.js`.

| | |
|---|---|
| **Registers** | `/mod-panel` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- Deprecated `fetchReply: true`
- **`checkSoftbans.js` unconditionally overwrites `client.modPanels`, wiping active panels**
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `.then()` ×1 — mixed with async/await

---

### `mute.js`

`src/commands/HardModeration/mute.js` · **79 lines**

`/mute` — timeout a member.

| | |
|---|---|
| **Registers** | `/mute` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- Same duplicated DM catch
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `kick.js`

`src/commands/HardModeration/kick.js` · **53 lines**

`/kick` — kick a user.

| | |
|---|---|
| **Registers** | `/kick` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- Unused `PermissionsBitField` import
- Same duplicated DM catch
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `unmute.js`

`src/commands/HardModeration/unmute.js` · **52 lines**

`/unmute` — remove a timeout.

| | |
|---|---|
| **Registers** | `/unmute` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- Same duplicated DM catch
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `ban.js`

`src/commands/HardModeration/ban.js` · **51 lines**

`/ban` — ban a user.

| | |
|---|---|
| **Registers** | `/ban` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- The 'failed to DM user' catch is byte-identical across ban/kick/mute/unmute
- Bot permissions never checked
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `unban.js`

`src/commands/HardModeration/unban.js` · **45 lines**

`/unban` — unban a user.

| | |
|---|---|
| **Registers** | `/unban` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- Unused `PermissionsBitField` import
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- loose `==` ×2
- `.then()` ×1 — mixed with async/await

---

### `lock.js`

`src/commands/HardModeration/lock.js` · **29 lines**

`/lock` — lock a channel.

The canonical minimal command with a `permissions` gate — used as the contract example in `02-CONTRACTS.md`.

| | |
|---|---|
| **Registers** | `/lock` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `unlock.js`

`src/commands/HardModeration/unlock.js` · **29 lines**

`/unlock` — unlock a channel.

| | |
|---|---|
| **Registers** | `/unlock` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
