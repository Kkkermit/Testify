# 06 — Environment, Configuration & Secrets

Covers every `process.env` variable, the three competing `.env` loaders, `src/config.js`, and the
naming bugs that silently disable features today.

---

## 1. Complete `process.env` inventory

20 distinct variables are referenced across `src/`.

| Variable | Read at | Required? | In `.example.env`? | Notes |
|---|---|---|---|---|
| `token` | `src/index.js`, `src/functions/handleCommands.js`, `src/__tests__/setup.js` | **Yes — boot fails** | ✅ | Bot cannot start without it. |
| `clientid` | `src/functions/handleCommands.js`, `src/commands/Automod/automod.js` (×4) | **Yes — command registration fails** | ✅ | all-lowercase. |
| `clientId` | `src/__tests__/setup.js` only | — | ❌ | **camelCase — does not match `clientid`.** See §3.1. |
| `guildid` | `src/functions/handleCommands.js` (assigned, never read), `src/__tests__/setup.js` | No | ✅ | **Dead.** Only global command registration is used. |
| `devid` | `src/events/GuildCreateDeleteEvents/guildCreate.js`, `guildDelete.js` | No | ✅ | |
| `mongodb` | `src/events/ReadyEvents/ready.js`, `src/scripts/wipeDatabase.js` | **Yes — all persistence fails** | ✅ | Connection string incl. credentials. |
| `movietrackerapi` | `src/commands/InfoCommands/movieInfo.js` | Feature-gated | ✅ | TMDB. |
| `rapidapikey` | `src/commands/Community/lyrics.js`, `src/__tests__/setup.js` | Feature-gated | ✅ | |
| `webhookSlashLogging` | `src/events/CommandLoggingEvents/slashCommandLogging.js` | Feature-gated | ✅ | **Broken by the generator — §3.2.** |
| `webhookPrefixLogging` | `src/events/CommandLoggingEvents/prefixCommandLogging.js` | Feature-gated | ✅ | **Broken by the generator.** |
| `webhookBugLogging` | `src/commands/Devs/bugReport.js` | Feature-gated | ✅ | **Broken by the generator.** |
| `webhookSuggestionLogging` | `src/commands/Devs/suggestion.js` | Feature-gated | ✅ | **Broken by the generator.** |
| `LOG_WEBHOOK_URL` | `src/utils/setupLoggers.js`, `src/scripts/consoleLogger.js` | No | ✅ | Mirrors all console output to Discord. |
| `SPOTIFY_CLIENT_ID` | `src/server/server.js` | Feature-gated | ✅ | |
| `SPOTIFY_CLIENT_SECRET` | `src/server/server.js` | Feature-gated | ✅ | |
| `SPOTIFY_REDIRECT_URI` | `src/server/server.js` (read **and written at runtime**) | Feature-gated | ✅ | See §3.4. |
| `PORT` | `src/server/server.js` | No (defaults) | ✅ | |
| `NGROK_AUTH_TOKEN` | `src/server/server.js` | Feature-gated | ✅ | |
| `CLASH_ROYAL_API_KEY` | `src/commands/Community/clashRoyale.js` (×5) | Feature-gated | ✅ | **Typo: `ROYAL`, not `ROYALE`.** Preserve the typo or migrate deliberately. |
| `NODE_ENV` | `src/scripts/bootMode.js`, `src/__tests__/setup.js` | No | ❌ | Set by `cross-env` in npm scripts. |

### Naming conventions — three of them, simultaneously

- **all-lowercase**: `token`, `clientid`, `guildid`, `devid`, `mongodb`, `movietrackerapi`, `rapidapikey`
- **camelCase**: `webhookSlashLogging`, `webhookPrefixLogging`, `webhookBugLogging`, `webhookSuggestionLogging`
- **SCREAMING_SNAKE**: `LOG_WEBHOOK_URL`, `SPOTIFY_*`, `PORT`, `NGROK_AUTH_TOKEN`, `CLASH_ROYAL_API_KEY`, `NODE_ENV`

On Linux and macOS `process.env` is **case-sensitive**, which is what makes §3.1 and §3.2 real bugs rather than
cosmetic ones.

---

## 2. The three competing `.env` loaders

Environment loading happens **three times** during a single boot, from three different paths:

| Order | Site | Path used | Correct? |
|---|---|---|---|
| 1 | `src/scripts/bootMode.js` — invoked from `src/index.js` | `.env.development` when `NODE_ENV=development`, else `.env` | ✅ The intended loader |
| 2 | `src/index.js` — `require('dotenv').config()` | dotenv default (CWD `.env`) | ⚠️ Redundant |
| 3 | `src/server/server.js` — `require('dotenv').config({ path: '../../../.env' })` | **Three levels above the repo root** | ❌ Points outside the project entirely |

Loader 3 resolves to a path that does not exist. It appears to work only because loaders 1 and 2 already
populated `process.env`, and `dotenv` never overwrites existing keys.

**Naming trap:** the committed example file is `.development.example.env`, but `bootMode.js` looks for
**`.env.development`**. Anyone following the filename pattern of the example will produce a file the loader
ignores, and the bot will silently fall back to production config.

### Rewrite action
One `src/core/env.ts` that loads exactly once, validates with a schema (Zod/Valibot/`envalid`), throws on missing
required vars at boot rather than failing deep inside a command, and exports a typed frozen object. Every
`process.env.X` read elsewhere becomes `env.X`.

---

## 3. Environment bugs

### 3.1 `clientid` vs `clientId` — the test stub is ineffective
`src/__tests__/setup.js` sets `process.env.clientId` (camelCase). Production code reads
`process.env.clientid` (lowercase) in `src/functions/handleCommands.js` and `src/commands/Automod/automod.js`.
The two never meet, so the test environment does not actually stub what the code reads.

### 3.2 `setupEnvFile.js` writes keys the code never reads — **four features silently dead**
`src/scripts/setupEnvFile.js` writes the four webhook keys **all-lowercase**:

```
webhookslashlogging=      ← written by the generator
webhookprefixlogging=
webhookbuglogging=
webhooksuggestionlogging=
```

but the code reads them **camelCase** (`process.env.webhookSlashLogging`, …). The result: **anyone who sets up
their `.env` using the documented `npm run setup-env:prod` flow gets slash-command logging, prefix-command
logging, bug reports and suggestions silently disabled.** They are `undefined`, no error is raised, and the
features simply never fire. This is the highest-impact configuration bug in the repo.

The same script also performs **no quoting or escaping** of entered values, so a password or connection string
containing `#`, a newline or a quote produces a malformed `.env`.

### 3.3 `.example.env` is incomplete and `postInstallation.js` is stale
`src/scripts/postInstallation.js` prints the installation guide but documents only the seven original variables
(`token`, `clientid`, `guildid`, `devid`, `mongodb`, `movietrackerapi`, `rapidapikey`). It never mentions the
Spotify trio, `PORT`, `NGROK_AUTH_TOKEN`, `CLASH_ROYAL_API_KEY` or `LOG_WEBHOOK_URL`. It also instructs the user
to run **`npm run start`, a script that does not exist** — the real one is `npm run prod`.

### 3.4 `SPOTIFY_REDIRECT_URI` is mutated at runtime
`src/server/server.js` **assigns** `process.env.SPOTIFY_REDIRECT_URI = \`${url}/callback\`` after ngrok connects,
while another line **reads** it during the token exchange. Whether the read sees the ngrok URL or the `.env`
value depends on connection timing — a genuine race. Runtime mutation of `process.env` should not survive the
rewrite; derive the redirect URI as a value passed explicitly.

### 3.5 Secrets stored in plaintext in MongoDB
- `src/schemas/spotifyTrackerSystem.js` — `spotifyAccessToken`, `spotifyRefreshToken`
- `src/schemas/valorantUserSystem.js` — `accessToken`, `entitlementToken`

Third-party OAuth tokens for end users are written to the database unencrypted. Anyone with database read access
can act as those users against Spotify and Riot. **The rewrite should encrypt these at rest** (application-level
AES-GCM with a key from env) and add a TTL so expired tokens are purged.

### 3.6 OAuth `state` is unvalidated
`src/server/server.js` takes `req.query.state` as the Discord user ID and upserts the resulting Spotify tokens
against it, with no signature, nonce or CSRF check. Anyone who can craft a callback URL can bind their own
Spotify account to an arbitrary Discord user ID, or overwrite someone else's linkage. **Sign the `state` (HMAC
with a server secret + expiry) and verify before writing.**

---

## 4. `src/config.js` — 110 keys, all untyped

A single flat `module.exports = { … }` object attached as `client.config` and read **~976 times** — the most
referenced symbol in the codebase.

**Groups:** bot version/identity, 17 embed colours, 9 emojis, 6 music emojis, 5 channel IDs, ~38 ticket strings,
3 AI model names, 8 Valorant emojis.

### Problems

1. **Duplicate key `noPerms`.** Declared twice — once as a plain string, once as a
   `(missingPerms) => string` function. The object literal silently discards the first. TypeScript with duplicate
   -key checking will error here, which is the correct outcome; keep the function.
2. **Hardcoded snowflakes for one specific private guild.** `developers`, `botLeaveChannel`, `botJoinChannel`,
   `commandErrorChannel`, `evalLogsChannel`, `dmLoggingChannel` are all literal IDs. **Self-hosters either log
   into the original author's server or get "unknown channel" errors.** These belong in env vars.
3. **`developers` is a single string, used inconsistently.** Two call sites compare with `!==` (exact string
   equality); `src/commands/Owner/eval.js` uses `.includes(...)`, which on a string performs **substring
   matching** — so a user ID that happens to be a substring would pass. Make it `string[]` and use `.includes`
   on the array.
4. **~30 hardcoded custom-emoji IDs** (`<:auto:1235660206856474704>` etc.) that render as raw text in any guild
   that does not have those emoji.
5. **`embedInfo` and `embedInsta` hold the same value** (`"LuminousVividPink"`).
6. **Untyped colours** — a mix of named `ColorResolvable` strings (`"Blurple"`) and hex (`"#1DB954"`).
   Type as `ColorResolvable` in the rewrite.
7. **`config.logging.webhookUrl` is referenced by `src/utils/setupLoggers.js` but does not exist** in
   `config.js` — a permanently dead fallback branch.

### Rewrite action
Split into: `env.ts` (secrets and per-deployment IDs, validated), `config/theme.ts` (colours and emoji, typed
`as const`), `config/strings.ts` (the ~38 ticket/message strings, ideally keyed for future i18n), and
`config/constants.ts` (timeouts, limits). Nothing that differs per deployment should remain a literal in source.

---

## 5. Secrets checklist for the rewrite

- [ ] Move all 6 hardcoded channel/developer IDs out of `config.js` into validated env vars.
- [ ] Fix the four lowercase webhook keys in the env generator (§3.2).
- [ ] Reconcile `clientid` / `clientId` on one spelling (§3.1).
- [ ] Encrypt Spotify and Riot tokens at rest (§3.5).
- [ ] Sign and verify the OAuth `state` parameter (§3.6).
- [ ] Collapse three `.env` loaders into one validated loader (§2).
- [ ] Rename `.development.example.env` → `.env.development.example` to match what the loader expects.
- [ ] Add `engines` to `package.json` and align `.nvmrc` (21.7.1), CI (Node 18) and the README (18.13.0+).
- [ ] Regenerate `.example.env` and the post-install guide from the env schema so they cannot drift again.
