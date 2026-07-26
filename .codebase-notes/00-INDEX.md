# Testify — Codebase Audit & TypeScript Migration Notes

Complete documentation of the Testify Discord bot as it exists today, plus a blueprint for the
JavaScript → TypeScript rewrite.

**Scope:** 321 JavaScript files · 32,784 lines · 103 slash commands · 67 prefix commands · 55 event modules ·
32 Mongoose schemas · 3 API clients · 10 scripts.

Every number in these documents was produced by walking `src/` programmatically. Nothing is estimated.

---

## How to use these when prompting a rewrite

The documents are sized to be pasted individually. A practical sequence:

| You want to… | Attach |
|---|---|
| Give an agent the whole picture | `00-INDEX.md` + `01-ARCHITECTURE.md` + `04-AUDIT-FINDINGS.md` |
| Set up the new project | `migration/12-TOOLING.md` + `migration/10-TARGET-ARCHITECTURE.md` |
| Define the core framework | `migration/11-TYPED-CONTRACTS.md` + `migration/18-HELPERS-AND-UTILS.md` |
| Build the shared helpers | `migration/18-HELPERS-AND-UTILS.md` |
| Port one command category | `commands/<Category>.md` + `migration/11-TYPED-CONTRACTS.md` + `migration/17-CODING-STANDARDS.md` |
| Port the data layer | `07-DATA-MODEL.md` + `migration/11-TYPED-CONTRACTS.md` |
| Merge a duplicated command pair | `migration/13-DEDUPLICATION-MAP.md` + both category docs |
| Write tests | `migration/16-TESTING-STRATEGY.md` |
| Review a PR / set house style | `migration/17-CODING-STANDARDS.md` |
| Make the bot self-hostable, add community files | `migration/19-OPEN-SOURCE.md` |
| Decide what to work on next | `migration/14-MIGRATION-PHASES.md` |
| Find where a specific file goes | `migration/15-FILE-MAPPING.md` |

**Toolchain decisions already made** (recorded in `12-TOOLING.md`): **TypeScript on CommonJS**, **Jest** with
`@swc/jest`, tsup for the build, ESLint flat config + Prettier, Node 22, Mongoose 8. The bot stays **MIT open
source and must work on a fresh clone** — see `19-OPEN-SOURCE.md`.

**Start with `migration/14-MIGRATION-PHASES.md`.** It has an ordered plan, and its Phase 0 lists work that
should happen in JavaScript *before* any TypeScript is written.

---

## Audit

| Document | Contents |
|---|---|
| [`01-ARCHITECTURE.md`](01-ARCHITECTURE.md) | Layer map, boot sequence, both dispatch traces, event binding tally, runtime state, data flow |
| [`02-CONTRACTS.md`](02-CONTRACTS.md) | The four module contracts as they exist, every deviation, the 20 ad-hoc `client.*` properties, custom-ID conventions |
| [`03-METRICS.md`](03-METRICS.md) | Full inventory of all 321 files: path, LOC, exports, schemas, dependencies |
| [`04-AUDIT-FINDINGS.md`](04-AUDIT-FINDINGS.md) | **100 findings, severity-ranked** — start here for defects |
| [`05-DEPENDENCIES.md`](05-DEPENDENCIES.md) | Every npm dependency: undeclared, dead, redundant, and TypeScript readiness |
| [`06-ENVIRONMENT.md`](06-ENVIRONMENT.md) | All 20 env vars, three competing `.env` loaders, `config.js`, the casing bugs |
| [`07-DATA-MODEL.md`](07-DATA-MODEL.md) | All 32 schemas, the duplicate-model data bug, access patterns and performance |

## Infrastructure

| Document | Covers |
|---|---|
| [`infra/index.md`](infra/index.md) | `src/index.js` — the entry point, line by line |
| [`infra/config.md`](infra/config.md) | `src/config.js` — all ~110 keys |
| [`infra/functions.md`](infra/functions.md) | `src/functions/` — the loader layer. **The highest-priority rewrite target** |
| [`infra/client.md`](infra/client.md) | `src/client/` — DisTube, giveaways, audit logs |
| [`infra/utils.md`](infra/utils.md) | `src/utils/` **and `src/lib/`** — all 24 helper files |
| [`infra/api.md`](infra/api.md) | `src/api/` — Instagram, Spotify, Valorant |
| [`infra/server-jobs-triggers.md`](infra/server-jobs-triggers.md) | `src/server/`, `src/jobs/`, `src/triggers/` |
| [`infra/scripts.md`](infra/scripts.md) | All 10 maintenance scripts |
| [`infra/tests.md`](infra/tests.md) | Jest setup, mocks, fixtures, coverage gaps |
| [`infra/ci-and-site.md`](infra/ci-and-site.md) | Workflows, `site/`, root config, README accuracy |

## Per-category

One document per folder, each with an overview table (lines, command, declared `category`, DM usability,
permission gate), aggregate signals, and a per-file section covering purpose, exports, imports, schemas,
external URLs, env vars, issues and rewrite notes.

- **[`commands/`](commands/)** — 26 documents (24 categories + context menus)
- **[`prefix/`](prefix/)** — 11 documents
- **[`events/`](events/)** — 13 documents

## Migration blueprint

| Document | Contents |
|---|---|
| [`migration/10-TARGET-ARCHITECTURE.md`](migration/10-TARGET-ARCHITECTURE.md) | Target folder tree, typed client, loader, router, shared command core, embed factory, decisions to confirm |
| [`migration/11-TYPED-CONTRACTS.md`](migration/11-TYPED-CONTRACTS.md) | Full interfaces: `SharedCommand`, `CommandContext`, events, components, models, `.d.ts` shims, `tsconfig` strictness |
| [`migration/12-TOOLING.md`](migration/12-TOOLING.md) | `package.json`, `tsconfig`, tsup, ESLint, Prettier, **Jest**, CI, dependency changes |
| [`migration/13-DEDUPLICATION-MAP.md`](migration/13-DEDUPLICATION-MAP.md) | All 46 duplicated command pairs → single implementations, plus non-command duplication |
| [`migration/14-MIGRATION-PHASES.md`](migration/14-MIGRATION-PHASES.md) | Phases 0–7 with exit criteria, sequencing rules, risk register |
| [`migration/15-FILE-MAPPING.md`](migration/15-FILE-MAPPING.md) | **All 321 files** → target TypeScript path or deletion |
| [`migration/16-TESTING-STRATEGY.md`](migration/16-TESTING-STRATEGY.md) | Jest setup, the testing pyramid, mocking discord.js, the `CommandContext` harness, repository and concurrency tests, regression tests per finding, coverage targets |
| [`migration/17-CODING-STANDARDS.md`](migration/17-CODING-STANDARDS.md) | Naming, file organisation, **the anti-patterns that must not come back**, error handling, async, imports, JSDoc, commits, the PR checklist |
| [`migration/18-HELPERS-AND-UTILS.md`](migration/18-HELPERS-AND-UTILS.md) | Full API for every shared module, each stating which duplication it eliminates, plus the build order |
| [`migration/19-OPEN-SOURCE.md`](migration/19-OPEN-SOURCE.md) | Self-hostability, the missing GitHub templates, `SECURITY.md`, releases, README corrections, good-first-issue backlog |

---

## The ten things that matter most

Condensed from `04-AUDIT-FINDINGS.md`. Detail and file paths are there.

1. **Two Mongoose models share the `economies` collection** with different shapes. Three commands write
   through the legacy 10-field model against documents the other 19 wrote with 27 fields — **this can strip
   inventory, pets, houses and streaks.** Fix before the rewrite.
2. **Three features are silently dead.** Welcome cards and default-prefix seeding have *never run* — both
   event handlers declare a wrong signature so their first guard always returns. `/ai` is registered with
   Discord but hard-blocked by `underDevelopment: true`.
3. **Four logging features are disabled for most self-hosters.** The env setup script writes the webhook keys
   lowercase; the code reads them camelCase.
4. **The loader is the `dist/` blocker.** Five `fs.readdirSync("./src/…")` calls resolve against the CWD, and
   seven dynamic `require()`s cannot be typed or resolved by `tsc`.
5. **Money can be duplicated.** Every balance mutation is read-modify-`save()` with no atomic operation, and
   the lottery interval has no overlap guard.
6. **27 concurrent `interactionCreate` listeners** with no router, three custom-ID separator conventions, and
   at least one live collision that throws `InteractionAlreadyReplied`.
7. **46 of 67 prefix commands duplicate a slash command** — but 26 commands, including *all* music playback,
   are prefix-only. The prefix layer cannot simply be deleted.
8. **459 `EmbedBuilder` instantiations with no factory.** One helper removes roughly 800 lines.
9. **Six dependencies are imported but never declared**, resolving only through transitive hoisting — and
   eleven declared packages are never imported, including `puppeteer` (~300 MB).
10. **`npm install` runs at every boot**, and `npm run log-setup` **overwrites a file inside `node_modules`** —
    a patch that every install destroys.

---

## Conventions used in these documents

- **Findings are numbered** (finding 1–100) in `04-AUDIT-FINDINGS.md`; other documents cite those numbers.
- **Line counts** are physical lines. `wc -l` reports 32,613 because **171 files lack a trailing newline**;
  the true total is 32,784. Reconciliation in `03-METRICS.md`.
- **⚠️ in a category table** means the file's declared `category` string disagrees with its folder.
- **Severity icons:** 🔴 broken today · 🟠 latent or exploitable · 🟡 correctness risk · 🔵 structural.
- Per-file sections marked _"Structural entry"_ have verified structural data (exports, imports, schemas,
  dependencies, metrics) but no hand-written behavioural narrative — read the source for those.

---

*Generated from commit on branch `claude/discord-bot-audit-y46kjt`. Regenerate the measured documents
(`03-METRICS.md`, `15-FILE-MAPPING.md`, and the per-category docs) after significant changes so the figures
stay honest.*
