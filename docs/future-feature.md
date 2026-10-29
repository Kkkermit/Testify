<div align="center">

# 🔭 Future features

**What could come next: a public site with the docs and the source, features the bot does not have, screens the
dashboard is missing, checks nobody has run against a live Discord, and the upkeep waiting on dependencies.**

</div>

Nothing here is promised or scheduled. Each entry says what exists already to build on and what a change would have
to respect, so whoever picks one up starts from the code rather than from a blank page. When an entry ships, delete
it from this file in the same pull request.

Checked against the code and the npm registry on **25 October 2026**.

---

## 🌐 A landing page with the docs and the source

A public site for anybody running their own copy of the bot. It explains how to run it, host it and change it, and
lets them read the code. It is on by default wherever it can be, and `DASHBOARD_ENABLED` still decides alone whether
sign-in and the server screens exist.

### The guide

Everything needed to run the bot yourself, in the order somebody needs it. Each page is built from the code or from a
document that already exists, so the site cannot describe a bot that is no longer there.

| Page                 | What it covers                                                                                   | Built from                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Requirements         | Node ≥ 24.11, MongoDB 7.0 or newer, a Discord application, FFmpeg and yt-dlp for music, the OSes | `.nvmrc`, `engines` in `package.json`, the README's Compatibility                       |
| Getting set up       | The application, the token, the privileged intents, `npm run setup`, inviting the bot            | The README's Full setup guide, `scripts/setupEnv.ts`, `INVITE_PERMISSIONS`              |
| Running it           | `npm run dev`, `npm start`, `npm run dev:all` and every other script                             | AGENTS.md §3, the README's Scripts                                                      |
| Hosting it           | Docker and Compose, hosts that build the `Dockerfile`, and why a serverless host cannot          | `docs/hosting.md`                                                                       |
| Configuration        | Every environment variable, what it does, its default and whether it is required                 | The zod schema in `src/config/env.ts`, which declares every one                         |
| Commands             | Every command, its options, permissions, aliases, cooldown and where it works                    | The registry `npm run docs:commands` reads, and the help desk's generated command pages |
| Using it in a server | Setting up each feature, in the words `/ask` answers with                                        | `assets/support/*.md`                                                                   |
| Building a command   | One file and `defineCommand`, subcommands, panels and Components V2                              | AGENTS.md §8–11                                                                         |
| The codebase         | The folder map, where to look for a job, aliases and barrels, the naming rules                   | AGENTS.md §4–7                                                                          |
| CI/CD                | The four CI jobs, the nightly run, the hooks, branches and releases                              | `.github/workflows/`, AGENTS.md §19–20                                                  |
| The dashboard        | Turning it on, its security model, adding a screen                                               | AGENTS.md §24, `docs/dashboard/guide.md`                                                |

### The source page

- **A file tree and a file viewer** for the repository, each file with a link to the same file on GitHub.
- **The repository's standing:** stars, forks, watchers, open issues and the latest release.
- **Its traffic:** clones and unique cloners, views and unique visitors, the top referrers and the most viewed pages.

### What exists to build on

- **The material is already written.** `docs/`, AGENTS.md and the dashboard guide cover every page above, and
  `npm run docs:commands` and `npm run docs:images` already generate from the real code.
- **The help desk's Markdown reader and `SupportSearch`.** The reader in `src/lib/support/` renders the articles, and
  the search in `@testify/shared` already runs in a browser, so the site can search its pages the way the Help page
  searches articles.
- **Public pages exist.** `/terms` and `/privacy` sit outside the sign-in gate, and `GET /api/bot` takes no session,
  so a fork's site can wear its own name and picture.
- **`theme.repository` is the one place the repository's address is written.**

### What it has to respect

1. **On by default, without exposing anything that is not exposed today.** There are two ways to have it on by
   default, and both are worth having from one build:
   - **A static build published to GitHub Pages** by a workflow on every push to `main`. Nobody has to configure
     anything, and the docs can be read before anybody has a bot running, which is when they are needed most. A fork
     gets its own copy by turning Pages on.
   - **The same build served by the bot**, so a self-hosted copy carries the docs for the version it runs. The web
     server only starts with `DASHBOARD_ENABLED` today, so this needs its own switch, defaulting to on. That switch
     keeps `DASHBOARD_BIND`'s default of `127.0.0.1`, and a busy port must still cost the website rather than the
     bot.

   With `DASHBOARD_ENABLED` false the site still answers, and its button for the dashboard is hidden rather than
   leading to a refusal.

2. **Stars and forks are public, and traffic is not.** GitHub answers the repository endpoint without a token, so
   stars, forks and the latest release can be on by default.

   The traffic endpoints are different:
   - they need a token with push access, which for a fine-grained token is Administration read;
   - the `GITHUB_TOKEN` a workflow gets cannot be given that;
   - so traffic needs a token in a repository secret for the Pages build, or in an environment variable for the
     bot, and the page says how to add one rather than showing zeros;
   - GitHub keeps only 14 days of traffic, so a longer history has to be stored. The nightly workflow could append
     each day to a JSON file the Pages build reads.

3. **"Testify never phones home" stays true.** The Pages build asks GitHub while it builds, inside GitHub's own
   runner. The bot must not poll GitHub on a timer by default. Asking on request and caching the answer for an hour,
   recorded through `fetchRaw` like every other outside call, keeps it to what a reader asked for. Whether the bot
   shows any GitHub numbers at all is a decision to make before building it.
4. **The CSP does not move.** With `connect-src 'self'` a browser never asks `api.github.com` directly. The build or
   the server fetches, and the page reads its own origin. GitHub refuses to be shown in a frame, so the source
   viewer draws files itself, from GitHub's git tree and contents endpoints or from the checkout at build time. Its
   highlighting runs no inline script.
5. **Generated, never copied.** Commands come from the registry, variables from the zod schema, and numbers from
   the constants `supportFacts.util.ts` already reads. `docs/commands.md` stays the generated file, and the site
   renders it rather than keeping a second copy.
6. **Markdown becomes HTML here for the first time.** Every source is in the repository, but the renderer still
   escapes HTML rather than passing it through, and the lint ban on `dangerouslySetInnerHTML` stays.
7. **The dashboard's budget is untouched.** Its first load is 200 kB gzipped, and is met exactly. The site is its
   own entry point, so the dashboard does not grow, and the highlighter loads only on the source page.

### Decisions to make first

- **Where it lives.** A fourth workspace, `site/`, sharing `@testify/shared` and the dashboard's design tokens, would
  keep the docs out of the dashboard's bundle and away from its sign-in assumptions. Routes inside `dashboard/` would
  be less code, but would tie the docs to the dashboard's build.
- **What the bot's own copy shows** of the GitHub numbers, given point 3.
- **What the new switch is called.** The web server's settings are all named `DASHBOARD_*`. Whether the site reuses
  `DASHBOARD_PORT` and `DASHBOARD_BIND` or gets names of its own changes every `.env` already written.

---

## 🤖 New bot features

Nothing is waiting here. A new idea goes in a table with what it would do, what it would build on and what it would
have to respect.

---

## 🖥️ Dashboard screens still missing

Nothing is waiting here. `features/commands/commands.utils.ts` is the list that decides which commands have a
screen, and the coverage tile on `/commands` counts it. `/clear` is left out on purpose: deleting a hundred messages
from a browser tab is a worse tool than doing it in the channel, where you can see them.

---

## 🧪 Checked by tests, never against a live Discord

Each of these passes its tests against mocks or an in-memory database. None has been watched working in a real
server, and each should be before it is relied on.

- **The ticket flow, after its move into `src/lib/tickets/`.** Open, lock and unlock, claim, add and remove a member,
  and close with a transcript. The behaviour was copied line for line and is covered by `ticketFlow.test.ts`, but
  only against mocked channels.
- **The settings split into one schema and repository per feature.** Every model keeps its old name, so it reads
  the same collection, and the suite passes against `mongodb-memory-server`. Starting the bot on a database with
  real records in it, and seeing each feature still show its settings, is the proof that is missing.
- **Join to create:** a channel made in the right category, the member moved into it, the channel deleted once
  empty, and the sweep after a restart.
- **The setup checklist's private `#audit-log`**, made only when both the bot and the person hold Manage Channels.
- **Role menus:** the post, the pre-ticked private select, and a role moved above the bot after the menu was made.
- **Reminders:** the channel ping, and the fallback to a DM when the owner has left or the bot cannot post.
- **The idea board:** the post, a vote moving from one side to the other, and the decision DMed to its author.
- **Polls:** Discord's own poll from `/poll`, on both surfaces, including the `Send Polls` check.
- **Away notes:** the notice on a mention and on a reply, and the welcome back on the next message.
- **Goodbye messages:** the post when somebody leaves, as text and as an embed.
- **Auto-responders:** a reply in a busy channel, the ten-second pause, and silence in a channel the bot cannot read.
- **Scheduled messages:** a daily post across a restart, and a post skipped for being an hour late.
- **Birthdays:** the post on the day, once only across a restart, and a birthday forgotten when its member leaves.
- **Moderation cases:** a case posted to the log channel for each kind of action, from Discord and from the dashboard,
  with nobody pinged.
- **Raid protection:** a timeout on a brand new account and the DM saying why, and one alert for a burst of joins that
  pings only the chosen role.
- **The bans screen:** a server with hundreds of bans, a softban lifted from the list, and the case that records it.
- **Channel tools:** a lock showing at once on the page and in Discord, and a slowmode set from the dashboard.
- **Announcements:** an embed and plain text, and `@everyone` refused to somebody without Mention Everyone.
- **Open tickets:** a ticket closed from the dashboard, with its transcript naming the person who closed it.
- **The member page:** a timeout, a rename and a role change, each showing on the page without a reload.

---

## 🔧 Upkeep

### Dependencies behind their latest release

| Package                    | Here    | Latest | What it takes                                                                                                                                     |
| -------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discord-html-transcripts` | 3.2.0   | 3.3.0  | It moves to undici 7, so the `undici` override in `package.json` can go. It pins React to exactly 19.1.1, so the React pins in Jest and Vite stay |
| `typescript`               | 5.9.3   | 7.0.2  | The native compiler. `baseUrl` is already gone from `tsconfig.json`; `tsc-alias` and `tsup` need checking with it                                 |
| `mongoose`                 | 8.24.1  | 9.11.4 | A major. Read its migration guide against every repository, then run the suite with `REQUIRE_DB_TESTS=1`                                          |
| `react-router`             | 7.18.2  | 8.5.0  | A major. `useBlocker` (the leave guard) and the lazy routes are what to check first                                                               |
| `msw`                      | 2.15.0  | 3.0.3  | A major, test-only. `handlers.ts` uses it, and so do the steps in `dashboard/screenshots/README.md`                                               |
| `jest-axe`                 | 10.0.0  | 11.0.0 | A major, test-only                                                                                                                                |
| `tsup`                     | 8.5.1   | 9.0.0  | A major. The build's `dist/` checks in AGENTS.md §3 are the test                                                                                  |
| `@anthropic-ai/sdk`        | 0.128.0 | 1.3.0  | Its first major. Only the support assistant's optional model picker uses it                                                                       |

`discord-giveaways` is at its latest, 6.0.1, but that was published in **August 2022** and nothing since. Replacing it
with a giveaway system of the bot's own — records in MongoDB, a job that ends them, entries counted from a button —
would follow the shape the starboard and idea board already have, and drop a dependency nobody maintains.

### Overrides to look at again

Each `overrides` pin in `package.json` exists because a parent asked for a version with an advisory open. Every one
is explained in [`security.md`](security.md); check whether each parent now asks for a fixed version by itself, and
remove the pin when it does: `brace-expansion`, `js-yaml` (both lines), `fast-uri`, and `undici` under
`discord-html-transcripts`.

### Leaving a server forgets most settings, but not levelling's

`purgeGuild` deletes every feature's settings when the bot is removed from a server, except the levelling setup in
`levelsetup`. Members' levels and balances are kept as well, which may be deliberate, since a server that adds the
bot back keeps its standings. The levelling setup is configuration like every other setting, so it most likely
belongs in the purge. Decide, then either add `purgeLevelSettings` to `guildRepository.ts` or write down why not.
