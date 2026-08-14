# Testify documentation

Everything written down about this project, in one place. Start with whichever row describes you.

| You are…                                  | Read                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| Running the bot for the first time        | [`../README.md`](../README.md) — install, configure, start                |
| Hosting it in Docker                      | [`hosting.md`](hosting.md) — the image, compose, and the traps            |
| Looking for what a command does           | [`commands.md`](commands.md) — all 76, generated from the code            |
| About to contribute a change              | [`contributing.md`](contributing.md), then [`../CLAUDE.md`](../CLAUDE.md) |
| Reporting a security problem              | [`security.md`](security.md)                                              |
| Working on the web dashboard              | [`dashboard/guide.md`](dashboard/guide.md)                                |
| Wondering why the code is shaped this way | [`original-bot/04-AUDIT-FINDINGS.md`](original-bot/04-AUDIT-FINDINGS.md)  |

[`../CLAUDE.md`](../CLAUDE.md) stays in the repository root deliberately: it is the single set of conventions
for changing this codebase, and it is the file both people and coding agents are expected to find first.

---

## The files

### For everyone

| File                                   | What it is                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| [`commands.md`](commands.md)           | Every command and subcommand. **Generated** — run `npm run docs:commands`    |
| [`contributing.md`](contributing.md)   | How to propose a change: branches, commit format, what CI will check         |
| [`hosting.md`](hosting.md)             | Running the bot and dashboard in Docker, and what is deliberately not there  |
| [`security.md`](security.md)           | How to report a vulnerability, and what is in scope                          |
| [`site-handover.md`](site-handover.md) | What the deleted `site/` static page contained, and what is worth rebuilding |

### The dashboard

The web dashboard is a workspace of its own (`dashboard/`), with an API inside the bot process (`src/api/`).

| File                                                          | What it is                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`dashboard/guide.md`](dashboard/guide.md)                    | The practical guide: layout, components, the six edits a screen takes, the traps     |
| [`dashboard/re-write.md`](dashboard/re-write.md)              | The UI rewrite plan — phases, invariants, exit criteria                              |
| [`dashboard/design-plan/`](dashboard/design-plan/00-INDEX.md) | The original design documents: scope, auth, permissions, API, accessibility, roadmap |
| [`dashboard/screenshots/`](dashboard/screenshots/README.md)   | The images the root README embeds, and how to retake one when a screen changes       |

`CLAUDE.md` §24 wins wherever it and `dashboard/guide.md` disagree.

### The original bot

[`original-bot/`](original-bot/00-INDEX.md) documents the **JavaScript bot that Testify v2 replaced**, and the
plan that produced the rewrite. It is history — nothing in it describes the code in this repository. Two parts
still carry weight:

- [`04-AUDIT-FINDINGS.md`](original-bot/04-AUDIT-FINDINGS.md) — 100 defects found in the original. The
  conventions in `CLAUDE.md` exist to stop each of them coming back.
- [`migration/17-CODING-STANDARDS.md`](original-bot/migration/17-CODING-STANDARDS.md) — the authoritative
  naming and error-handling standard, which beats `CLAUDE.md` where the two overlap.

---

## Adding to these docs

Keep each document in the tree that owns its subject, and link it from the tables above so it can be found.
Three rules that keep this from rotting:

- **Generated files are never hand-edited.** `commands.md` says so at the top; regenerate it instead.
- **A fact lives in one place.** If two documents would both state the Node floor, neither should — point at
  `.nvmrc`.
- **History is labelled as history.** `original-bot/` describes deleted code, and its index says so before
  anything else does.
