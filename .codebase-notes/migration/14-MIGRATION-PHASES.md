# 14 — Migration Phases

Ordered by dependency, not by size. Each phase has an explicit exit criterion — do not start the next phase
until the current one is met.

**The bot must remain runnable at the end of every phase.** No phase leaves it broken.

---

## Phase 0 — Fix data and correctness bugs in JavaScript, before any TypeScript

A rewrite faithfully reproduces bugs it does not know about. Fix these in the existing JS so the TS port has a
correct reference.

| Task | Finding |
|---|---|
| Migrate `LevelAndEconomy/{give,leaderboard,reset}.js` off `economySystem` onto `economySchema`, then delete `economySystem.js`. **Verify against a database copy that no documents were truncated.** | 36 |
| Decide fix-or-delete for the three silently dead features: welcome cards, default-prefix seeding, `/ai` | 1, 2, 4 |
| Fix the lowercase webhook keys in `setupEnvFile.js` | 3 |
| Fix the live crashes: `guildList.js` permissions, `impersonate.js` permissions, the two triggers' DM crash, `aiChannelEvent.js` const reassignment, the `spotify-*` collision | 8–12 |
| Declare or replace the 6 undeclared dependencies | 13 |
| Remove `updateYTDLPackages()` from the boot path | 40 |

**Exit criterion:** bot boots clean, no `MaxListenersExceededWarning` regressions, economy documents verified
intact, and the six crash paths have manual reproductions that no longer crash.

---

## Phase 1 — Tooling and an empty TypeScript shell

No feature code yet. Prove the build pipeline before committing 300 files to it.

- `tsconfig.json` with `strict: true` (see `12-TOOLING.md`)
- `"type": "module"`, ESM throughout
- tsup build → `dist/`, with the asset copy step for `assets/images` and `assets/jsons`
- ESLint flat config + Prettier, wired into CI as a **blocking** step (there is no lint in CI today)
- Vitest replacing jest+babel
- CI: align Node to 22 across `.nvmrc`, `engines` and the workflow
- Move `src/images/` → `assets/images/`, `src/jsons/` → `assets/jsons/`

**Exit criterion:** `npm run build` emits a `dist/` that runs a hello-world entry point, `npm run typecheck`
and `npm run lint` pass, and CI enforces all three.

---

## Phase 2 — The core framework

The load-bearing layer. Everything downstream depends on these contracts, so get them right before porting
features.

| Module | Replaces |
|---|---|
| `core/loader.ts` | 5 `fs.readdirSync` sites + 7 dynamic `require`s — **the `dist/` blocker** |
| `core/client.ts` | ~20 monkey-patched client properties |
| `core/customId.ts` + `core/router.ts` | 27-listener fan-out, 3 separator conventions |
| `core/middleware.ts` | 4 duplicated gate implementations |
| `core/errors.ts` | 400 ad-hoc catches |
| `core/logger.ts` | 4 parallel logging systems, 3 `getTimestamp()` definitions |
| `core/timers.ts` + `core/shutdown.ts` | 6 uncleared intervals, no graceful shutdown |
| `config/env.ts` | 3 `.env` loaders, 20 unvalidated vars |
| `config/theme.ts`, `strings.ts`, `constants.ts` | the 110-key flat `config.js` |
| `ui/embeds.ts` | 459 inline `EmbedBuilder` calls |
| `database/connection.ts` | 3 connect sites, removed Mongoose options |

**Exit criterion:** the bot boots on the TS core with zero commands loaded, connects to MongoDB, logs in,
responds to a single hardcoded `/ping`, and shuts down cleanly on `SIGINT` with every timer cleared.

---

## Phase 3 — Data layer

- 30 surviving schemas → `interface I<Name>` + `Schema<I<Name>>` + `model<I<Name>>`
- Repositories for every access pattern; **atomic `$inc`** for all balance mutations (finding 14)
- Indexes for every documented query shape, starting with `{ guildId, userId }` on economy (finding 37)
- `{ timestamps: true }`, retiring the hand-rolled date fields
- `.lean()` on all read-only queries
- The guild-settings cache that kills 6 of the 7 per-message queries (finding 49)
- Encrypt the Spotify and Riot token fields (finding 18)

**Exit criterion:** every model has a typed interface and at least one repository test; a concurrency test
proves two simultaneous balance adjustments both land.

---

## Phase 4 — Events and the component router

Port the event layer before the commands, because commands emit components the router must already handle.

- 55 event modules → validated handlers registered through the router
- `once: true` for all `ClientReady` handlers (finding 41)
- Move `handleLogsEvent.js` out of the events tree; split its ~36 listeners by domain (finding: 752-line file)
- Merge the 4 VC-counter files, the 2 triggers, and `guildCreate`/`guildDelete`
- Every custom ID re-minted through the codec; **the duplicate-namespace check must pass at boot**
- Decompose the oversized handlers: `shopInteractions.js` (883), `helpInteractions.js` (661),
  `heistHandler.js` (583), `modPanelModalHandler.js` (401), `petInteractions.js` (320)

**Exit criterion:** all event-driven features work end-to-end in a test guild; no duplicate-namespace errors;
`interactionCreate` has exactly one listener.

---

## Phase 5 — Commands, feature by feature

Port by **feature**, not by folder, merging each duplicated pair as you reach it
(`13-DEDUPLICATION-MAP.md`). Suggested order — least to most entangled:

| Order | Feature | Files | Why here |
|---|---|---|---|
| 1 | `fun` | 8 slash + 5 prefix | Small, self-contained, no DB — proves the shared-core pattern |
| 2 | `info` | 10 slash + 9 prefix | Read-only, high duplication — good deduplication rehearsal |
| 3 | `moderation` | 22 slash + 9 prefix | Well-understood domain |
| 4 | `levelling` | 3 slash + 2 prefix | Small; fix the double-XP bug (finding 25) |
| 5 | `community` | 11 slash + 2 prefix | Includes `clashRoyale.js` (1,301 lines) and `dbd.js` (726) — needs ~8 API response interfaces and the canvas migration |
| 6 | `settings` | prefix, automod, audit logging, counting, welcome, sticky, verification | Config-heavy |
| 7 | `tickets`, `giveaway` | 2 slash + their events | Self-contained subsystems |
| 8 | `music` | 2 slash + 21 prefix | DisTube typing; the largest prefix-only block |
| 9 | `integrations` | Valorant, Spotify, Instagram | External APIs, OAuth, the Express server |
| 10 | **`economy`** | 19 slash + 16 prefix + 9 events | **Last.** Largest, most entangled, most duplicated, and the 158 `ephemeral` sites are concentrated here |

**Exit criterion per feature:** every command in it works on both surfaces, its duplicated pair is merged, its
tests pass, and no `@ts-expect-error` remains without a comment explaining why.

---

## Phase 6 — Scripts, server, jobs

- 10 scripts → TS, run via `tsx`; **fix the shell injection** in `commitRunner.js` (finding 16)
- Delete `setupLogs.js`; vendor the `discord-logs` handler registration instead (finding 88)
- Regenerate `.example.env` and the post-install guide **from the env schema** so they cannot drift again
- `server/` exported rather than self-starting; **sign and verify the OAuth `state`** (finding 17)
- `lotteryDrawJob` with an overlap guard (finding 15)

**Exit criterion:** every npm script runs under the new toolchain; `npm ci && npm run build && npm start`
works from a clean clone with only a `.env`.

---

## Phase 7 — Tests and documentation

- Raise coverage from 8 command files to the core framework plus every repository and service
- `CommandContext` makes command logic testable without faking a full `Interaction` — exploit that
- Regenerate the `site/` command tables **from the command registry** rather than hand-written HTML
- Update the README: remove the `node_modules` patching instructions entirely

**Exit criterion:** CI runs typecheck + lint + tests + build; coverage meaningfully above today's baseline;
the docs describe the bot that now exists.

---

## Sequencing rules

1. **Phase 0 before anything else.** Porting bugs is worse than porting code.
2. **Phases 1–2 are strictly sequential.** Everything depends on the core contracts.
3. **Phase 3 can overlap Phase 4** — different people, different files.
4. **Phase 5 features are independent** and can be parallelised once Phases 2–4 are done.
5. **Economy last, always.** It is 44 files, the most duplication, the most stateful events, and the money bugs.

---

## Risk register

| Risk | Mitigation |
|---|---|
| **Renaming a Mongoose model renames the collection** | Keep model names identical during the port; rename in a separate, scripted data migration or not at all |
| **The economy model merge could truncate live documents** | Phase 0, against a database copy, with before/after field-count verification |
| **Untyped deps** (`discord-gamecord` — 14 game classes, `canvacord`, `canvafy`, `discord-arts`) | Write `.d.ts` shims in Phase 1 so feature phases are not blocked |
| **Assets not copied to `dist/`** | Prove the copy step in Phase 1, before 330 PNGs depend on it |
| **`ephemeral` → `flags` sweep (158 sites)** | Handle centrally in the `CommandContext.reply` adapter, not per call site |
| **Scope creep from "while we're here"** | The 26 prefix-only commands getting a slash surface is the one sanctioned addition; everything else is a follow-up |
| **A long-lived branch drifting from `main`** | Ship phases behind a feature flag or merge per phase; do not run a six-month branch |
