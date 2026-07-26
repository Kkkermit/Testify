# events/CommandEvents

**19 files · 2,236 lines**

Event handlers. Loaded by `src/functions/handleEvents.js`, which binds each via `client.on`/`client.once` and **appends `client` as the trailing argument**. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#3-event--srceventsfolderfilejs).

## Overview

| File | Lines | Binds to | `once` |
|---|---:|---|---|
| [`handleLogsEvent.js`](#handlelogseventjs) | 752 | `—` | — |
| [`evalEvent.js`](#evaleventjs) | 250 | `InteractionCreate` | — |
| [`dbdRerollEvent.js`](#dbdrerolleventjs) | 223 | `InteractionCreate` | — |
| [`valorantSkinInfo.js`](#valorantskininfojs) | 140 | `InteractionCreate` | — |
| [`verifyUsersEvent.js`](#verifyuserseventjs) | 138 | `InteractionCreate` | — |
| [`minecraftRefreshButtonEvent.js`](#minecraftrefreshbuttoneventjs) | 96 | `InteractionCreate` | — |
| [`countingEvent.js`](#countingeventjs) | 78 | `MessageCreate` | — |
| [`levellingEvent.js`](#levellingeventjs) | 73 | `MessageCreate` | — |
| [`antiLinkEvent.js`](#antilinkeventjs) | 69 | `MessageCreate` | — |
| [`guildMemberAddEvent.js`](#guildmemberaddeventjs) | 69 | `GuildMemberAdd` | — |
| [`instaNotificationEvent.js`](#instanotificationeventjs) | 62 | `ClientReady` | — |
| [`spotifyButtonEvent.js`](#spotifybuttoneventjs) | 62 | `InteractionCreate` | — |
| [`aiChannelEvent.js`](#aichanneleventjs) | 59 | `MessageCreate` | — |
| [`spotifyTrackerEvent.js`](#spotifytrackereventjs) | 41 | `InteractionCreate` | — |
| [`stickyMessageEvent.js`](#stickymessageeventjs) | 32 | `MessageCreate` | — |
| [`musicPrefixHandleEvent.js`](#musicprefixhandleeventjs) | 30 | `MessageCreate` | — |
| [`verifyRemoveEvent.js`](#verifyremoveeventjs) | 29 | `GuildMemberRemove` | — |
| [`autoRoleEvent.js`](#autoroleeventjs) | 17 | `GuildMemberAdd` | — |
| [`createDefaultPrefixEvent.js`](#createdefaultprefixeventjs) | 16 | `GuildCreate` | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `auditLoggingSystem`, `verifySystem`, `verifyUsersSystem`, `countingSystem`, `userLevelSystem`, `levelSetupSystem`, `antiLinkSystem`, `warningSystem`, `welcomeSystem`, `instaNotificationSystem`, `spotifyTrackerSystem`, `aiChannelSystem`, `stickyMessageSystem`, `autoRoleSystem`, `prefixSystem` |
| npm dependencies | `discord.js`, `fs`, `path`, `util`, `node-fetch`, `canvas`, `apexify.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 50 |
| `catch` blocks | 51 |

## Files

### `handleLogsEvent.js`

`src/events/CommandEvents/handleLogsEvent.js` · **752 lines**

**Not an event module** — exports `{ handleLogs }`, called from `index.js` after login.

Registers ~36 `client.on` listeners for `discord-logs` synthetic events, each looking up `auditLoggingSystem` and posting an embed.

| | |
|---|---|
| **Schemas** | `auditLoggingSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/auditLoggingSystem` |

**Issues**

- **752 lines — the 3rd largest file**
- Because it lives under `src/events/`, the loader also registers `client.on(undefined, …)` — a permanently dead listener
- Contains an empty no-op handler for `guildMemberVoiceStateUpdate`
- `new EmbedBuilder()` ×34 — candidate for the shared embed factory
- commented-out lines ×37

**Rewrite note.** Move out of `src/events/`; split by domain.

---

### `evalEvent.js`

`src/events/CommandEvents/evalEvent.js` · **250 lines**

Handles the `/eval` modal.

Scans for token/Mongo leakage and requires confirmation for risky code.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js`, `fs`, `path`, `util` |
| **Internal imports** | `../../utils/loggingEffects.js` |

**Issues**

- Holds arbitrary user code in a module-scope `Map` that leaks if the user never clicks
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

---

### `dbdRerollEvent.js`

`src/events/CommandEvents/dbdRerollEvent.js` · **223 lines**

`dbd_reroll_<role>` — recomposites a perk collage.

| | |
|---|---|
| **Registers** | `/random_perks_collage.png` |
| **Command name** | `${index + 1}. ${perk.category} __${perk.name}__` |
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js`, `node-fetch`, `canvas` |
| **Internal imports** | `../../images` |
| **External URLs** | `https://dbd.tricky.lol/api/randomperks?role=${encodeURIComponent(role)}` |

**Issues**

- **Requires undeclared `node-fetch`; v3 is ESM-only, so this `require` would throw at load and take down the whole event loader** (finding 13)
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×3 — should route through the logger

---

### `valorantSkinInfo.js`

`src/events/CommandEvents/valorantSkinInfo.js` · **140 lines**

Skin preview / chroma / level buttons.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name`, `if`, `switch` |
| **npm deps** | `discord.js` |

**Issues**

- **Mixed `-` and `_` separators in one ID scheme**
- Dereferences `client.skins`, which is `null` if the API fetch failed
- loose `==` ×1

---

### `verifyUsersEvent.js`

`src/events/CommandEvents/verifyUsersEvent.js` · **138 lines**

Captcha generation and validation.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `verifySystem`, `verifyUsersSystem` |
| **npm deps** | `discord.js`, `canvas` |
| **Internal imports** | `../../schemas/verifySystem`, `../../schemas/verifyUsersSystem` |

**Issues**

- **No interaction-type guard at all before reading `customId`**
- Unnamespaced IDs: `verify`, `captchaenter`, `vermodal`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `.then()` ×1 — mixed with async/await

---

### `minecraftRefreshButtonEvent.js`

`src/events/CommandEvents/minecraftRefreshButtonEvent.js` · **96 lines**

Re-queries a Minecraft server and rebuilds the embed.

| | |
|---|---|
| **Command name** | `🎮 How to Join` |
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |
| **External URLs** | `https://api.mcsrvstat.us/2/${ip}`<br>`https://api.mcsrvstat.us/icon/${ip}` |

**Issues**

- Uses global `fetch` while `dbdRerollEvent.js` uses `node-fetch` — inconsistent
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `countingEvent.js`

`src/events/CommandEvents/countingEvent.js` · **78 lines**

The counting game.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **Schemas** | `countingSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/countingSystem` |

**Issues**

- **No race protection — concurrent messages double-increment** (finding 33)
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `levellingEvent.js`

`src/events/CommandEvents/levellingEvent.js` · **73 lines**

Awards XP per message.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name`, `if` |
| **Schemas** | `userLevelSystem`, `levelSetupSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/userLevelSystem`, `../../schemas/levelSetupSystem` |

**Issues**

- **Double-credits — adds `give * multiplier` and then `give` again** (finding 25)
- No per-user cooldown, so XP is trivially farmable
- Uses the removed Mongoose callback API

---

### `antiLinkEvent.js`

`src/events/CommandEvents/antiLinkEvent.js` · **69 lines**

Deletes messages containing links.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **Schemas** | `antiLinkSystem`, `warningSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/antiLinkSystem`, `../../schemas/warningSystem` |

**Issues**

- Substring URL heuristic
- **Hardcoded executor ID and tag**
- Removed Mongoose callback API
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `guildMemberAddEvent.js`

`src/events/CommandEvents/guildMemberAddEvent.js` · **69 lines**

Canvas welcome card on member join.

| | |
|---|---|
| **Binds to** | `GuildMemberAdd` |
| **Export keys** | `name` |
| **Schemas** | `welcomeSystem` |
| **npm deps** | `discord.js`, `canvas` |
| **Internal imports** | `../../schemas/welcomeSystem`, `../../config`, `../../lib/addSuffix` |
| **External URLs** | `https://i.postimg.cc/DwNqcd3K/Testi-9.png` |

**Issues**

- **PERMANENTLY DEAD** — `execute(member, message)` receives the Client as `message`, so the guard always returns (finding 1)
- Also calls `canvas.context`, which does not exist
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `instaNotificationEvent.js`

`src/events/CommandEvents/instaNotificationEvent.js` · **62 lines**

Polls Instagram every 15 minutes.

| | |
|---|---|
| **Binds to** | `ClientReady` |
| **Export keys** | `name` |
| **Schemas** | `instaNotificationSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/instaNotificationSystem`, `../../api/instagramApi`, `../../utils/loggingEffects` |
| **External URLs** | `https://www.instagram.com/p/${latestPost.shortcode}` |

**Issues**

- Not `once` — stacks on re-identify
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `spotifyButtonEvent.js`

`src/events/CommandEvents/spotifyButtonEvent.js` · **62 lines**

`spotify-<type>-<userId>-<timeRange>` — re-renders top items.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `spotifyTrackerSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects.js`, `../../api/spotifyTrackerApi.js`, `../../utils/createStatsEmbed.js`, `../../schemas/spotifyTrackerSystem.js` |

**Issues**

- **Collides with `spotifyTrackerEvent.js` via `startsWith('spotify-')` → `InteractionAlreadyReplied`** (finding 12)
- `console.*` ×1 — should route through the logger

---

### `aiChannelEvent.js`

`src/events/CommandEvents/aiChannelEvent.js` · **59 lines**

Responds in configured AI channels.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **Schemas** | `aiChannelSystem` |
| **npm deps** | `discord.js`, `apexify.js` |
| **Internal imports** | `../../schemas/aiChannelSystem`, `../../jsons/filter.json` |

**Issues**

- **`const chatResponse` is reassigned → `TypeError` whenever the model returns `@here`/`@everyone`** (finding 11)
- `console.error` bypasses `client.logs`
- `console.*` ×1 — should route through the logger

---

### `spotifyTrackerEvent.js`

`src/events/CommandEvents/spotifyTrackerEvent.js` · **41 lines**

Exact-match handler for `spotify-tracks` / `-artists` / `-albums`.

| | |
|---|---|
| **Binds to** | `InteractionCreate` |
| **Export keys** | `name` |
| **Schemas** | `spotifyTrackerSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../api/spotifyTrackerApi`, `../../utils/createStatsEmbed`, `../../schemas/spotifyTrackerSystem` |

**Issues**

- **The other half of the collision above**
- `execute(interaction)` — no `client` param
- `console.*` ×1 — should route through the logger

---

### `stickyMessageEvent.js`

`src/events/CommandEvents/stickyMessageEvent.js` · **32 lines**

Re-posts sticky messages.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **Schemas** | `stickyMessageSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/stickyMessageSystem` |

**Issues**

- **`await data.forEach(async …)` — `forEach` is not awaitable; the writes race** (finding 32)
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- loose `==` ×2
- `var` ×1

---

### `musicPrefixHandleEvent.js`

`src/events/CommandEvents/musicPrefixHandleEvent.js` · **30 lines**

Intended 'must be in a VC' pre-check for music commands.

| | |
|---|---|
| **Binds to** | `MessageCreate` |
| **Export keys** | `name` |
| **npm deps** | `discord.js` |

**Issues**

- **Uses the global `config.prefix`, so it silently no-ops in any guild with a custom prefix** (finding 5)
- `try { } catch { … ${error} }` — empty try, unbound `error`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `verifyRemoveEvent.js`

`src/events/CommandEvents/verifyRemoveEvent.js` · **29 lines**

Cleans verification records when a member leaves.

**The cleanest file in the folder** — proper optional chaining and error handling.

| | |
|---|---|
| **Binds to** | `GuildMemberRemove` |
| **Export keys** | `name` |
| **Schemas** | `verifySystem`, `verifyUsersSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/verifySystem`, `../../schemas/verifyUsersSystem` |

**Issues**

- `console.*` ×1 — should route through the logger

---

### `autoRoleEvent.js`

`src/events/CommandEvents/autoRoleEvent.js` · **17 lines**

Applies auto-roles on join.

| | |
|---|---|
| **Binds to** | `GuildMemberAdd` |
| **Export keys** | `name` |
| **Schemas** | `autoRoleSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/autoRoleSystem` |

**Issues**

- **`if (data.Roles.length < 0) return;` — never true** (finding 31)

---

### `createDefaultPrefixEvent.js`

`src/events/CommandEvents/createDefaultPrefixEvent.js` · **16 lines**

Intended to seed a default guild prefix on join.

| | |
|---|---|
| **Binds to** | `GuildCreate` |
| **Export keys** | `name` |
| **Schemas** | `prefixSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../schemas/prefixSystem` |

**Issues**

- **PERMANENTLY DEAD** — same signature defect (finding 2). This event has never run.

---
