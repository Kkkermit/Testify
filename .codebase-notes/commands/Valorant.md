# commands/Valorant

**1 files · 283 lines**

Slash commands. Loaded by `src/functions/handleCommands.js`, dispatched by `src/events/SlashAndPrefixCreateEvents/interactionCreate.js`. Contract in [`../02-CONTRACTS.md`](../02-CONTRACTS.md#1-slash-command--srccommandscategorynamejs).

## Overview

| File | Lines | Command | Declared `category` | DMs | Perms |
|---|---:|---|---|---|---|
| [`valorantCommands.js`](#valorantcommandsjs) | 283 | `/valorant` | `Community` ⚠️ | ✅ | — |

> ⚠️ = the declared `category` string does not match this folder name. `category` is a free-form string with no enum; `/help` groups by the string, not the folder. See [`../02-CONTRACTS.md`](../02-CONTRACTS.md).

## Category signals

| Signal | Value |
|---|---|
| Schemas touched | `valorantUserSystem` |
| npm dependencies | `discord.js` |
| Env vars read | none |
| `EmbedBuilder` instantiations | 4 |
| `catch` blocks | 1 |

## Files

### `valorantCommands.js`

`src/commands/Valorant/valorantCommands.js` · **283 lines**

`/valorant` — subcommands `login`, `search-skin`, `store`, `reload`. Has `autocomplete`.

| | |
|---|---|
| **Registers** | `/valorant` |
| **Export keys** | `usableInDms`, `category`, `data` |
| **Schemas** | `valorantUserSystem` |
| **npm deps** | `discord.js` |
| **Internal imports** | `../../api/valorantApi`, `../../schemas/valorantUserSystem`, `../../images` |
| **External URLs** | `https://i.postimg.cc/RVzrNstM/arnsfh.webp`<br>`https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid`<br>`https://val-skin-price.vercel.app/beta/skins/` |

**Issues**

- 283 lines
- Two full hardcoded Riot OAuth URLs
- `category: "Community"` while the folder is `Valorant`
- Riot tokens stored in plaintext
- Owner check duplicated inline
- `new EmbedBuilder()` ×4 — candidate for the shared embed factory
- loose `==` ×3

---
