# commands/Music

**2 files · 93 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`radio.js`](#radiojs) | 63 | `/radio` | `Music` | ✗ | — |
| [`textToSpeak.js`](#texttospeakjs) | 30 | `/tts` | `Music` | ✗ | ✅ |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | none |
| npm dependencies | `discord.js`, `@discordjs/voice` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 0 |

## Files

### `radio.js`

`src/commands/Music/radio.js` · **63 lines**

`/radio` — join a VC and stream a radio station.

| | |
|---|---|
| **Registers** | `/radio` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **npm deps** | `discord.js`, `@discordjs/voice` |
| **External URLs** | `http://lofi.stream.laut.fm/lofi?t302=2023-05-09_19-27-21&uuid=d646c9fa-d187-47d6-974c-adb3d6c36a66`<br>`https://streams.ilovemusic.de/iloveradio1.mp3`<br>`https://streams.ilovemusic.de/iloveradio2.mp3`<br>`https://streams.ilovemusic.de/iloveradio36.mp3`<br>`https://streams.ilovemusic.de/iloveradio103.mp3`<br>`https://streams.ilovemusic.de/iloveradio26.mp3` |

**Issues**

- **22 hardcoded stream URLs**, one of which is an expired session-bound lofi URL with a baked-in timestamp and UUID
- Unused `VoiceConnectionStatus` import
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---

### `textToSpeak.js`

`src/commands/Music/textToSpeak.js` · **30 lines**

`/tts` — text-to-speech.

| | |
|---|---|
| **Registers** | `/tts` |
| **Export keys** | `usableInDms`, `category`, `permissions`, `data` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../jsons/filter.json` |

**Issues**

- Unused `PermissionsBitField` import
- Profanity filter re-implemented inline
- `new EmbedBuilder()` ×1 — candidate for the shared embed factory

---
