# 9. Screens and journeys

## The principle

The bot's panels already got this right and the dashboard should inherit it: **show the current state, and make
changing it the same gesture as reading it.** `CLAUDE.md` records why `/levelling setup` and `/levelling edit`
are one screen — the panel shows the configuration, so setting up and changing it are not two activities. The web
UI has more room, which means fewer excuses for hiding a setting behind a second click.

Two rules carried over from the bot, because they were learned the hard way:

- **Never offer someone else's data as actionable.** Viewing a member's economy account shows their balance
  read-only unless you have the permission to change it.
- **Re-read before you write.** Optimistic UI updates the screen immediately, but the server re-reads the stored
  config before applying a change, so two managers with the page open cannot overwrite each other silently.

## Journey 1 — a server manager sets up levelling

The journey the whole dashboard is justified by. Target: under 90 seconds, no documentation.

1. **Land on `/`.** Not signed in → `/sign-in`: the bot's avatar, one sentence saying what the dashboard does, one
   **Sign in with Discord** button, and a line naming the two permissions requested and why. Nothing else.
2. **Discord consent**, then back. If they have used it before, `prompt=none` makes this invisible.
3. **`/guilds`.** A grid of guild cards: icon, name, member count. Guilds where the bot is present are actionable;
   the rest show **Invite Testify** instead. One search box, focused on load, because someone in 40 servers should
   type not scroll.
4. **`/guilds/:id`.** Overview: four stat tiles, a feature grid showing which systems are on, a permission warning
   banner if the bot is missing something it needs, and recent dashboard changes. **Levelling** shows "Off" with a
   **Set up** button.
5. **`/guilds/:id/levelling`.** The same four groups the Discord panel uses — Overview, XP boosts, Role rewards,
   Ignored — as tabs, but with all the fields visible rather than one screen at a time.
6. **Toggle "Members earn XP".** Optimistic: the switch moves immediately, the rest of the page un-dims, a
   `SavingIndicator` reads _Saving…_ then _Saved_.
7. **Add a boost role.** A role picker showing every role with its real colour. Roles the bot cannot see are still
   selectable — a boost role does not need to be assignable. Picking one adds a row at ×2 with a segmented
   ×1–×5 control.
8. **Add a level reward.** Number input plus role picker. Roles **above the bot in the hierarchy are disabled**
   with a tooltip explaining why — this is the check `applyLevelRewards` already does at runtime, surfaced at
   configuration time instead of failing silently later. That is a genuine improvement on the Discord panel.
9. **Done.** No Save button; each control applied as it was pressed, matching the panel's behaviour and the
   reasoning in `CLAUDE.md`.

Failure branches worth designing rather than discovering:

- Save fails with `missing_manage_guild` → the switch rolls back and a toast says they no longer have Manage
  Server. Not a generic "something went wrong".
- Their session expired → the query layer sees a 401, `RequireAuth` redirects to `/sign-in?returnTo=…`, and after
  signing in they land back on the levelling page, not on `/guilds`.
- The bot was removed from the guild while they were editing → 404 with "Testify is no longer in this server" and
  an invite link.

## Journey 2 — the owner audits the fleet

1. **`/owner`.** Guilds, total members, uptime, memory, commands run today, database status. If a recent-errors
   buffer exists, the last few with timestamps.
2. **`/owner/guilds`.** A table: name, members, owner, joined, which features are configured. Sortable, filterable,
   paged. This answers "which of my 30 servers has never configured anything".
3. **Click through to any guild's normal pages** — the owner sees the manager UI for that guild, no separate
   read-only mode to maintain.
4. **Leave a guild** from the row menu. `AlertDialog` requiring the guild's name typed exactly.
5. **`/owner/blacklist`.** Add by user ID with a reason, list, remove. Global by design (`CLAUDE.md` §12), and the
   UI should say so — a manager could otherwise assume it is guild-scoped.

## Journey 3 — dealing with a member

1. From the overview or the leaderboard, click a member → `/guilds/:id/members/:userId`.
2. One page: their Discord profile, economy account, level and rank, warning history, softban status.
3. Actions in one place: warn, remove a warning, softban, reset economy, grant XP, set level.
4. Every action is confirmed if destructive, audit-logged always, and shows the _result_ — "Warned. They now have
   3 warnings." rather than "Success".

## Journey 4 — the self-hoster's first run

Covered fully in `12-SETUP.md`, but it is a UX journey and belongs here too. They start the bot with
`DASHBOARD_ENABLED=true` and no OAuth secret configured. The dashboard must not 500. It shows a **setup screen**:
what is missing, where in the Discord Developer Portal to find it, the exact redirect URI to paste, and the env
line to add. Getting this wrong is where most self-hosted dashboards lose people.

## Every screen

| Route                         | Purpose                  | Key elements                                                   |
| ----------------------------- | ------------------------ | -------------------------------------------------------------- |
| `/sign-in`                    | Authenticate             | One button; scopes explained; no marketing                     |
| `/guilds`                     | Choose a guild           | Search, cards, invite CTA for guilds without the bot           |
| `/guilds/:id`                 | Health at a glance       | Stat tiles, feature grid, permission warnings, recent changes  |
| `/guilds/:id/levelling`       | Configure levelling      | 4 tabs, live role/channel pickers, hierarchy warnings          |
| `/guilds/:id/audit-logging`   | Choose logged events     | Channel picker + 18 event switches, Save (mirrors the panel)   |
| `/guilds/:id/welcome`         | Join messages            | Message editor with a live preview and a placeholder reference |
| `/guilds/:id/automod`         | Filters                  | Word lists, spam thresholds, bypass roles                      |
| `/guilds/:id/economy`         | Economy settings + board | Leaderboard table, treasure drops, lottery, danger zone        |
| `/guilds/:id/moderation`      | Warnings and softbans    | Filterable tables, act from a row                              |
| `/guilds/:id/members/:userId` | One member               | Profile, economy, level, warnings, actions                     |
| `/owner`                      | Fleet health             | Stats, errors                                                  |
| `/owner/guilds`               | Every guild              | Sortable table, leave                                          |
| `/owner/blacklist`            | Global blocks            | Add, list, remove                                              |
| `/owner/commands`             | Command runner           | Generated forms, rendered output (`06-COMMAND-CONTROL.md`)     |

## Audit logging is the one screen with a Save button

Deliberate, and it mirrors the Discord panel exactly. The bot's audit panel batches edits into a draft and writes
once, because "which events, where" is a single decision and half of it applied is not a state anyone wants —
whereas levelling applies immediately because each control is independent (`CLAUDE.md`). The web UI keeps the
same split, so someone who uses both surfaces is never surprised.

That means the web audit page needs the same affordances: a dirty indicator, a disabled Save when nothing has
changed, and an "unsaved changes" prompt if they try to navigate away. `useBlocker` from React Router does the
last one.

## States every screen must have

The four that get skipped, and what they should be here:

**Loading** — skeletons matching the real layout's shape, not a centred spinner. The page should not jump when
data arrives. Never a full-page spinner for a partial update.

**Empty** — an icon, one sentence explaining what would be here, and the button that creates the first one. "No
warnings — nobody has been warned in this server" beats an empty table with headers.

**Error** — what failed, whether it is retryable, and one action. Distinguish: 403 (a permissions message and a
route home), 404 (bot not in guild, with an invite link), 429 (retry-after countdown), 500 (a retry button and,
for owners, the error id to search the logs with).

**Permission-degraded** — the state unique to a Discord dashboard, and the one nobody plans for. The bot is in
the guild but missing `Manage Roles`, so level rewards will silently not apply. A warning banner on the overview
and an inline warning on the affected control, both linking to Discord's role settings. The bot already detects
this (`applyLevelRewards` logs it); the dashboard should show it _before_ it costs someone an evening.

## Small things that decide whether it feels finished

- **The guild switcher stays in the header** on every guild page, so moving between servers is one click, not
  Back-Back-click.
- **Deep links work.** `/guilds/123/levelling` opens with the levelling tab active. Tab state in the URL.
- **Optimistic toggles with rollback** (`07-FRONTEND.md`). A switch that waits 400ms feels broken.
- **Destructive actions want the name typed.** Wiping a guild's economy is not a thing to do by mis-click.
- **Toasts say what happened, not that something happened.** "Levelling turned off" not "Saved".
- **Numbers are formatted** with the same `formatNumber` the bot uses — shared code, identical output on both
  surfaces.
- **Relative times have a real timestamp in the tooltip.** "2 hours ago" is friendly; "14:02 on 30 July" is what
  you need when diagnosing.
- **Nothing is behind a hover.** Touch has no hover, and neither does a keyboard.
