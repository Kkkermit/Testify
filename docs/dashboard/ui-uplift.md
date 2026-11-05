# Dashboard UI uplift

**Status: done on `testify/feature-ui-uplift`, which goes to `develop` as one pull request.** This is the plan for
moving the whole dashboard to the **Channels** direction (I) from [the redesign brief](redesign/README.md#i-channels),
and for building the six further ideas listed there. The phase table below says what each phase did.

The prototype is [`redesign/i-channels/index.html`](redesign/i-channels/index.html). Its look and its channel pages
were kept; its channel list in the sidebar and its dragging were tried and taken out (see
[Decisions taken](#decisions-taken)).

---

## Contents

1. [What changes](#what-changes)
2. [What does not change](#what-does-not-change)
3. [The new map of the dashboard](#the-new-map-of-the-dashboard)
4. [Where every current screen goes](#where-every-current-screen-goes)
5. [The data the new screens need](#the-data-the-new-screens-need)
6. [The look](#the-look)
7. [Phases](#phases)
8. [How a phase is finished](#how-a-phase-is-finished)
9. [Decisions taken](#decisions-taken)

---

## What changes

The dashboard keeps its sidebar of feature sections, which is the quickest way to a screen, and gains a view of the
server the way Discord shows it.

- **The sidebar** is Overview, Channels, Members and Settings, then Community, Messages, Moderation, Stats, Economy
  and Entertainment, each holding only the screens it names.
- **A Channels page lists what Testify does in each channel**, in Discord's order, showing only the channels the reader
  can see, then what works across the whole server.
- **A channel's page shows what Testify does there, as it will appear there.** The welcome message is drawn as the
  message itself, and clicking it edits it. Each block also links to the feature's full page.
- **A feature's channel is chosen on its own page.** The overview keeps its stat tiles and feature grid, so something
  not set up reads as "Not set up" there and opens the page that sets it up.
- **Every feature page reads the same way**: one sentence saying what the feature does right now, then its settings
  as rows, and a preview beside any message it posts.
- **Six new screens** come from the brief's further ideas: an **Inbox** of what needs you, **This week** (what Testify
  will do in the next seven days), a page per **role** showing what gives or uses it, **Send me a test** beside
  anything that posts, **history and restore** on the Changes page, and **several servers side by side**.
- **The look** is the prototype's: light and dark palettes, Rubik and Fira Mono, rows instead of cards, no starfield,
  no glow and no eyebrows. Motion is CSS transitions only, and only where something changed.

## What does not change

Everything in AGENTS.md §24 still holds. The rules this work is most likely to trip over are:

- **Every route keeps working.** The help articles link dashboard paths and `supportAccuracy.test.ts` fails on any
  path `routes.tsx` no longer declares. Bookmarks and quick search also depend on them. New screens add routes;
  nothing is renamed or removed.
- **The dashboard owns no logic.** A channel page, the inbox and the role page read through the same repositories
  and `*Actions.util.ts` the commands use. Editing a post on a channel page writes through that feature's existing
  route, so its validation and `requireReach` checks apply unchanged.
- **A channel its reader cannot see is named nowhere.** The Channels page and every channel page are built from
  `seenChannels`. A feature working in a hidden channel says "a channel you can't see", as the pickers already do.
- **`requireGuild` stays the boundary.** Every new route sits under `/guilds/:guildId/*` and inherits it, and
  `accessWalk.test.ts` and `ASKS_MORE` grow with them.
- **The CSP is untouchable.** Fonts are self-hosted, and no script is inline. Motion animates through inline styles
  set from script, which `style-src 'unsafe-inline'` already allows, as it does for tippy.
- **Six languages, every string through i18next.** `untranslated.test.ts`, `locales.test.ts` and `voice.test.ts`
  apply to every new screen.
- **The accessibility floor only rises.** Every channel row is a link with a name, a setting row keeps its control's
  accessible name, and axe runs on every new page.
- **Tokens stay the single source.** There is no hex value in a `.tsx` file, and every colour is a
  `light-dark()` pair measured by `contrast.test.ts`.

## The new map of the dashboard

Inside a server the shell is:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Testify  [TH Testify HQ ⌄]                                Search (Ctrl K) │
├─────────────────────┬─────────────────────────────────────────────────────┤
│ ◎ Overview          │                                                     │
│ ✉ Inbox          3  │   The page for whatever is chosen on the left.      │
│ ◷ This week         │                                                     │
│ # Channels          │                                                     │
│ ☺ Members           │                                                     │
│ ⛉ Roles             │                                                     │
│ ⚙ Settings          │                                                     │
│ ▸ Community         │                                                     │
│ ▸ Messages          │                                                     │
│ ▸ Moderation        │                                                     │
│ ▸ Stats             │                                                     │
│ ▸ Economy           │                                                     │
│ ▸ Entertainment     │                                                     │
└─────────────────────┴─────────────────────────────────────────────────────┘
```

- **Overview** is the stat tiles, the setup checklist, the feature grid, missing permissions and recent changes. Once
  the Inbox exists it gains one line linking to it whenever something needs you.
- **Inbox**, **This week** and **Roles** arrived in phase 6, at the top beside Overview, because each covers the whole
  server rather than one feature.
- **Channels** lists the channels the bot works in, each opening its own page, then what works across the whole
  server.
- **The sections** hold every feature page, each under what it is for. They are pinned by `navigation.test.ts`.

On a phone the same sidebar is the drawer behind the menu button.

## Where every current screen goes

No URL changes. This table is phase 5's checklist: where each screen sits in the sidebar, whether it posts a message
that gets a preview beside its editor, and whether its page has been restyled.

| Screen                                       | Sidebar       | Preview             | Restyled                  |
| -------------------------------------------- | ------------- | ------------------- | ------------------------- |
| `/guilds/:id`                                | Overview      | —                   | Kept as it is             |
| `…/channels`, `…/channels/:channelId`        | Channels      | Its posts           | Built in phases 3 and 4   |
| `…/welcome` (greeting and goodbye)           | Community     | Both messages       | Done                      |
| `…/birthdays`                                | Community     | The birthday post   | Done                      |
| `…/levelling`                                | Community     | —                   | Done                      |
| `…/role-menus`                               | Community     | —                   | Done                      |
| `…/ideas`                                    | Community     | —                   | Done                      |
| `…/starboard`                                | Community     | —                   | Done                      |
| `…/temp-voice`                               | Community     | —                   | Done                      |
| `…/announcements`                            | Messages      | The announcement    | Done                      |
| `…/scheduled-messages`                       | Messages      | Each post           | Done                      |
| `…/sticky`                                   | Messages      | Each sticky message | Done                      |
| `…/auto-responders`                          | Messages      | Each reply          | Done                      |
| `…/automod`                                  | Moderation    | —                   | Done                      |
| `…/raid-protection`                          | Moderation    | —                   | Done                      |
| `…/warnings`                                 | Moderation    | —                   | Done                      |
| `…/cases`                                    | Moderation    | —                   | Done                      |
| `…/bans`                                     | Moderation    | —                   | Done                      |
| `…/channel-tools`                            | Moderation    | —                   | Done                      |
| `…/tickets`                                  | Moderation    | The ticket panel    | Done                      |
| `…/audit-log`                                | Moderation    | —                   | Done                      |
| `…/changes` (history and restore in phase 8) | Moderation    | —                   | Kept; phase 8 rebuilds it |
| `…/insights`                                 | Stats         | —                   | Kept; a page of figures   |
| `…/member-count`                             | Stats         | —                   | Kept; a page of figures   |
| `…/bot-stats`                                | Stats         | —                   | Done                      |
| `…/treasure`                                 | Economy       | —                   | Done                      |
| `…/lottery`                                  | Economy       | —                   | Done                      |
| `…/casino`                                   | Economy       | —                   | Done                      |
| `…/music`                                    | Entertainment | —                   | Done                      |
| `…/giveaways`                                | Entertainment | The giveaway post   | Done                      |
| `…/members`, `…/members/:userId`             | Members       | —                   | Done                      |
| `…/settings`                                 | Settings      | —                   | Done                      |
| `…/commands`                                 | Commands      | —                   | Done                      |

A list page — bans, cases, warnings, changes, the members list, commands — keeps its list and gains only the summary,
since its rows are records rather than settings. A member's own page is a record too, but every card on it was a form,
so each became a group of rows under a summary of where the member stands.

Outside a server, `/guilds`, `/commands`, `/status`, `/notifications`, `/help`, `/appearance`, `/owner` and the public
site keep their routes and are restyled in phase 10.

**New routes:**

- `/guilds/:id/channels` (built)
- `/guilds/:id/channels/:channelId` (built)
- `/guilds/:id/inbox` (built)
- `/guilds/:id/week` (built)
- `/guilds/:id/roles` (built)
- `/guilds/:id/roles/:roleId` (built)
- `/servers`

A channel is addressed by id, never by name. Names change and can repeat, and the id is a snowflake `parseParams`
already knows how to check.

## The data the new screens need

| Need                            | Source                                                                                                                                                                                                                                                                                                                                 | New?                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Which channel each feature uses | `FEATURE_SOURCES` in `src/lib/settings/featureStatus.util.ts` reads every feature's settings once, and each reading now carries its channels as well. `placesOf` answers the map and `featuresOf` the overview, from the same read, so the two cannot disagree about whether a feature is on.                                          | **Phase 1**: `GET /guilds/:id/places`                      |
| The channel list                | `GET /guilds/:id/channels` (`ChannelSummary`, with `name: null` for one the reader cannot see). Categories need their parent id, which `ChannelSummary` does not carry yet.                                                                                                                                                            | Phase 1 adds `parentId`                                    |
| Inbox                           | Open tickets (`/tickets`), ideas awaiting a decision (`/ideas`), missing permissions (overview), features whose channel the bot cannot post in (`canSend` × places). A post that failed is not recorded anywhere today.                                                                                                                | Phase 6: one read route; failed posts are a question below |
| This week                       | Scheduled messages' next times, the lottery draw, giveaways ending, upcoming birthdays. Each is stored already. Reminders stay out, because they belong to a person, not the server.                                                                                                                                                   | Phase 6: one read route                                    |
| What a role gets                | Level rewards and boosts, roles on join, role menus, DJ roles, the ticket staff role, raid protection's alert role and the verified role, each read from its own repository.                                                                                                                                                           | Phase 6: one read route                                    |
| Send me a test                  | `testPostMessage` builds each kind with the function its real post uses (`greetingFor`, `farewellFor`, `birthdayPost`, `announcementMessage`) and sends it to the reader's DMs, pinging nobody. Three a minute, audit-logged by kind.                                                                                                  | **Phase 7**: `POST /guilds/:id/test-post`                  |
| History and restore             | Nothing records settings changed with commands in Discord, so no slider can rebuild a past setup. Each dashboard settings write keeps every field it could restore, before and after (`auditSettings`), and **Put back** re-applies the old values through the feature's own route while the setting still holds what the change left. | **Phase 8**: no new route                                  |
| Several servers                 | Each server's own `GET /guilds/:id/overview` and `/channels`, so `requireGuild` checks every column live; the servers offered come from `/auth/me`.                                                                                                                                                                                    | **Phase 9**: no new route                                  |

## The look

From the prototype, with a dark half added. The current tokens' role names stay, so every component follows the
palette change.

| Role             | Light     | Dark                      |
| ---------------- | --------- | ------------------------- |
| Ground           | `#f2f3f6` | `#1f2125`                 |
| Sidebar          | `#e7e9ee` | `#191b1f`                 |
| Surface (blocks) | `#ffffff` | `#282b30`                 |
| Ink              | `#1b1e24` | `#eceef1`                 |
| Muted            | `#565d6b` | `#a2a7b0`                 |
| Line             | `#d9dde4` | `#383c43`                 |
| Accent (plum)    | `#8a2a6b` | `#e08ac4`                 |
| Accent wash      | `#f6e9f2` | `#3a2433`                 |
| Mention text     | `#3b48b8` | `#c9d0ff`                 |
| Mention wash     | `#e6e9fb` | `rgb(120 140 255 / 0.22)` |

The dark values are a starting point. `contrast.test.ts` decides them, and any pair it refuses is changed until it
passes.

- **Type.** Rubik for everything and Fira Mono for placeholders and ids, both self-hosted as `woff2` with Latin,
  Latin Extended and Cyrillic subsets, with their OFL licences beside them. Space Grotesk, Inter and JetBrains Mono
  leave `dashboard/public/fonts`. The canvas fonts in `assets/fonts` are a separate set and stay.
- **Accents.** Plum becomes the default. The twelve-accent picker on Appearance stays, each accent re-measured
  against the new grounds.
- **Removed in phase 2:** `Backdrop` and `lib/three/`, except `tokens.ts`, which the console greeting reads and
  which moved to `lib/`; three.js itself; the body wash; the focal card's gradient and the cards' inset highlight;
  the tinted badges. `Eyebrow` became `SectionHeading`, the page's own type with no letterspacing or rule.
- **Removed in phase 10:** `Reveal`, `AnimatedNumber` and `useCountUp`, and the fade on every navigation and the
  pop on the sign-in card, so nothing moves on load. The feature tints became six colours named by hue, one per part
  of the bot as the sidebar groups it, and came back on icons only, over a neutral tile rather than a wash. The overview's
  stat tiles stay, with their figure in Rubik.
- **Motion.** CSS transitions only. The `motion` library was planned for the channel pages and turned out not to be
  needed, so it was never added.

## Phases

Each phase is one or more commits on this branch. Each leaves the dashboard working with `npm run check` green, so
the branch can be reviewed or paused at any point.

| #   | Phase                                                                                                                                                                                                                                                                                                                                                                                  | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 0   | This plan                                                                                                                                                                                                                                                                                                                                                                              | Done   |
| 1   | **The channel map's data.** `shared/src/places.ts` (types and the feature list), each `FEATURE_SOURCES` reading carrying its channels, `GET /guilds/:id/places`, `parentId` on `ChannelSummary`, and tests, including one that fails when the feature list and `FEATURE_SOURCES` disagree. No visible change.                                                                          | Done   |
| 2   | **Foundations.** New tokens in `index.css`, light and dark, and the fonts. Remove the backdrop, the wash and the eyebrow. Restyle `Card`, `Badge`, `PageHeader` (a breadcrumb that names the server, so `pageHeader.test.ts` keeps its rule), the form controls and `SwitchTrack`. Re-measure every accent in `contrast.test.ts`, and update guide §19 and AGENTS §24.                 | Done   |
| 3   | **The shell.** The sidebar with Overview, Channels, Members, Settings and a section for each kind of feature; a Channels page and a page per channel listing what works where, each linking to its full page; quick search finds channels. Inbox, This week and Roles join the sidebar with their pages in phase 6. `navigation.test.ts` pins every server path.                       | Done   |
| 4   | **Channel pages.** Each feature working in a channel gets a block drawn with `DiscordPreview`, and the welcome, goodbye and birthday messages are edited in place. Level-ups have no template, so their block describes them. The drag-and-drop overview built here was taken out after review, with the sidebar's channel list: see Decisions.                                        | Done   |
| 5   | **Every feature page restyled**, one per commit, in the order of the table above, each keeping its route and tests: the sentence summary at the top, settings as rows (`SettingRows`, which turns every `Field` and `Toggle` inside it into a row), and the preview beside anything that posts. The table above marks each page.                                                       | Done   |
| 6   | **Inbox, This week, Roles** (ideas 1–3), each with its read route and its page, at the top of the sidebar beside Overview.                                                                                                                                                                                                                                                             | Done   |
| 7   | **Send me a test** (idea 4), beside every preview of a post on its own screen and on a channel's page. Tickets and giveaways have none, since their controls cannot work in a DM.                                                                                                                                                                                                      | Done   |
| 8   | **History and restore** on the Changes page (idea 5): **Put back** on eighteen kinds of settings change, guarded by what the setting holds now. See Decisions.                                                                                                                                                                                                                         | Done   |
| 9   | **Several servers side by side** (idea 6), read-only: `/guilds/compare`, two to four servers in columns, linked from the server picker and quick search.                                                                                                                                                                                                                               | Done   |
| 10  | **Everything outside a server**: the server picker, commands, status, notifications, help, appearance, the owner console, sign-in and the public site, in the new tokens. Nothing moves on load, no feature wears a tint, and labels and figures are in Rubik, sentence case.                                                                                                          | Done   |
| 11  | **Finish**: the README's twelve screenshots re-shot from the built bundle, AGENTS §24 and the guide brought up to date, and a sweep of 570 page loads at 320, 390, 820 and 1440 in both themes, with `prefers-contrast: more` and reduced motion and axe run in the page. It found four contrast failures and ungrouped counts under a POSIX browser language, each fixed with a test. | Done   |

## How a phase is finished

- `CI=true npm run check` passes, and `npm run build` succeeds with `verify:bundle`.
- Every new rule has a test, and every enforcement test is shown to fail with its rule removed.
- Every new string is in all six locales.
- Every new page is covered by axe through `src/test/axe.ts`, and the read-failure and write-failure branches render
  (AGENTS §24, "A tab whose read fails says so").
- Screens that changed are checked in a real browser, because jsdom cannot see a layout.
- AGENTS.md §24 and `docs/dashboard/guide.md` say what the phase changed, in the same commit.

## Decisions taken

**Changed after review.** The end of phase 3 read best, and phase 4 made the dashboard harder to use, so the
sidebar's channel list, the overview's waiting chips, dragging, **Place in** and **Move to** were all taken out. The
overview is phase 3's again, the Channels and Everywhere pages became one Channels page, and the sidebar names screens
only. Channel pages keep their Discord previews and in-place editing. The sidebar's More and Every feature sections
went too: each feature page sits in the section its purpose names — Community, Messages, Moderation, Stats, Economy or
Entertainment — as it did before this work.

**Colour came back, quieter.** Phase 10 took every feature tint away; after review each category's hue came back on
its icon only, over a neutral tile, grouped as the sidebar groups the bot, so command categories can be told apart
without a page of tinted tiles. Appearance gained a colour of the reader's own beside the twelve accents, fitted to
each theme, and every preset now has a wash of its own.

**History is Put back, not a slider.** The brief asked for a slider back through the server's setup. Settings changed
with commands in Discord are not recorded anywhere, so a past setup cannot be rebuilt from what is kept, and a slider
would show a configuration that never existed. Each dashboard settings change instead carries **Put back**, offered
only while the setting still holds what that change left, so a later change made either way is never silently undone.
Recording command changes too is in `docs/future-feature.md`.

**Taken, and easy to change:**

- **The branch.** It is `testify/feature-ui-uplift`, as asked, rather than the next `testify/feature-NN`. It starts
  from `testify/docs-05` (`develop` plus the redesign brief), so the prototype and the brief travel with it.
- **No route moves.** New screens are added; old URLs keep working.
- **A channel is addressed by id.**
- **Plum is the new default accent**, and the other eleven stay.
- **The dark theme** follows the graphite recommended in the brief.
- **The first-load budget does not move.** Motion stays out of the first load, as above, rather than the budget
  rising to make room for it.
- **The inbox shows what is already stored.** Failed posts are not recorded, so there is no new collection and no
  change to the privacy notice. Adding them later is a phase of its own.
- **Several servers side by side stays read-only.** Copying a setup between servers is a new kind of write across
  several permission checks, and is left for a later decision.
