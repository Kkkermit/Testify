# commands/Spotify

**1 files · 177 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`spotifyCommands.js`](#spotifycommandsjs) | 177 | `/spotify` | `Spotify` | ✅ | — |

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `spotifyTrackerSystem` |
| npm dependencies | `dotenv`, `discord.js`, `canvacord` |
| Env vars read | `SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI` |
| `EmbedBuilder` instantiations | 2 |
| `catch` blocks | 1 |

## Files

### `spotifyCommands.js`

`src/commands/Spotify/spotifyCommands.js` · **177 lines**

`/spotify` — subcommands `login`, `stats`, `currently-playing`.

OAuth handled by the self-starting Express server in `src/server/`.

| | |
|---|---|
| **Registers** | `/spotify` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `spotifyTrackerSystem` |
| **npm deps** | `dotenv`, `discord.js`, `canvacord` |
| **Internal imports** | `../../api/spotifyTrackerApi`, `../../utils/createStatsEmbed`, `../../schemas/spotifyTrackerSystem` |
| **Env vars** | `SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI` |
| **External URLs** | `https://accounts.spotify.com/authorize?client_id=${process.env.SPOTIFY_CLIENT_ID}`<br>`https://i.scdn.co/image/${spotifyActivity.assets.largeImage.slice(8)}` |

**Issues**

- Reads `SPOTIFY_CLIENT_ID` / `SPOTIFY_REDIRECT_URI` directly
- **Custom-ID collision** — its `spotify-*` buttons are claimed by two handlers (finding 12)
- Tokens stored in plaintext
- `new EmbedBuilder()` ×2 — candidate for the shared embed factory
- `console.*` ×1 — should route through the logger

---
