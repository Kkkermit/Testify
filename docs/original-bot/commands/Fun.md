# commands/Fun

**8 files · 461 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`how.js`](#howjs) | 132 | `/how` | `Fun` | ✗ | — |
| [`hackUser.js`](#hackuserjs) | 98 | `/hack` | `Fun` | ✗ | — |
| [`pepeSign.js`](#pepesignjs) | 62 | `/pepe-sign` | `Fun` | ✅ | — |
| [`relationshipChecker.js`](#relationshipcheckerjs) | 50 | `/relationship-checker` | `Fun` | ✗ | — |
| [`ascii.js`](#asciijs) | 32 | `/ascii` | `Fun` | ✅ | — |
| [`nitro.js`](#nitrojs) | 32 | `/nitro` | `Fun` | ✅ | — |
| [`oogway.js`](#oogwayjs) | 30 | `/master-oogway` | `Fun` | ✅ | — |
| [`fakeTweet.js`](#faketweetjs) | 25 | `/fake-tweet` | `Fun` | ✗ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js`, `canvas`, `canvafy`, `figlet` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 11 |
| `catch` blocks | 1 |

## Files

### `how.js`

`src/commands/Fun/how.js` · **132 lines**

`/how` — subcommands `gay`, `sus`, `stupid`, `simp`, `drunk`, `high`, `smart`.

| | |
|---|---|
| **Registers** | `/how` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×7 — candidate for the shared embed factory

---

### `hackUser.js`

`src/commands/Fun/hackUser.js` · **98 lines**

`/hack` — a joke 'hacking' sequence.

Draws fake data from `jsons/hackUsers.json`, which contains realistic-looking UK addresses.

| | |
|---|---|
| **Registers** | `/hack` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../jsons/hackUsers.json` |

**Issues**

- Uses `node:timers/promises`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `pepeSign.js`

`src/commands/Fun/pepeSign.js` · **62 lines**

`/pepe-sign` — renders text on a Pepe sign.

| | |
|---|---|
| **Registers** | `/pepe-sign` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `canvas` |
| **Internal imports** | `../../jsons/filter.json` |
| **External URLs** | `https://i.postimg.cc/28bjZ4GW/pepesign.png` |

**Issues**

- Hotlinks a personal postimg upload
- Profanity filter re-implemented inline
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `relationshipChecker.js`

`src/commands/Fun/relationshipChecker.js` · **50 lines**

`/relationship-checker` — a canvafy 'ship' card.

| | |
|---|---|
| **Registers** | `/relationship-checker` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `canvafy`, `discord.js` |
| **Internal imports** | `../../utils/loggingEffects` |
| **External URLs** | `https://img.freepik.com/premium-vector/heart-cartoon-character-seamless-pattern-pink-background-pixel-style_618978-1727.jpg` |

**Issues**

- Hotlinks a freepik image
- `console.*` ×1 — should route through the logger

---

### `ascii.js`

`src/commands/Fun/ascii.js` · **32 lines**

`/ascii` — figlet text art.

| | |
|---|---|
| **Registers** | `/ascii` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `figlet` |
| **Internal imports** | `../../jsons/filter.json` |

**Issues**

- Profanity filter re-implemented inline
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `nitro.js`

`src/commands/Fun/nitro.js` · **32 lines**

`/nitro` — generates a fake Nitro gift link.

| | |
|---|---|
| **Registers** | `/nitro` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |
| **External URLs** | `http://discord.gift/` |

**Issues**

- `execute(interaction)` — no `client` param
- Emits a plain `http://discord.gift/` URL

---

### `oogway.js`

`src/commands/Fun/oogway.js` · **30 lines**

`/master-oogway` — an Oogway quote image.

| | |
|---|---|
| **Registers** | `/master-oogway` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../jsons/filter.json` |
| **External URLs** | `https://some-random-api.com/canvas/misc/oogway?quote=${encodeURIComponent(quote)}` |

**Issues**

- Profanity filter re-implemented inline
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `fakeTweet.js`

`src/commands/Fun/fakeTweet.js` · **25 lines**

`/fake-tweet` — renders a fake tweet image.

| | |
|---|---|
| **Registers** | `/fake-tweet` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../jsons/filter.json` |
| **External URLs** | `https://some-random-api.com/canvas/tweet?avatar=${avatarUrl}&displayname=${encodeURIComponent(user.username)}&username=${encodeURIComponent(user.username)}&comment=${encodeURIComponent(tweet)}` |

**Issues**

- Profanity filter re-implemented inline

---
