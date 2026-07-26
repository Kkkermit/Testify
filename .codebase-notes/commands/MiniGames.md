# commands/MiniGames

**3 files · 598 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`minigame.js`](#minigamejs) | 509 | `/minigame` | `Mini Games` | ✅ | — |
| [`fastType.js`](#fasttypejs) | 55 | `/fast-type` | `Mini Games` | ✅ | — |
| [`guessThePokemon.js`](#guessthepokemonjs) | 34 | `/guess-the-pokemon` | `Mini Games` | ✅ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js`, `discord-gamecord` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 3 |
| `catch` blocks | 16 |

## Files

### `minigame.js`

`src/commands/MiniGames/minigame.js` · **509 lines**

`/minigame` — **14 subcommands**: wordle, connect4, 2048, minesweeper, rps, snake, tictactoe, match-pairs, hangman, flood, find-emoji, would-you-rather, slots, trivia.

| | |
|---|---|
| **Registers** | `/minigame` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `discord-gamecord` |
| **Internal imports** | `../../jsons/wouldYouRather.json` |

**Issues**

- 509 lines
- **14 untyped `discord-gamecord` classes**, each with a bespoke options object
- `timeoutTime` repeated 14×
- `new EmbedBuilder()` ×3 — candidate for the shared embed factory
- `console.*` ×14 — should route through the logger

**Rewrite note.** Needs a hand-written `.d.ts`; see `11-TYPED-CONTRACTS.md` §7.

---

### `fastType.js`

`src/commands/MiniGames/fastType.js` · **55 lines**

`/fast-type` — typing race (discord-gamecord).

| | |
|---|---|
| **Registers** | `/fast-type` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `discord-gamecord` |

**Issues**

- `console.*` ×1 — should route through the logger

---

### `guessThePokemon.js`

`src/commands/MiniGames/guessThePokemon.js` · **34 lines**

`/guess-the-pokemon` — (discord-gamecord).

| | |
|---|---|
| **Registers** | `/guess-the-pokemon` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `discord-gamecord` |

**Issues**

- `console.*` ×1 — should route through the logger

---
