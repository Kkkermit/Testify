# prefix/Community

**2 files · 99 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`meme.js`](#memejs) | 62 | `meme` | `Community` | ✅ | — |
| [`animalFacts.js`](#animalfactsjs) | 37 | `animalfacts` | `Community` | ✅ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js`, `axios` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 2 |

## Files

### `meme.js`

`src/prefix/Community/meme.js` · **62 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `meme` |
| **Binds to** | `meme` |
| **Export keys** | `name`, `usableInDms`, `description`, `usage`, `category` |
| **npm deps** | `discord.js`, `axios` |
| **External URLs** | `https://www.reddit.com/r/memes/hot.json?limit=100`<br>`https://www.reddit.com${memeData.permalink}` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `animalFacts.js`

`src/prefix/Community/animalFacts.js` · **37 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `animalfacts` |
| **Aliases** | `animal-facts,animal-fact,af` |
| **Binds to** | `animalfacts` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js`, `axios` |
| **External URLs** | `https://www.reddit.com/r/animalfacts1935943924/random/.json`<br>`https://www.reddit.com${memeData.permalink}` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
