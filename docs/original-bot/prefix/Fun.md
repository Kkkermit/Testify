# prefix/Fun

**5 files · 173 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`relationshipChecker.js`](#relationshipcheckerjs) | 41 | `relationship-checker` | `Fun` | ✗ | — |
| [`iq.js`](#iqjs) | 37 | `iq` | `Fun` | ✅ | — |
| [`dadJoke.js`](#dadjokejs) | 33 | `dad-joke` | `Fun` | ✅ | — |
| [`ascii.js`](#asciijs) | 32 | `ascii` | `Fun` | ✅ | — |
| [`nitro.js`](#nitrojs) | 30 | `nitro` | `Fun` | ✅ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `canvafy`, `discord.js`, `figlet` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 3 |
| `catch` blocks | 0 |

## Files

### `relationshipChecker.js`

`src/prefix/Fun/relationshipChecker.js` · **41 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `relationship-checker` |
| **Aliases** | `ship,lovers,rc` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `canvafy` |
| **External URLs** | `https://img.freepik.com/premium-vector/heart-cartoon-character-seamless-pattern-pink-background-pixel-style_618978-1727.jpg` |

---

### `iq.js`

`src/prefix/Fun/iq.js` · **37 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `iq` |
| **Aliases** | `iqtest,iqscore` |
| **Binds to** | `iq` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `dadJoke.js`

`src/prefix/Fun/dadJoke.js` · **33 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `dad-joke` |
| **Aliases** | `dadjoke,dadj,dadjokes` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |
| **External URLs** | `https://icanhazdadjoke.com/` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `ascii.js`

`src/prefix/Fun/ascii.js` · **32 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `ascii` |
| **Aliases** | `ascii-art` |
| **Binds to** | `ascii` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js`, `figlet` |
| **Internal imports** | `../../jsons/filter.json` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `nitro.js`

`src/prefix/Fun/nitro.js` · **30 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `nitro` |
| **Aliases** | `nitrocode,nitrocodegen` |
| **Binds to** | `nitro` |
| **Export keys** | `name`, `aliases`, `description`, `category`, `usage`, `usableInDms` |
| **External URLs** | `http://discord.gift/` |

---
