# prefix/Music

**21 files · 787 lines**

Prefix commands. Loaded by `src/functions/handlePrefix.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/messageCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#2-prefix-command--srcprefixcategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`play.js`](#playjs) | 80 | `play` | `Music` | ✗ | — |
| [`repeat.js`](#repeatjs) | 54 | `repeat` | `Music` | ✗ | — |
| [`skipto.js`](#skiptojs) | 44 | `skipto` | `Music` | ✗ | — |
| [`forward.js`](#forwardjs) | 43 | `forward` | `Music` | ✗ | — |
| [`pause.js`](#pausejs) | 42 | `pause` | `Music` | ✗ | — |
| [`rewind.js`](#rewindjs) | 42 | `rewind` | `Music` | ✗ | — |
| [`seek.js`](#seekjs) | 42 | `seek` | `Music` | ✗ | — |
| [`filters.js`](#filtersjs) | 39 | `filter` | `Music` | ✗ | — |
| [`resume.js`](#resumejs) | 38 | `resume` | `Music` | ✗ | — |
| [`skip.js`](#skipjs) | 38 | `skip` | `Music` | ✗ | — |
| [`volume.js`](#volumejs) | 36 | `volume` | `Music` | ✗ | — |
| [`join.js`](#joinjs) | 34 | `join` | `Music` | ✗ | — |
| [`queue.js`](#queuejs) | 31 | `queue` | `Music` | ✗ | — |
| [`autoplay.js`](#autoplayjs) | 30 | `autoplay` | `Music` | ✗ | — |
| [`nowplaying.js`](#nowplayingjs) | 30 | `nowplaying` | `Music` | ✗ | — |
| [`previous.js`](#previousjs) | 30 | `previous` | `Music` | ✗ | — |
| [`shuffle.js`](#shufflejs) | 30 | `shuffle` | `Music` | ✗ | — |
| [`stop.js`](#stopjs) | 30 | `stop` | `Music` | ✗ | — |
| [`playskip.js`](#playskipjs) | 26 | `playskip` | `Music` | ✗ | — |
| [`playtop.js`](#playtopjs) | 26 | `playtop` | `Music` | ✗ | — |
| [`leave.js`](#leavejs) | 22 | `leave` | `Music` | ✗ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 55 |
| `catch` blocks | 3 |

## Files

### `play.js`

`src/prefix/Music/play.js` · **80 lines**

`play` — play a song from YouTube or Spotify.

The entry point for the entire DisTube stack.

| | |
|---|---|
| **Command name** | `play` |
| **Aliases** | `p` |
| **Binds to** | `play` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../utils/loggingEffects`, `../../scripts/ytdlUpdater` |

**Issues**

- Error handling string-matches `'ytdl-core'` and can trigger a runtime `npm install`
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory
- `console.*` ×2 — should route through the logger

---

### `repeat.js`

`src/prefix/Music/repeat.js` · **54 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `repeat` |
| **Aliases** | `loop,rp` |
| **Binds to** | `repeat` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `skipto.js`

`src/prefix/Music/skipto.js` · **44 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `skipto` |
| **Aliases** | `st` |
| **Binds to** | `skipto` |
| **Export keys** | `name`, `inVoiceChannel`, `description`, `usage`, `category`, `aliases`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×4 — candidate for the shared embed factory
- `.then()` ×1 — mixed with async/await

---

### `forward.js`

`src/prefix/Music/forward.js` · **43 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `forward` |
| **Aliases** | `fwd` |
| **Binds to** | `forward` |
| **Export keys** | `name`, `inVoiceChannel`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `pause.js`

`src/prefix/Music/pause.js` · **42 lines**

`pause` — pause the current song.

| | |
|---|---|
| **Command name** | `pause` |
| **Aliases** | `pause,hold` |
| **Binds to** | `pause` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- Lists its own `name` as an alias
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `rewind.js`

`src/prefix/Music/rewind.js` · **42 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `rewind` |
| **Binds to** | `rewind` |
| **Export keys** | `name`, `inVoiceChannel`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `seek.js`

`src/prefix/Music/seek.js` · **42 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `seek` |
| **Binds to** | `seek` |
| **Export keys** | `name`, `inVoiceChannel`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×4 — candidate for the shared embed factory

---

### `filters.js`

`src/prefix/Music/filters.js` · **39 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `filter` |
| **Aliases** | `filters` |
| **Binds to** | `filter` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `resume.js`

`src/prefix/Music/resume.js` · **38 lines**

`resume` — resume playback.

| | |
|---|---|
| **Command name** | `resume` |
| **Aliases** | `resume,unpause` |
| **Binds to** | `resume` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- Lists its own `name` as an alias
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `skip.js`

`src/prefix/Music/skip.js` · **38 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `skip` |
| **Binds to** | `skip` |
| **Export keys** | `name`, `inVoiceChannel`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `volume.js`

`src/prefix/Music/volume.js` · **36 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `volume` |
| **Aliases** | `v,set,set-volume` |
| **Binds to** | `volume` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×3 — candidate for the shared embed factory

---

### `join.js`

`src/prefix/Music/join.js` · **34 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `join` |
| **Aliases** | `move` |
| **Binds to** | `join` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `queue.js`

`src/prefix/Music/queue.js` · **31 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `queue` |
| **Aliases** | `q` |
| **Binds to** | `queue` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `autoplay.js`

`src/prefix/Music/autoplay.js` · **30 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `autoplay` |
| **Aliases** | `ap` |
| **Binds to** | `autoplay` |
| **Export keys** | `name`, `inVoiceChannel`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `nowplaying.js`

`src/prefix/Music/nowplaying.js` · **30 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `nowplaying` |
| **Aliases** | `np` |
| **Binds to** | `nowplaying` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `previous.js`

`src/prefix/Music/previous.js` · **30 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `previous` |
| **Aliases** | `prev` |
| **Binds to** | `previous` |
| **Export keys** | `name`, `inVoiceChannel`, `usableInDms`, `aliases`, `description`, `usage`, `category`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `shuffle.js`

`src/prefix/Music/shuffle.js` · **30 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `shuffle` |
| **Aliases** | `shuff` |
| **Binds to** | `shuffle` |
| **Export keys** | `name`, `inVoiceChannel`, `aliases`, `description`, `usage`, `category`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `stop.js`

`src/prefix/Music/stop.js` · **30 lines**

`stop` — stop playback and leave.

| | |
|---|---|
| **Command name** | `stop` |
| **Aliases** | `disconnect,leave` |
| **Binds to** | `stop` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- **Its `leave` alias is permanently shadowed by `leave.js`'s own name** (finding 6)
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory

---

### `playskip.js`

`src/prefix/Music/playskip.js` · **26 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `playskip` |
| **Aliases** | `ps` |
| **Binds to** | `playskip` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `playtop.js`

`src/prefix/Music/playtop.js` · **26 lines**

_Structural entry — see the source for behavioural detail._

| | |
|---|---|
| **Command name** | `playtop` |
| **Aliases** | `pt` |
| **Binds to** | `playtop` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `inVoiceChannel`, `usableInDms`, `if` |
| **npm deps** | `discord.js` |

**Issues**

- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `leave.js`

`src/prefix/Music/leave.js` · **22 lines**

`leave` — leave the voice channel.

| | |
|---|---|
| **Command name** | `leave` |
| **Aliases** | `l` |
| **Binds to** | `leave` |
| **Export keys** | `name`, `aliases`, `description`, `usage`, `category`, `usableInDms` |
| **npm deps** | `discord.js` |

**Issues**

- Does not declare `inVoiceChannel` despite needing one
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
