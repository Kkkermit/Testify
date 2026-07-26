# commands/Community

**11 files · 2,642 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`clashRoyale.js`](#clashroyalejs) | 1301 | `/clash-royale` | `Community` | ✅ | — |
| [`dbd.js`](#dbdjs) | 726 | `/dbd` | `Community` | ✅ | — |
| [`calculator.js`](#calculatorjs) | 161 | `/calculator` | `Community` | ✅ | — |
| [`minecraftInfo.js`](#minecraftinfojs) | 118 | `/minecraft` | `Community` | ✅ | — |
| [`translate.js`](#translatejs) | 75 | `/translate` | `Community` | ✅ | — |
| [`meme.js`](#memejs) | 62 | `/meme` | `Community` | ✅ | — |
| [`lyrics.js`](#lyricsjs) | 56 | `/lyrics` | `Community` | ✅ | — |
| [`wiki.js`](#wikijs) | 41 | `/wiki` | `Community` | ✅ | — |
| [`impersonate.js`](#impersonatejs) | 38 | `/impersonate` | `Community` | ✗ | ✅ |
| [`animalFacts.js`](#animalfactsjs) | 36 | `/animal-facts` | `Community` | ✅ | — |
| [`advice.js`](#advicejs) | 28 | `/advice` | `Community` | ✅ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js`, `canvas`, `axios`, `node-fetch`, `mathjs`, `@iamtraction/google-translate`, `superagent`, `wikijs` |
| Env vars read | `CLASH_ROYAL_API_KEY` |
| `EmbedBuilder` instantiations | 28 |
| `catch` blocks | 28 |

## Files

### `clashRoyale.js`

`src/commands/Community/clashRoyale.js` · **1301 lines**

`/clash-royale` — subcommands `player`, `clan-info`, `card-info`, `recent-player-battles`. Has `autocomplete`.

30+ module-level helpers plus node-canvas image composition, including a custom `roundRect(ctx, …)`.

| | |
|---|---|
| **Registers** | `/clash-royale` |
| **Command name** | `🛡️ Player Clan` |
| **Export keys** | `usableInDms`, `category`, `data`, `if` |
| **npm deps** | `discord.js`, `canvas`, `axios` |
| **Env vars** | `CLASH_ROYAL_API_KEY` |
| **External URLs** | `https://api.clashroyale.com/v1/cards`<br>`https://play-lh.googleusercontent.com/rIvZQ_H3hfmexC8vurmLczLtMNBFtxCEdmb2NwkSPz2ZuJJ5nRPD0HbSJ7YTyFGdADQ`<br>`https://api.clashroyale.com/v1/players/${encodedTag}`<br>`https://api.clashroyale.com/v1/clans/${encodedTag}`<br>`https://api.clashroyale.com/v1/players/${encodedTag}/battlelog`<br>`https://static.wikia.nocookie.net/clashroyale/images/1/16/War_Shield.png/revision/latest?cb=20180425130200` |

**Issues**

- **1,301 lines — the largest file in the repo**
- 5 reads of `process.env.CLASH_ROYAL_API_KEY` (note the `ROYAL` typo)
- Every axios response consumed untyped
- `CACHE_DURATION` is the one named time constant in the codebase
- `new EmbedBuilder()` ×12 — candidate for the shared embed factory

**Rewrite note.** Split into an API client (with 4 response interfaces), a canvas renderer, and 4 thin subcommand handlers.

---

### `dbd.js`

`src/commands/Community/dbd.js` · **726 lines**

`/dbd` — subcommands `perkinfo`, `playerstats`, `randomperks`, `shrine`. Has `autocomplete`.

Composes a canvas perk grid from ~330 local PNGs; queries `dbd.tricky.lol`.

| | |
|---|---|
| **Registers** | `/dbd` |
| **Command name** | `⚖️ __Role__` |
| **Export keys** | `usableInDms`, `category`, `data`, `if` |
| **npm deps** | `discord.js`, `node-fetch`, `canvas` |
| **Internal imports** | `../../images`, `../../jsons/dbdPerks.json`, `../../utils/dbdPerkHelper` |
| **External URLs** | `https://dbd.tricky.lol/api/perkinfo?perk=${encodeURIComponent(perkKey)}`<br>`https://dbd.tricky.lol/api/playerstats?steamid=${encodeURIComponent(steamId)}`<br>`https://dbd.tricky.lol/\`<br>`https://dbd.tricky.lol/`<br>`https://cdn.nightlight.gg/img/portraits/iconPortraits_default.png`<br>`https://cdn.nightlight.gg/img/portraits/iconPortraits_TR.png` |

**Issues**

- 726 lines
- Requires undeclared `node-fetch`
- Linear scan over a 200 KB JSON per lookup
- `new EmbedBuilder()` ×6 — candidate for the shared embed factory
- `console.*` ×7 — should route through the logger

**Rewrite note.** Map-index the perk DB; lazy asset loading; typed API responses.

---

### `calculator.js`

`src/commands/Community/calculator.js` · **161 lines**

`/calculator` — button-grid calculator built on mathjs.

A 10-minute component collector.

| | |
|---|---|
| **Registers** | `/calculator` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `mathjs` |

**Issues**

- Inlines `time: 600000`
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- loose `==` ×2

---

### `minecraftInfo.js`

`src/commands/Community/minecraftInfo.js` · **118 lines**

`/minecraft` — subcommands `skin` and `server`.

Emits a `minecraft-refresh_<ip>` button handled by `minecraftRefreshButtonEvent.js`.

| | |
|---|---|
| **Registers** | `/minecraft` |
| **Command name** | `🎮 How to Join` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js` |
| **External URLs** | `https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/img/menu/menu-buy--reversed.gif`<br>`https://minotar.net/armor/body/${username}/300.png`<br>`https://api.mcsrvstat.us/2/${ip}`<br>`https://api.mcsrvstat.us/icon/${ip}` |

**Issues**

- Mixed `-`/`_` separators in the custom ID
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `translate.js`

`src/commands/Community/translate.js` · **75 lines**

`/translate` — translate text.

| | |
|---|---|
| **Registers** | `/translate` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `@iamtraction/google-translate` |

**Issues**

- Requires **undeclared** `@iamtraction/google-translate`
- No published types
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `meme.js`

`src/commands/Community/meme.js` · **62 lines**

`/meme` — random post from r/memes hot.

| | |
|---|---|
| **Registers** | `/meme` |
| **Export keys** | `usableInDms`, `category`, `data`, `if` |
| **npm deps** | `discord.js`, `axios` |
| **External URLs** | `https://www.reddit.com/r/memes/hot.json?limit=100`<br>`https://www.reddit.com${memeData.permalink}` |

**Issues**

- Untyped Reddit response
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `lyrics.js`

`src/commands/Community/lyrics.js` · **56 lines**

`/lyrics` — lyrics lookup.

| | |
|---|---|
| **Registers** | `/lyrics` |
| **Command name** | `Lyrics:` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `superagent` |
| **External URLs** | `https://some-random-api.com/lyrics?title=${song}` |

**Issues**

- Requires undeclared `superagent`
- Reads `process.env.rapidapikey`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---

### `wiki.js`

`src/commands/Community/wiki.js` · **41 lines**

`/wiki` — Wikipedia lookup.

| | |
|---|---|
| **Registers** | `/wiki` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `wikijs` |
| **Internal imports** | `../../jsons/filter.json` |

**Issues**

- Profanity filter re-implemented inline
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `impersonate.js`

`src/commands/Community/impersonate.js` · **38 lines**

`/impersonate` — speak through a webhook.

| | |
|---|---|
| **Registers** | `/impersonate` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../jsons/filter.json` |

**Issues**

- **`permissions: [PermissionFlagsBits.createWebhook]` — wrong casing, resolves to `undefined` and crashes the permission gate** (finding 9)
- Profanity filter re-implemented inline
- `.then()` ×1 — mixed with async/await

---

### `animalFacts.js`

`src/commands/Community/animalFacts.js` · **36 lines**

`/animal-facts` — random fact from a Reddit listing.

| | |
|---|---|
| **Registers** | `/animal-facts` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `axios` |
| **External URLs** | `https://www.reddit.com/r/animalfacts1935943924/random/.json`<br>`https://www.reddit.com${memeData.permalink}` |

**Issues**

- Untyped Reddit response
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `advice.js`

`src/commands/Community/advice.js` · **28 lines**

`/advice` — random advice from adviceslip.

| | |
|---|---|
| **Registers** | `/advice` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `node-fetch` |
| **External URLs** | `https://api.adviceslip.com/advice` |

**Issues**

- Requires undeclared `node-fetch`
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory
- `.then()` ×1 — mixed with async/await

**Rewrite note.** Global `fetch`.

---
