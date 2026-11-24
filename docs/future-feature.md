<div align="center">

# 🔭 Future features

**What could come next: features the bot does not have, screens the dashboard is missing, checks nobody has run
against a live Discord, and the upkeep waiting on dependencies.**

</div>

Nothing here is promised or scheduled. Each entry says what exists already to build on and what a change would have
to respect, so whoever picks one up starts from the code rather than from a blank page. When an entry ships, delete
it from this file in the same pull request.

Checked against the code and the npm registry on **5 November 2026**.

---

## 🖥️ Dashboard screens still missing

None at the moment. `features/commands/commands.utils.ts` is the list that decides which commands have a screen, and
the coverage tile on `/commands` counts it. `/clear` is left out on purpose: deleting a hundred messages from a browser
tab is a worse tool than doing it in the channel, where you can see them.

---

## 🧭 Journeys that could be smoother

Found in the November 2026 audit. Each says what is awkward today, what would be better, and what to build on.

### In Discord

- **Unban by picking, not by ID.** `/unban` asks for a typed user ID, which is anti-pattern 19. Autocomplete it from
  the server's bans, as `/softban remove` now does from active softbans. Build on `readBans` (the Bans screen's read),
  with a short cache, since `guild.bans.fetch` on every keystroke is heavy.
- **Heists that survive a restart, and say they started.** A forming heist lives in memory, so a restart drops it
  (no money is lost), and after **Start now** its message still reads "starts in…" with only the buttons gone. Store
  it like `rouletterounds`, with a sweep job, and redraw the post as under way. Build on `heistActions.util.ts`
  (`heistForming`, `finishHeist`) and the roulette round's repository.
- **When the next daily is ready.** On `/balance`, Daily is only greyed out. Show "Daily `<t:…:R>`" and the streak
  instead. Build on `dailyReady`, `account.lastDaily`, `ECONOMY_COOLDOWNS.daily` and the streak `claimDaily` works out.
- **Take one roulette chip back.** **Clear mine** refunds every chip at once. A select of the reader's own spots
  would take back one. Build on `clearBets`/`addBets` in `rouletteRepository` and `betLines` in `roulettePanel.util.ts`.
- **Search `/help`.** `/help` lists categories in pages of six. A `query` option, autocompleted by the same
  `SupportSearch` `/ask` uses, would open a command's page directly. Build on `supportDesk().suggest`, `commandEntries`
  and `commandPage`.
- **`/help` on the prefix shows the prefix.** A `t?help` page shows slash usage. Pass the prefix when the run came
  from a message. Build on `resolveSurface` in `help.command.ts`.
- **Lift every raid hold at once.** After a false alarm, staff `/unmute` each held account one by one. A **Lift holds
  from this spike** button on the alert, and on the Raid protection screen, would do it in one. Build on `JoinWatch`,
  which already lists the newest joins and whether each was held, and `removeTimeout`, which records a case for each.
- **The bot's own posts in the server's language.** The shared refusals speak eight languages, but the settings
  panels, the notices board, the erase panel, counting, level-ups, treasure, the lottery and the audit log post
  English everywhere. Pass `readerLanguage(interaction)`, or the server's `preferredLocale` for an event, through to
  them and move their copy into `REPLIES`. Build on `say`, `REPLIES` and the `language` parameter `publishVerifyPanel`
  now takes.
- **Counting that says who got there first.** The slower of two correct counts is told "You cannot count twice in a
  row". Check `lastUserId` before the write and react quietly when somebody else got there first. Build on
  `advanceCount`.
- **A lottery draw nobody can interrupt.** A ticket bought during a draw is wiped with the old entries, and a crash
  between paying and `recordDraw` would draw the same entries again. Claim the draw with a status, pay, then release
  only the entries drawn. Build on `claimDueDraw` and `recordDraw`.
- **Cards that retry a missing avatar.** When Discord's CDN fails, the rank and leaderboard cards draw an initial for
  good. Note the fallback and draw the picture once more on the next view. Build on `loadAvatar` returning null and
  `drawAvatarImage`.
- **Warnings listed only to whoever asked.** `/warn list` and `/warn info` answer in the open, while `/case list` is
  private. Making them private is a one-line change, but `privateCommands.test.ts` pins the agreed list, so it is the
  owner's call.

### On the dashboard

- **Undo when unblocking an account.** On the owner console's Blacklist tab, one press lifts a block at once, and the
  reason goes with it. Hold the lift in `UndoProvider` for its window, as deletes are. Build on `useUndo` and
  `BlacklistTab`.
- **Confirm or undo resetting the counting game.** **Reset to zero** on Settings → Counting cannot be taken back.
  Give it an undo window, or ask for the current count to be typed. Build on `UndoProvider`.
- **Keep the member directory's page in the address.** Its pages live in memory, so Back or a reload returns to page
  one. Keep the current cursor in `?after=`, written with `replace`. Build on `CursorTrail` in `lib/paging.ts`,
  `directorySearch` and `useSearchParams`.
- **Bans past Discord's first 1,000.** The Bans screen reads at most 1,000 and says the list was cut short. Page
  Discord's ban list with its `after` cursor, as the member directory pages members. Build on `readBans`,
  `BAN_LIMITS` and `CursorTrail`.
- **A role menu change whose post could not follow.** The route saves the change and answers 400 with the note, so
  the page shows a refusal and a stale list. Answer 200 with the list and a `postNote` code the page words. Build on
  `changeRoleMenu`'s `note` and `Refusal`.
- **Failed reads for channels and roles, said everywhere.** Most pages fall back with `channels.data ?? []`, so a
  failed read looks like a server with no channels. Show one `Warning` with a retry wherever a picker's list did not
  load; the role menus page already does. Build on `ErrorState` and `Refusal`.
- **Insights hours in the reader's own time.** The busiest-hours chart counts UTC hours, and only its sentence says
  so. Send `tz` as the owner console's analytics routes do (`analyticsZoneQuery`) and fold the hours in that zone.
- **The status page from the website's header.** Only the footer links `/status`, which a newcomer on a phone rarely
  reaches. Put **Status** in `SiteShell`'s header from `md` up, and on the 404 page. Build on `SiteLink`.
- **Screen names in the owner's usage figures, translated.** `screenLabel` builds English names from route patterns.
  Name each screen through `config/navigation.ts`'s `labelKey` for its route. Build on `allNavItems` and
  `SCREEN_ROUTES`.

### In the code

- **One plural helper.** Commands each write `count === 1 ? … : …` by hand. A `plural(count, one, many)` in
  `@lib/format` on `Intl.PluralRules` would make them one rule.
- **One per-row refusal helper.** Ideas, appeals, giveaways, reminders and AutoMod each match `mutation.variables` to
  a row to place its refusal. A `refusalFor(mutation, id)` in the dashboard's `lib/` would make that one rule.
- **One number field saved on blur.** Raid protection's `NumberField`, the starboard's `ThresholdField` and join to
  create's `LimitField` and `NameField` are one control written four times; it belongs in `components/form`.

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
- **Settings changed in Discord:** a panel press showing on the Changes page as a command change, and Put back on it.
- **The member directory:** paging through a server of thousands, a role filter on members the bot has never cached, and
  a bulk kick of several with one refused by Discord.
- **Your account:** a profile and a reminder edited on the web and read back with `/profile view` and `/remind list`, and
  one browser signed out from another.
- **A blocked account:** signing in to the blocked page, deleting its data there, and the block surviving the delete.
- **The November 2026 audit's fixes**, each pinned by a test against mocks: `/heist`'s **Start now** playing the heist
  at once, `/giveaway` offering this server's giveaways by prize, two `/play`s on an idle player starting one track, a
  volume change while a track opens, the casino paying before the reply is deferred, and every panel's coloured
  stripe as Discord's client draws it.
- **The atomic database changes**, proved only by the MongoDB suites, which run on CI: a deposit or withdrawal as one
  update, the guarded pushes behind `addInventoryItem` and the lottery's `addEntry`, `recordWarning` counting from its
  own write, `claimCooldown`, `fillSlot`, `emptySlot`, `updatePet` and `addBusiness`, `retrySoftbanAt`, and the
  settings caches on `ReadCache`.

---

## 🔧 Upkeep

### Dependencies behind their latest release

| Package                    | Here    | Latest | What it takes                                                                                                                                                                                                 |
| -------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discord-html-transcripts` | 3.2.0   | 3.3.0  | Not an option: its author has deprecated 3.3.0 as "broken due to a critical bug" and points back to 3.2.0. Wait for the release after it, which should also move to undici 7 and let the `undici` override go |
| `typescript`               | 5.9.3   | 7.0.2  | The native compiler. `baseUrl` is already gone from `tsconfig.json`; `tsc-alias` and `tsup` need checking with it                                                                                             |
| `mongoose`                 | 8.24.1  | 9.12.0 | A major. Read its migration guide against every repository, then run the suite with `REQUIRE_DB_TESTS=1`                                                                                                      |
| `react-router`             | 7.18.2  | 8.5.1  | A major. `useBlocker` (the leave guard) and the lazy routes are what to check first                                                                                                                           |
| `msw`                      | 2.15.0  | 3.0.3  | A major, test-only. `handlers.ts` uses it, and so do the steps in `docs/dashboard/screenshots/README.md`                                                                                                      |
| `@anthropic-ai/sdk`        | 0.128.0 | 1.6.0  | Its first major. Only the support assistant's optional model picker uses it                                                                                                                                   |

`discord-giveaways` is at its latest, 6.0.1, but that was published in **August 2022** and nothing since. Replacing it
with a giveaway system of the bot's own — records in MongoDB, a job that ends them, entries counted from a button —
would follow the shape the starboard and idea board already have, and drop a dependency nobody maintains.

### Overrides to look at again

Each `overrides` pin in `package.json` exists because a parent asked for a version with an advisory open. Every one
is explained in [`security.md`](security.md); remove a pin once its parent asks for a fixed version by itself. On
5 November 2026 none did: minimatch 10 still asks `brace-expansion` `^5.0.5` (only minimatch 11 asks `^5.0.12`),
cosmiconfig 9 asks `js-yaml` `^4.1.0`, ajv asks `fast-uri` `^3.0.1`, `@istanbuljs/load-nyc-config` asks `js-yaml`
`^3.13.1`, and `discord-html-transcripts` 3.2.0 still pins undici v5. On 19 November 2026 jest-environment-jsdom 30.5.2 still
asked jsdom `^26.1.0`. On 10 November 2026 `discord-giveaways` 6.0.1
still asked `deepmerge-ts` `^4.2.1`.
