<div align="center">

# 🔭 Future features

**What could come next: features the bot does not have, screens the dashboard is missing, checks nobody has run
against a live Discord, and the upkeep waiting on dependencies.**

</div>

Nothing here is promised or scheduled. Each entry says what exists already to build on and what a change would have
to respect, so whoever picks one up starts from the code rather than from a blank page. When an entry ships, delete
it from this file in the same pull request.

Checked against the code and the npm registry on **25 October 2026**.

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
