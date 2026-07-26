# 05 — Dependency Audit

Every entry verified against actual `require()` sites in `src/`, not against `package.json` alone.

`package.json` declares **51 runtime dependencies** and **10 devDependencies**. The audit below shows that
**6 packages are imported but never declared**, and **8 declared runtime packages are never imported anywhere**.

---

## 1. CRITICAL — imported but NOT declared in `package.json`

These resolve today only because npm flattened them into `node_modules` as transitive dependencies of something
else. **A clean `npm ci` on a different npm version, or any upstream dependency bump that drops them, breaks the
bot at runtime.** This is the single most dangerous class of finding in this audit.

| Package | Imported by | Risk |
|---|---|---|
| `node-fetch` | `src/api/instagramApi.js`, `src/commands/Community/advice.js`, `src/commands/Community/dbd.js`, `src/events/CommandEvents/dbdRerollEvent.js`, `src/scripts/consoleLogger.js`, `src/utils/fetchValorantApi.js` | **6 call sites.** Also a v2/v3 hazard: v3 is ESM-only and would throw `ERR_REQUIRE_ESM` under CommonJS. |
| `@iamtraction/google-translate` | `src/commands/Community/translate.js`, `src/__tests__/Community/translate.test.js` | `/translate` dies. No published types. |
| `superagent` | `src/commands/Community/lyrics.js` | `/lyrics` dies. |
| `ms` | `src/commands/Giveaway/giveaway.js` | `/giveaway` duration parsing dies. |
| `@discordjs/rest` | `src/functions/handleCommands.js` | **Boot-critical** — this is the module that registers every slash command. |
| `discord-api-types` | `src/functions/handleCommands.js` | Boot-critical (`Routes`). |

> `@discordjs/rest` and `discord-api-types` are re-exported by `discord.js` itself, so the fix is to import
> `REST` and `Routes` from `discord.js` directly. The other four must be added to `package.json` — or, better,
> removed: `node-fetch` and `superagent` are both replaceable by the global `fetch` built into Node 18+, which
> this project already requires.

### Rewrite action
Replace all 6 `node-fetch` sites and the 1 `superagent` site with global `fetch`. Import `REST`/`Routes` from
`discord.js`. Declare `ms` and `@iamtraction/google-translate`, or drop `ms` in favour of a small typed duration
parser. Then add a CI step (`depcheck` or `eslint-plugin-import/no-extraneous-dependencies`) so this cannot recur.

---

## 2. Declared but never imported anywhere in `src/`

Verified by grepping every form of `require` across all 321 files.

| Package | Version | Verdict |
|---|---|---|
| `hercai` | 12.3.2 | **Dead.** The README claims the AI features use it; they do not — `src/commands/AiCommands/aiCommands.js` uses `apexify.js`. Delete. |
| `puppeteer` | ^22.7.1 | **Dead.** ~300 MB of Chromium downloaded on every install for nothing. Highest-value single deletion. |
| `sharp` | 0.33.5 | **Dead.** Native binary, no import sites. |
| `captcha-canvas` | ^2.3.1 | **Dead** in `src/`. Verification uses a different path — confirm before deleting. |
| `yt-search` | ^2.10.4 | **Dead.** Music uses `@distube/*`. |
| `inquirer` | 10.1.8 | **Dead.** The setup scripts use `prompts` instead. |
| `cors` | 2.8.5 | **Dead.** Only appears as the string `'Sec-Fetch-Mode': 'cors'` in `src/api/instagramApi.js:167` — not an import. `@types/cors` is likewise dead. |
| `uninstall` | ^0.0.0 | **Dead and meaningless.** A placeholder package with no functionality. Almost certainly an accidental `npm i uninstall`. |
| `fs` | ^0.0.1-security | **Must be removed.** This is not the Node built-in — it is a squatted placeholder published to reserve the name. Every `require('fs')` in the codebase resolves to the *built-in* regardless, so this entry does nothing but add supply-chain surface. |
| `os` | ^0.1.2 | **Must be removed.** Same problem as `fs` — a userland shim shadowing a built-in name. |

**Legitimately declared-but-not-directly-imported** (do not delete): `@babel/*`, `babel-jest`, `jest`, `nodemon`,
`cross-env`, `typescript` (tooling); `@discordjs/opus`, `libsodium-wrappers`, `ffmpeg-static` (loaded implicitly by
`@discordjs/voice`/DisTube as encryption and transcoding backends); `@distube/ytdl-core`, `@distube/ytsr`
(resolved by DisTube at runtime, and updated by `src/scripts/ytdlUpdater.js`).

---

## 3. Redundant and overlapping packages

**Five image libraries are installed to do one job:**

| Package | Actually used by |
|---|---|
| `canvas` (node-canvas 2.x) | `commands/Community/clashRoyale.js`, `commands/Community/dbd.js`, `commands/Fun/pepeSign.js`, `commands/LevelAndEconomy/leaderboard.js` — 9 import sites |
| `@napi-rs/canvas` | 1 import site |
| `canvacord` | `commands/LevelSystem/rank.js`, `rankContextMenu.js`, `commands/Spotify/spotifyCommands.js` — 4 sites |
| `canvafy` | `commands/Fun/relationshipChecker.js`, `commands/LevelAndEconomy/leaderboard.js` — 4 sites |
| `discord-arts` | `commands/InfoCommands/userInfo.js`, `userInfoContextMenu.js` — 3 sites |
| `sharp` | nothing |

`canvas` (node-canvas) requires system build tooling and is the most common install failure for people cloning
this repo. `@napi-rs/canvas` is a drop-in prebuilt-binary replacement that **ships its own TypeScript types**.
**Recommendation: standardise on `@napi-rs/canvas`, drop `canvas` and `sharp`, and keep `canvacord`/`canvafy`/
`discord-arts` only if their specific card renderers are worth their weight.**

**Two YouTube stacks:** `ytdl-core` (unmaintained, frequently broken by YouTube changes) and
`@distube/ytdl-core` (the maintained fork). Only the fork is used. Delete `ytdl-core`.

---

## 4. TypeScript readiness, per package

| Package | Types | Migration difficulty |
|---|---|---|
| `discord.js` 14.17.3 | ✅ Bundled, excellent | **Low**, but see the `ephemeral` → `MessageFlags.Ephemeral` sweep (158 sites) and the `data` builder-union problem in `11-TYPED-CONTRACTS.md`. Bump to latest v14 during the rewrite. |
| `mongoose` ^6 | ✅ Bundled | **Medium.** v6 → v8 upgrade recommended; drop the legacy `useNewUrlParser`/`useUnifiedTopology` options. Every schema needs a matching `interface` + `Model<T>`. |
| `axios` ^1.6.8 | ✅ Bundled | **Medium.** Types are fine, but *every* response in the codebase is consumed untyped. You must hand-write ~8 response interfaces (Clash Royale player/clan/card/battle, TMDB, Reddit listing, mcsrvstat, adviceslip). Consider dropping `axios` for global `fetch` + typed wrappers. |
| `express` 4.21.2 | ➖ `@types/express` declared | **Low.** Note `@types/express` is v5 while `express` is v4 — a version mismatch that will produce wrong types. Align them. |
| `mathjs`, `figlet`, `quickchart-js`, `discord-giveaways`, `@discordjs/voice`, `moment` | ✅ | **Low.** `moment` is in maintenance mode — replace with `Intl`/`date-fns`. |
| `wikijs` | ⚠️ Loose | **Low-medium.** |
| `canvas` | ❌ None bundled | **Medium.** `@types/node-canvas` is unmaintained. Migrating to `@napi-rs/canvas` solves this outright. |
| `canvacord` 5.x | ⚠️ Partial/stale | **Medium.** v6 is an API rewrite — decide whether to pin v5 with a shim or port. |
| `canvafy`, `discord-arts` | ⚠️ Thin | **Medium.** Hand-written `.d.ts` shims. |
| `discord-gamecord` 4.4.2 | ❌ None | **High.** 14 distinct game classes constructed in `commands/MiniGames/minigame.js`, each with a bespoke options object. Needs a hand-rolled `.d.ts`. |
| `apexify.js` 4.5.43 | ❌ None, unstable API | **Highest.** Sole consumer is `commands/AiCommands/aiCommands.js`, which is flagged `underDevelopment: true` and therefore unreachable at runtime. **Recommendation: delete the dependency and rebuild `/ai` against a typed SDK.** |
| `distube` + `@distube/*` | ✅ Bundled | **Low-medium.** Only `src/prefix/Music/*` uses it. |
| `discord-html-transcripts` | ✅ | **Low.** |
| `discord-logs` | ⚠️ | **Special case** — see below. |
| `ngrok` 5.0.0-**beta**.2 | ⚠️ | Pinned to a beta. Used only by the Spotify OAuth callback server. |

---

## 5. `discord-logs` — the patched-dependency problem

`src/scripts/setupLogs.js:7` computes
`path.join(__dirname, "../../node_modules/discord-logs/lib/index.js")` and **overwrites that file** with a
bundled string of replacement source. The README documents doing the same edit by hand.

This is a monkey-patch of a third-party package inside `node_modules`. It:

- is destroyed by every `npm install` / `npm ci`;
- is invisible to source control;
- makes builds non-reproducible;
- would be silently lost in any Docker or CI deployment.

**Rewrite action:** delete the patch entirely. The patch only adds coloured, timestamped registration logging.
Reimplement it as a thin typed wrapper module in our own source that calls `discord-logs` normally and does its
own logging — or, if the upstream package is genuinely inadequate, vendor the ~90 lines of handler registration
into `src/core/auditLogs.ts` and drop the dependency. If a real patch is ever unavoidable, use `patch-package`
with the diff committed to the repo.

---

## 6. Version and runtime notes

- `.nvmrc` pins **21.7.1**; the README claims 18.13.0+; CI (`.github/workflows/run-tests.yml`) runs **Node 18**.
  Three different answers. Pick one — Node 22 LTS is the sensible target for the rewrite — and make `.nvmrc`,
  `package.json#engines`, the README and CI agree.
- `package.json` has no `engines` field at all.
- `mongoose` `^6.0.12` is two majors behind; v6 reached end-of-life. The `useNewUrlParser` / `useUnifiedTopology`
  options passed at `src/events/ReadyEvents/ready.js` and `src/scripts/wipeDatabase.js` have been no-ops since v6
  and are removed in v8.
- `typescript` 5.7.3 is already a devDependency but there is **no `tsconfig.json`** and not one `.ts` file.
- There is no lockfile discipline in CI beyond `npm ci`, and no `npm audit` step.
