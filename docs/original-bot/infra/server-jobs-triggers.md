# `src/server/`, `src/jobs/`, `src/triggers/`

**4 files · 457 lines.**

---

## `src/server/server.js` — 155 lines

An Express app for the Spotify OAuth callback, tunnelled through ngrok.
**Exports nothing and self-executes on import** — `require('./server/server.js')` in `index.js` binds a port
and opens a tunnel purely as an import side effect.

**Route:** `GET /callback` — exchanges `code` for tokens and upserts `spotifyTrackerSystem`, keyed on
`req.query.state`.

| Issue | Severity | Detail |
|---|---|---|
| **Unvalidated OAuth `state`** | 🟠 | `req.query.state` is taken as the Discord user ID with **no signature, nonce or CSRF check**. Anyone who can craft a callback URL can bind their Spotify account to an arbitrary Discord ID — or overwrite someone else's linkage. **Finding 17.** |
| **Writes tokens even on failure** | 🟠 | It checks `!response.data.access_token`, logs, and **still writes the undefined token to Mongo**. |
| **Third dotenv load, wrong path** | 🔵 | `config({ path: '../../../.env' })` resolves **three levels above the repo root**. Works only because two earlier loads already populated `process.env`. |
| **Runtime `process.env` mutation** | 🟡 | Assigns `SPOTIFY_REDIRECT_URI` after ngrok connects, while another line reads it during the token exchange — **a genuine race**. **Finding 3.4 in `06-ENVIRONMENT.md`.** |
| **Self-starting** | 🟡 | Untestable and unmockable; any import boots a listener. **Finding 47.** |
| **Manual CORS with `*`** | 🔵 | Hand-written headers, while the declared `cors` dependency is **never used**. |
| **Validates then ignores** | 🔵 | Checks `SPOTIFY_CLIENT_ID`/`SECRET`, logs if missing, and starts anyway. |
| **52 lines of inline HTML/CSS** | 🔵 | In a template literal. |
| **Late error handler** | 🔵 | `server.on('error')` is registered *after* `await ngrok.connect(...)`, so an `EADDRINUSE` in that window is missed. |
| **ngrok pinned to a beta** | 🔵 | `5.0.0-beta.2`. |

**Rewrite target:** `src/server/index.ts` — exported `createServer()` / `startServer()`, never self-starting.
Sign the `state` with an HMAC and an expiry, verify before writing. Move the HTML to a template file. Use the
`cors` package or delete the dependency. Derive the redirect URI as a value rather than mutating `process.env`.

---

## `src/jobs/lotteryDrawJob.js` — 179 lines

`{ checkLotteries, executeLotteryDraw }`, driven by `setInterval(… , 60000)` from `index.js`.

**Flow:** query `lotterySchema` for due, active, unfrozen draws → for each, build a weighted ticket pool →
Fisher–Yates shuffle → pick unique winners → credit `Bank` → DM each winner → push a `History` record (capped
at 10) → reset `PrizePool`/`Entries` → recompute `NextDrawTime` → save → announce → save again.

| Issue | Detail |
|---|---|
| **No overlap guard** | A draw taking longer than 60 s **runs concurrently with the next tick and can double-pay winners**. **Finding 15.** |
| **`catch (err) {}` — completely empty** | DM failures vanish silently. |
| **Two `save()` calls per draw** | Redundant, and widens the race window. |
| **Non-atomic credits** | Read-modify-`save()` per winner. **Finding 14.** |
| **The error argument is discarded** | Three `client.logs.error(msg, error)` calls — `logs.js` accepts only one message argument. |
| **`'#FFD700'` hardcoded twice** | Instead of `config.embedEconomy`. |
| **Unguarded `entry.UserTag`** | `find()` can return `undefined`. |
| **Never cleared** | The interval has no handle and no graceful shutdown. |
| **Duplicated draw logic** | The same engine also lives inside the 700-line `commands/Economy/lottery.js`. |

**Rewrite target:** `src/jobs/lotteryDraw.ts` with an in-flight guard, atomic `$inc` credits, one `save`, a
registered timer handle, and **one shared `lotteryService`** consumed by both the job and the command.

---

## `src/triggers/` — 2 files, 122 lines

`mentionBot.js` and `sendBotName.js`. Both are `MessageCreate` handlers, loaded via `handleTriggers`.

**These two files are ~95% identical** — the same 6-field info embed and the same two link-button rows. They
differ only in the match condition (`message.content.includes(<@botId>)` vs
`content.toLowerCase().includes(config.botName)`), the embed title, and the description wording.

| Issue | Detail |
|---|---|
| **Crash on every DM** | `message.guild.id` is dereferenced with only a `message.author.bot` guard. **Any DM containing a bot mention or the word "testify" throws `TypeError: Cannot read properties of null`.** **Finding 10.** |
| **4 extra DB queries per message** | Both query `aiChannelSystem` **and** `prefixSystem` on **every message in every guild** — on top of the 2 from `getMessagePrefix` and 1 from the dispatcher. **Finding 49.** |
| **Extremely noisy matching** | `sendBotName` matches the bare substring `"testify"` anywhere in any message. |
| **Dead third parameter** | Both declare `execute(message, client, interaction)`; `interaction` is always `undefined`. |
| **Hardcoded URL** | `https://testify.lol/` in both, instead of config. |
| **Duplicated uptime block** | The same 8-line computation appears here and in the bot-info commands. |
| **`.setColor("Purple")`** | `mentionBot.js` bypasses `config.embedColor`. |

**Rewrite target:** one `src/features/misc/mentionHandler.ts` with a guild guard, settings read from the cached
`guildSettingsRepository` (removing all 4 queries), a shared `buildBotInfoEmbed()` reused by the bot-info
commands, and much tighter matching — a bare-substring match on the bot's name is not a reasonable trigger.
