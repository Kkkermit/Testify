# `src/client/` — Third-Party Client Wiring

**3 files · 112 lines.** Each exports a `(client) => void` that attaches a third-party manager.
All three are called from `src/index.js` before login.

---

## `distubeClientEvent.js` — 88 lines

`distubeClient(client, distube)` — **the second parameter is unused**.

Sets `client.distube = new DisTube(client, { plugins: [SpotifyPlugin, SoundCloudPlugin, YtDlpPlugin] })` and
chains **7 listeners**: `playSong`, `addSong`, `addList`, `error`, `empty`, `searchNoResult`, `finish`.

Consumed by all 21 `src/prefix/Music/*` commands (`client.distube`, 27 read sites). **The slash surface does
not use it at all** — `/radio` uses `@discordjs/voice` directly.

| Issue | Detail |
|---|---|
| **Broken template literal** | The `searchNoResult` description is **single-quoted**, so it prints the literal backticks and `${query}` instead of interpolating. **Finding 34.** |
| **`npm install` from an event handler** | The `error` handler string-matches `e.toString().includes('ytdl-core')` and calls `updateYTDLPackages()` — **shelling out to npm at runtime**. The outer catch does the same, so a bad token or missing ffmpeg can trigger an install. **Finding 40.** |
| **No channel null-guards** | `playSong`, `addSong` and `finish` dereference `queue.textChannel` and throw if the channel was deleted. |
| **7 duplicated embeds** | Every handler hand-builds `new EmbedBuilder().setColor(config.embedMusic).setDescription(…)`. |

---

## `giveawayClientEvent.js` — 13 lines

Sets `client.giveawayManager = new GiveawaysManager(client, { default: { botsCanWin: false, embedColor: '#a200ff', embedColorEnd: '#550485', reaction: '🎉' } })`,
using the Mongo-backed subclass from `src/utils/giveaway.js`.

**Issue:** the colours are hardcoded here rather than in `config.js` — inconsistent with every other colour in
the project, which lives under `config.embed*`.

---

## `auditLogsClientEvent.js` — 9 lines

Calls `Logs(client, { debug: true })` from `discord-logs`.

| Issue | Detail |
|---|---|
| **`debug: true` hardcoded** | Always-on verbose registration logging, with no env gate. |
| **Paired with a `node_modules` patch** | `src/scripts/setupLogs.js` **overwrites `node_modules/discord-logs/lib/index.js`** purely to make this debug output coloured. Destroyed by every `npm install` — including the one that runs at every boot. **Finding 88.** |

The ~36 synthetic events this enables (`guildChannelTopicUpdate`, `guildMemberBoost`, `voiceChannelSwitch`, …)
are handled by the 752-line `src/events/CommandEvents/handleLogsEvent.js`.

---

## Rewrite targets

| Current | Target | Change |
|---|---|---|
| `distubeClientEvent.js` | `features/music/distube.ts` | Drop the unused parameter; fix the template literal; **remove the runtime `npm install`**; guard `textChannel`; route all 7 embeds through the embed factory |
| `giveawayClientEvent.js` | `features/giveaway/manager.ts` | Colours from `config/theme.ts`; merge in the `utils/giveaway.js` subclass, dropping the removed `omitUndefined` option and fixing the ignored `messageId` |
| `auditLogsClientEvent.js` | `features/settings/auditLogs/index.ts` | `debug` from env; **delete the `node_modules` patch** and vendor the ~90 lines of handler registration into our own typed module |

All three become optional, explicitly-typed properties on `TestifyClient` (see
[`../migration/10-TARGET-ARCHITECTURE.md`](../migration/10-TARGET-ARCHITECTURE.md#2-the-typed-client)) rather
than untyped monkey-patches — they can genuinely be absent if the corresponding feature is disabled, and the
type system should say so.
