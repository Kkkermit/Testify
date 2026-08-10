# 19 — Open-Source Maintainer Guide

Testify is a public MIT-licensed project that people fork and self-host. This document covers what the rewrite
must do to make that work, and the repository infrastructure the project is missing.

---

## 1. Self-hostability — the headline problem

**Today, a stranger who clones Testify and fills in `.env` gets a partly-broken bot that logs into the original
author's Discord server.** This is the single biggest gap between "open source" and "usable open source" here.

### 1.1 Hardcoded snowflakes — 8 total

| Value | Location | Effect on a self-hoster |
|---|---|---|
| `developers` | `src/config.js` | **All owner-only commands (`/eval`, `/blacklist`, `/guild-list`, `/direct-message`, `/flush-logs`) are unusable** — they belong to someone else's account |
| `botLeaveChannel` | `src/config.js` | Guild-leave logs post to a channel in the author's server, or fail |
| `botJoinChannel` | `src/config.js` | Same |
| `commandErrorChannel` | `src/config.js` | **Error reports go to the author's server** |
| `evalLogsChannel` | `src/config.js` | Same |
| `dmLoggingChannel` | `src/config.js` | **User DMs are logged to the author's server** — a genuine privacy issue |
| `ExecuterId` ×2 | `src/events/CommandEvents/antiLinkEvent.js` | Anti-link warnings are attributed to the original bot's ID and the tag `Testify#0377` |

Every one moves to validated env with **no default**, so a misconfiguration fails at boot rather than silently
posting into a stranger's server:

```ts
// src/config/env.ts
DEVELOPER_IDS:          z.string().transform(s => s.split(',')),   // now an array — fixes finding 27
LOG_CHANNEL_GUILD_JOIN:  z.string().optional(),
LOG_CHANNEL_GUILD_LEAVE: z.string().optional(),
LOG_CHANNEL_ERRORS:      z.string().optional(),
LOG_CHANNEL_EVAL:        z.string().optional(),
LOG_CHANNEL_DMS:         z.string().optional(),
```

The five channel IDs are `.optional()` deliberately — the feature should **disable itself** when unset, not
crash and not post somewhere unexpected.

### 1.2 Custom emoji — 29 distinct

**29 distinct custom emoji** are hardcoded across `src/` (35 occurrences; 15 in `config.js`, plus 12 badge
emoji in `src/lib/discordBadges.js` and others inline). They render as raw text like
`<:auto:1235660206856474704>` in any guild that does not have them — which is every guild but the author's.

**Fix: a typed emoji map with Unicode fallbacks.**

```ts
// src/config/theme.ts
export const emoji = {
  success: process.env.EMOJI_SUCCESS ?? '✅',
  error:   process.env.EMOJI_ERROR   ?? '❌',
  automod: process.env.EMOJI_AUTOMOD ?? '🛡️',
  // …
} as const;
```

The bot then looks correct out of the box, and anyone who wants the fancy animated versions sets the env vars.
Ship a `docs/emoji.md` listing every key with its default so self-hosters know what is customisable.

### 1.3 Other blockers

| Blocker | Fix | Finding |
|---|---|---|
| `npm run setup-env:prod` writes four keys lowercase that the code reads camelCase — **every self-hoster who follows the documented flow silently loses slash logging, prefix logging, bug reports and suggestions** | Generate the file **from the env schema** so drift is structurally impossible | 3 |
| `npm run log-setup` overwrites a file inside `node_modules`, and the README documents doing it by hand | Delete both; vendor the ~90 lines | 88 |
| `npm install` runs on every boot, mutating `package.json` | Remove from the boot path | 40 |
| `botInvite` in config has a hardcoded `client_id` | Build from `env.CLIENT_ID` | — |
| Valorant region hardcoded to EU | Region as config | — |
| `.example.env` is incomplete; the post-install guide references `npm run start`, which does not exist | Generate both from the schema | — |
| `.development.example.env` is misnamed — the loader expects `.env.development` | Rename | 89 |

### 1.4 Definition of done

> A stranger clones the repo, runs `npm ci`, copies `.env.example` to `.env`, fills in **only** the required
> fields (token, client ID, MongoDB URI), runs `npm start`, and gets a fully working bot with no broken embeds,
> no logs sent to anyone else's server, and every optional feature cleanly disabled until configured.

Add a smoke test for this: boot with only the required env set and assert no unhandled errors.

---

## 2. Missing repository files

`CONTRIBUTING.md` currently tells contributors to *"Use the Issues tab with the bug report template"* and
*"the feature request template"*. **Neither template exists.** `.github/` contains only `FUNDING.yml` and two
workflows.

| File | Status | Purpose |
|---|---|---|
| `.github/ISSUE_TEMPLATE/bug_report.yml` | **Missing, already promised** | Structured fields: version, Node version, OS, repro steps, logs |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | **Missing, already promised** | Problem, proposal, alternatives |
| `.github/ISSUE_TEMPLATE/config.yml` | Missing | Route questions to Discord, not Issues — as `CONTRIBUTING.md` already asks |
| `.github/pull_request_template.md` | Missing | The reviewer checklist from `17-CODING-STANDARDS.md` §10 |
| `CODE_OF_CONDUCT.md` | Missing | Contributor Covenant 2.1 |
| `SECURITY.md` | **Missing — matters here** | See below |
| `CHANGELOG.md` | Missing | Keep a Changelog format |
| `.github/dependabot.yml` | Missing | Replaces the `update-packages` script, which should be deleted |

### `SECURITY.md` is not boilerplate for this project

Testify handles material worth reporting privately: an **`/eval` command** that executes arbitrary code, a
**Spotify OAuth flow with an unvalidated `state` parameter** (finding 17), **third-party access tokens stored
in plaintext** (finding 18), and **a shell injection in `npm run commit`** (finding 16).

A public issue tracker is the wrong place for those. Enable **GitHub private vulnerability reporting** and
state a response-time expectation you can actually meet.

Bug-report templates should include a **"never paste your `.env`"** warning — the README already has a caution
box about this, and issue templates are where people actually leak tokens.

---

## 3. `CONTRIBUTING.md` rewrite

The existing file is decent on process — keep the conventional-commit types and the PR requirements. What
needs updating:

| Section | Change |
|---|---|
| Setup | `npm ci`, `npm run build`, Node 22, the `.env` flow |
| "Follow the existing code style" | Link to [`17-CODING-STANDARDS.md`](17-CODING-STANDARDS.md) — the standards are now written down and lint-enforced |
| Testing | Link to [`16-TESTING-STRATEGY.md`](16-TESTING-STRATEGY.md); state that new logic needs tests |
| Before pushing | `npm run check` (typecheck + lint + format + test) |
| `npm run commit` | Only after the shell injection is fixed (finding 16) |
| Commit types | Drop `add`/`update`/`remove` — they overlap `feat`/`fix` |
| Templates | Now that they exist, the references are no longer broken |

Add a **project structure** section — feature-first layout, where a new command goes, and the rule that
`services/` must not import discord.js. That one paragraph prevents most misplaced PRs.

---

## 4. Releases

Adopt **semver** properly. The current version is `1.7.0` in `package.json` but `BETA-v1.7.0` in `config.js` —
two sources of truth, and the version check compares them **lexicographically**, so `v1.9.0 < v1.10.0` is
`false` (finding 28).

- **Single source of truth:** `package.json`. `config.botVersion` reads from it.
- **The rewrite is `2.0.0`** — it is a breaking change for anyone who forked.
- Generate `CHANGELOG.md` from conventional commits (`changesets` or `release-please`).
- Tag releases and publish GitHub Releases; the update checker already reads the releases API.
- Fix the version comparison to use a real semver parser.

Suggested cadence: batch into minor releases rather than tagging every merge, and document a support policy
(realistically: latest only).

---

## 5. README corrections

The audit found three inaccuracies:

1. **"Music System: play music from YouTube, Spotify, and SoundCloud"** — true, but **prefix-only**. The slash
   surface has just `/radio` and `/tts`. All 21 playback commands are prefix. Say so.
2. **AI features do not use `hercai`** despite it being a declared dependency — they use `apexify.js`, and
   `/ai` is **unreachable at runtime** behind `underDevelopment: true`. Either fix the feature or stop
   advertising it.
3. **The "Setting up audit logs" section instructs users to hand-edit `node_modules/discord-logs/lib/index.js`.**
   **Delete this section entirely.** It teaches a practice that breaks on every install and cannot work in any
   containerised deployment.

Also stale: the Node version table (three sources disagree), and `npm run start`, which does not exist.

Worth adding: a Docker setup. It is the most common way people self-host a bot, and it is impossible today
because of the `node_modules` patching.

---

## 6. Good first issues

The audit is a ready-made backlog of well-scoped, low-risk tasks — each independently verifiable, each fixing
something real.

| Task | Difficulty | Finding |
|---|---|---|
| Remove 11 unused imports | Trivial | 5b |
| Add trailing newlines to 171 files (`npm run format`) | Trivial | 93 |
| Delete the 4 dead files (`instagramAuthHelper`, `dailyPetIncomeBonus`, `verifyLeftUsersSystem`, `folderLoader`) | Easy | S9 |
| Remove 11 unused dependencies, incl. `puppeteer` (~300 MB) | Easy | 05-DEPENDENCIES |
| Fix `if (data.Roles.length < 0)` → `=== 0` | Easy | 31 |
| Fix the `[GUILD_CREATE]` tag on the guild-*delete* logger | Easy | 97 |
| Fix the `"Orbit"` leftover footer | Easy | 97 |
| Fix `PermissionsBitField.Administrator` → `PermissionFlagsBits.Administrator` | Easy | 8 |
| Fix `PermissionFlagsBits.createWebhook` → `ManageWebhooks` | Easy | 9 |
| Fix the broken template literal in the DisTube handler | Easy | 34 |
| Fix `/help` advertising the non-existent `/suggestion` | Easy | 7 |
| Add a guild guard to the two triggers so DMs stop crashing | Medium | 10 |
| Replace `await data.forEach(async …)` with `Promise.all` | Medium | 32 |
| Fix the double-XP credit | Medium | 25 |
| Extract the profanity filter from 13 call sites | Medium | 61 |
| Fix the shell injection in the commit script | Medium | 16 |

Label them `good first issue` with the finding number in the body so a contributor can read the reasoning in
these notes. **Do not hand out the economy model merge (finding 36) as a first issue** — it needs database
verification against real data.

---

## 7. Licensing note for the rewrite

Vendoring `discord-logs`' ~90 lines of handler registration (§1.3) means copying third-party source into this
repository. **Check its license first** — `node_modules/discord-logs/package.json`, or the package page — and
confirm it permits redistribution under MIT. If it does, **retain the original copyright notice** in the
vendored file and note the origin in a header comment. If it does not, wrap the package normally instead of
copying from it.

The same applies to any other borrowed code. Keep `credits.md` current.
