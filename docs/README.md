<div align="center">

# 📚 Testify documentation

**Everything written down about this project, in one place. Start with whichever row describes you.**

[![Commands: generated](https://img.shields.io/badge/commands.md-generated-8b5cf6?style=for-the-badge&logo=markdown)](commands.md)
[![Images: generated](https://img.shields.io/badge/card_images-generated-8b5cf6?style=for-the-badge&logo=files)](images/bot)
[![Conventions: AGENTS.md](https://img.shields.io/badge/conventions-AGENTS.md-0ea5e9?style=for-the-badge&logo=bookstack&logoColor=white)](../AGENTS.md)

</div>

---

## 🧭 Where to start

| You are…                                     | Read                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| 🚀 Running the bot for the first time        | [`../README.md`](../README.md#-quick-start) — install, configure, start                 |
| 🐳 Hosting it in Docker, Railway or a VPS    | [`hosting.md`](hosting.md) — the image, compose, and the traps                          |
| 📋 Looking for what a command does           | [`commands.md`](commands.md) — every one, generated from the code                       |
| 🤝 About to contribute a change              | [`contributing.md`](contributing.md), then [`../AGENTS.md`](../AGENTS.md)               |
| 🔒 Reporting a security problem              | [`security.md`](security.md) — the private route, and how data is handled               |
| 🖥️ Working on the web dashboard              | [`dashboard/guide.md`](dashboard/guide.md)                                              |
| 🤔 Wondering why the code is shaped this way | [`../AGENTS.md`](../AGENTS.md) §21 and §22 — the decisions, and the defects they answer |

> [!NOTE]
> [`../AGENTS.md`](../AGENTS.md) stays in the repository root deliberately: it is the single set of conventions
> for changing this codebase, and the file both people and coding agents are expected to find first.
> [`../CLAUDE.md`](../CLAUDE.md) only points at it.

---

## 🗂️ The files

### For everyone

| File                                          | What it is                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| 📋 [`commands.md`](commands.md)               | Every command, subcommand and alias. **Generated** — run `npm run docs:commands` |
| 🤝 [`contributing.md`](contributing.md)       | Branches, commit format, house style and what CI will check                      |
| 🐳 [`hosting.md`](hosting.md)                 | Running the bot and dashboard in Docker, and what is deliberately not there      |
| 🔒 [`security.md`](security.md)               | Reporting a vulnerability, the data model, and every dependency exception        |
| 🌱 [`code-of-conduct.md`](code-of-conduct.md) | The standard everybody here is held to, and how to report a problem              |

### The dashboard

The web dashboard is a workspace of its own (`dashboard/`), with an API inside the bot process (`src/api/`).

| File                                                           | What it is                                                                       |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 🖥️ [`dashboard/guide.md`](dashboard/guide.md)                  | The practical guide: layout, components, the six edits a screen takes, the traps |
| 📸 [`dashboard/screenshots/`](dashboard/screenshots/README.md) | The screens the root README shows, and how to retake one when a screen changes   |

`AGENTS.md` §24 wins wherever it and `dashboard/guide.md` disagree.

### Images

| Folder                                                | What is in it                                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 🎨 [`images/bot/`](images/bot)                        | The bot's own cards — rank, leaderboard, welcome, now playing and the casino. **Generated** by `npm run docs:images` |
| 📸 [`dashboard/screenshots/`](dashboard/screenshots/) | The dashboard, captured from the built bundle against stub data                                                      |
| 🖼️ [`banner.png`](banner.png)                         | The banner at the top of the root README                                                                             |

<p align="center">
  <img alt="A rank card" src="images/bot/rank-card.png" width="49%">
  <img alt="A welcome card" src="images/bot/welcome-card.png" width="49%">
</p>

---

## ✍️ Adding to these docs

Keep each document in the tree that owns its subject, and link it from the tables above so it can be found.
Four rules keep this from rotting:

1. **Generated files are never hand-edited.** `commands.md` and the card images are regenerated, not edited.
2. **A fact lives in one place.** If two documents would both state the Node floor, neither should — point at
   `.nvmrc`.
3. **A picture never shows a real person.** Card images use invented members, and screenshots are taken against
   stub data, so no real account, server or snowflake appears in one.
4. **Finished plans are deleted, not kept.** A plan whose work is done is history, and `git log` already keeps
   it; the rules it produced belong in `AGENTS.md` or the dashboard guide.
