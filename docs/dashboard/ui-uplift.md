# Dashboard UI uplift

**Status: in progress on `testify/feature-ui-uplift`.** This is the working plan for moving the whole dashboard to the
**Channels** direction (I) from [the redesign brief](redesign/README.md#i-channels), and for building the six further
ideas listed there. It is updated as each phase lands, and the phase table below says where things stand.

The prototype is [`redesign/i-channels/index.html`](redesign/i-channels/index.html): open it in a browser, drag a
chip onto a channel, open `#welcome` and click the message.

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

Today the dashboard is organised by feature: a sidebar of about forty screens in five sections, each screen a form.
After this work it is organised the way the server already is in Discord.

- **A Channels page lists what Testify does in each channel**, in Discord's order, showing only the channels the reader
  can see, then what works across the whole server. The sidebar keeps one entry for it rather than the channels
  themselves.
- **A channel's page shows what Testify does there, as it will appear there.** The welcome message is drawn as the
  message itself, and clicking it edits it. Each block also links to the feature's full page.
- **A feature's channel is chosen on its own page.** The overview keeps its stat tiles and feature grid, so something
  not set up reads as "Not set up" there and opens the page that sets it up.
- **Six new screens** come from the brief's further ideas: an **Inbox** of what needs you, **This week** (what Testify
  will do in the next seven days), a page per **role** showing what gives or uses it, **Send me a test** beside
  anything that posts, **history and restore** on the Changes page, and **several servers side by side**.
- **The look** is the prototype's: light and dark palettes, Rubik and Fira Mono, rows instead of cards, no starfield,
  no glow and no eyebrows. Motion comes from [Motion](https://motion.dev), used only where something changed.

## What does not change

Everything in AGENTS.md §24 still holds. The rules this work is most likely to trip over are:

- **Every route keeps working.** The help articles link dashboard paths and `supportAccuracy.test.ts` fails on any
  path `routes.tsx` no longer declares. Bookmarks and quick search also depend on them. New screens add routes;
  nothing is renamed or removed.
- **The dashboard owns no logic.** A channel page, the inbox and the role page read through the same repositories
  and `*Actions.util.ts` the commands use. Placing or moving a feature writes through that feature's existing route,
  so its validation and `requireReach` checks apply unchanged.
- **A channel its reader cannot see is named nowhere.** The channel list and every channel page are built from
  `seenChannels`. A feature placed in a hidden channel says "a channel you can't see", as the pickers already do.
- **`requireGuild` stays the boundary.** Every new route sits under `/guilds/:guildId/*` and inherits it, and
  `accessWalk.test.ts` and `ASKS_MORE` grow with them.
- **The CSP is untouchable.** Fonts are self-hosted, and no script is inline. Motion animates through inline styles
  set from script, which `style-src 'unsafe-inline'` already allows, as it does for tippy.
- **Six languages, every string through i18next.** `untranslated.test.ts`, `locales.test.ts` and `voice.test.ts`
  apply to every new screen.
- **The accessibility floor only rises.** Drag and drop always has a keyboard route (Place in, Move to). Every channel
  row is a link with a name, and axe runs on every new page.
- **Tokens stay the single source.** There is no hex value in a `.tsx` file, and every colour is a
  `light-dark()` pair measured by `contrast.test.ts`.

## The new map of the dashboard

> [!NOTE]
> This is the map as first planned. After review the sidebar lists screens rather than channels, and nothing is
> dragged; [Decisions taken](#decisions-taken) has what changed.

Inside a server, the shell becomes:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Testify  [TH Testify HQ ⌄]                         Search (Ctrl K)  ●  K  │
├─────────────────────┬─────────────────────────────────────────────────────┤
│ ◎ Overview          │                                                     │
│ ✉ Inbox          3  │   The page for whatever is chosen on the left.      │
│ ◷ This week         │                                                     │
│                     │                                                     │
│ INFORMATION         │                                                     │
│  # welcome       1  │                                                     │
│  # rules            │                                                     │
│ CHAT                │                                                     │
│  # general       2  │                                                     │
│ SUPPORT             │                                                     │
│  # support       1  │                                                     │
│ ♪ Lounge            │                                                     │
│                     │                                                     │
│ Everywhere       5  │                                                     │
│ Members · Roles     │                                                     │
│ Moderation          │                                                     │
│ Settings · More     │                                                     │
└─────────────────────┴─────────────────────────────────────────────────────┘
```

- **Overview** is "Where Testify works" (channel by channel), "Waiting for a channel" (the chips) and a short
  "Needs you" that links to the Inbox.
- **The channel list** uses the server's own category names, which is why those are shown exactly as Discord has them.
  Every other label is translated.
- **Everywhere** lists the server-wide features, each opening its full page.
- **Members · Roles** is the member tables and the new role pages.
- **Moderation** holds warnings, cases, bans, channel tools and the Changes page with its history.
- **Settings · More** holds server settings, commands, insights, and the screens that are neither placed nor
  server-wide, such as announcements.

On a phone, the sidebar is the first screen, as Discord's own app does it. Choosing a channel opens it with
"‹ Channels" to return, which is the layout the prototype already shows.

## Where every current screen goes

No URL changes. This table says how each screen is reached in the new map, and whether its page is restyled in place
or also shown as a block on a channel page.

| Today                            | In the new map                                                                                                                    | On a channel page                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `/guilds/:id`                    | Overview, rebuilt                                                                                                                 | —                                |
| `…/welcome`                      | Its channel; full page kept                                                                                                       | Welcome message, edited in place |
| `…/welcome` (goodbye card)       | Its channel                                                                                                                       | Goodbye message, edited in place |
| `…/levelling`                    | Its announcement channel, and Everywhere for XP                                                                                   | Level-up message                 |
| `…/birthdays`                    | Its channel                                                                                                                       | Birthday message                 |
| `…/starboard`                    | Its board channel                                                                                                                 | A sample repost                  |
| `…/ideas`                        | Its board channel                                                                                                                 | A sample idea post               |
| `…/role-menus`                   | Each menu's channel                                                                                                               | The menu's post                  |
| `…/tickets`                      | Panel channel and transcript channel                                                                                              | The ticket panel; transcripts    |
| `…/sticky`                       | Each sticky's channel                                                                                                             | The sticky message               |
| `…/scheduled-messages`           | Each schedule's channel                                                                                                           | The post and its next time       |
| `…/auto-responders`              | Everywhere (they answer in any channel)                                                                                           | —                                |
| `…/temp-voice`                   | Its lobby (a voice channel)                                                                                                       | The lobby's settings             |
| `…/member-count`                 | Its counter channels (voice)                                                                                                      | The live names                   |
| `…/bot-stats`                    | Its channel                                                                                                                       | The stats message                |
| `…/giveaways`                    | Each giveaway's channel                                                                                                           | The giveaway post                |
| `…/lottery`                      | Its announcement channel, if set; otherwise Everywhere                                                                            | The draw post                    |
| `…/audit-log`                    | Its log channel                                                                                                                   | A sample log entry               |
| `…/cases`                        | Moderation; its log channel                                                                                                       | A sample case post               |
| `…/raid-protection`              | Everywhere; its alert channel                                                                                                     | A sample alert                   |
| `…/automod`                      | Everywhere                                                                                                                        | —                                |
| `…/warnings`                     | Moderation                                                                                                                        | —                                |
| `…/bans`                         | Moderation                                                                                                                        | —                                |
| `…/channel-tools`                | Moderation, and a **Lock** / **Slowmode** row on every channel page                                                               | Lock and slowmode controls       |
| `…/changes`                      | Moderation, with history and restore (idea 5)                                                                                     | —                                |
| `…/announcements`                | More, and **Announce here** on every channel page                                                                                 | A composer that posts here       |
| `…/treasure`                     | Everywhere (drops land in active channels)                                                                                        | —                                |
| `…/casino`                       | Everywhere                                                                                                                        | —                                |
| `…/music`                        | Everywhere                                                                                                                        | —                                |
| `…/settings`                     | Settings (prefix, nickname, link filter, roles on join, verification, counting); verification and counting also on their channels | Verification and counting posts  |
| `…/insights`                     | More                                                                                                                              | Messages a day for that channel  |
| `…/members`, `…/members/:userId` | Members                                                                                                                           | —                                |
| `…/commands`                     | Settings                                                                                                                          | —                                |

Outside a server, `/guilds`, `/commands`, `/status`, `/notifications`, `/help`, `/appearance`, `/owner` and the public
site keep their routes and are restyled in phase 10.

**New routes:**

- `/guilds/:id/channels/:channelId`
- `/guilds/:id/everywhere`
- `/guilds/:id/inbox`
- `/guilds/:id/week`
- `/guilds/:id/roles`
- `/guilds/:id/roles/:roleId`
- `/servers`

A channel is addressed by id, never by name. Names change and can repeat, and the id is a snowflake `parseParams`
already knows how to check.

## The data the new screens need

| Need                            | Source                                                                                                                                                                                                                                                                                        | New?                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Which channel each feature uses | `FEATURE_SOURCES` in `src/lib/settings/featureStatus.util.ts` reads every feature's settings once, and each reading now carries its channels as well. `placesOf` answers the map and `featuresOf` the overview, from the same read, so the two cannot disagree about whether a feature is on. | **Phase 1**: `GET /guilds/:id/places`                      |
| The channel list                | `GET /guilds/:id/channels` (`ChannelSummary`, with `name: null` for one the reader cannot see). Categories need their parent id, which `ChannelSummary` does not carry yet.                                                                                                                   | Phase 1 adds `parentId`                                    |
| Placing and moving              | Each feature's own write route. The dashboard holds one small map from feature to its route and field, so no second write path exists.                                                                                                                                                        | Phase 4                                                    |
| Inbox                           | Open tickets (`/tickets`), ideas awaiting a decision (`/ideas`), missing permissions (overview), placed features whose channel the bot cannot post in (`canSend` × places). A post that failed is not recorded anywhere today.                                                                | Phase 6: one read route; failed posts are a question below |
| This week                       | Scheduled messages' next times, the lottery draw, giveaways ending, upcoming birthdays. Each is stored already. Reminders stay out, because they belong to a person, not the server.                                                                                                          | Phase 6: one read route                                    |
| What a role gets                | Level rewards and boosts, roles on join, role menus, DJ roles, the ticket staff role, raid protection's alert role and the verified role, each read from its own repository.                                                                                                                  | Phase 6: one read route                                    |
| Send me a test                  | The bot's own renderers (`fillTemplate`, the welcome card), as `/welcome test` already uses, sent to the reader's DMs. Rate-limited and audit-logged.                                                                                                                                         | Phase 7: one write route                                   |
| History and restore             | `dashboardaudit` keeps `before` and `after` for dashboard changes. Whether changes made with commands in Discord are recorded is to be checked first. Restore re-applies `before` through the feature's own route.                                                                            | Phase 8                                                    |
| Several servers                 | The overview per server the reader manages, checked live like `requireGuild`.                                                                                                                                                                                                                 | Phase 9: read-only first                                   |

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
- **Still to remove**, with the screens that use them: the feature tints, `StatTile` on the overview, and `Reveal`,
  `AnimatedNumber` and `useCountUp`.
- **Motion.** The shell moves with CSS transitions only. `motion` arrives in phase 4, imported only by the channel
  pages, which are lazily loaded routes, so the first load does not grow. `MotionConfig reducedMotion="user"` sits
  beside the existing `data-motion` attribute. What moves is listed in the
  [brief's Motion section](redesign/README.md#motion-what-moves-and-why).

## Phases

Each phase is one or more commits on this branch. Each leaves the dashboard working with `npm run check` green, so
the branch can be reviewed or paused at any point.

| #   | Phase                                                                                                                                                                                                                                                                                                                                                                         | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 0   | This plan                                                                                                                                                                                                                                                                                                                                                                     | Done   |
| 1   | **The channel map's data.** `shared/src/places.ts` (types and the feature list), each `FEATURE_SOURCES` reading carrying its channels, `GET /guilds/:id/places`, `parentId` on `ChannelSummary`, and tests, including one that fails when the feature list and `FEATURE_SOURCES` disagree. No visible change.                                                                 | Done   |
| 2   | **Foundations.** New tokens in `index.css`, light and dark, and the fonts. Remove the backdrop, the wash and the eyebrow. Restyle `Card`, `Badge`, `PageHeader` (a breadcrumb that names the server, so `pageHeader.test.ts` keeps its rule), the form controls and `SwitchTrack`. Re-measure every accent in `contrast.test.ts`, and update guide §19 and AGENTS §24.        | Done   |
| 3   | **The shell.** The sidebar with Overview, Channels, Members, Settings and the Moderation, More and Every feature sections; a Channels page and a page per channel listing what works where, each linking to its full page; quick search finds channels. Inbox, This week and Roles join the sidebar with their pages in phase 6. `navigation.test.ts` pins every server path. | Done   |
| 4   | **Channel pages.** Each feature working in a channel gets a block drawn with `DiscordPreview`, and the welcome, goodbye and birthday messages are edited in place. Level-ups have no template, so their block describes them. The drag-and-drop overview built here was taken out after review, with the sidebar's channel list: see Decisions.                               | Done   |
| 5   | **Every feature page restyled**, one per commit, in the order of the table above, each keeping its route and tests: rows rather than cards, the sentence summary at the top, and the preview beside anything that posts.                                                                                                                                                      | To do  |
| 6   | **Inbox, This week, Roles** (ideas 1–3), each with its read route and its page.                                                                                                                                                                                                                                                                                               | To do  |
| 7   | **Send me a test** (idea 4).                                                                                                                                                                                                                                                                                                                                                  | To do  |
| 8   | **History and restore** on the Changes page (idea 5).                                                                                                                                                                                                                                                                                                                         | To do  |
| 9   | **Several servers side by side** (idea 6), read-only.                                                                                                                                                                                                                                                                                                                         | To do  |
| 10  | **Everything outside a server**: the server picker, commands, status, notifications, help, appearance, the owner console, sign-in and the public site, in the new tokens.                                                                                                                                                                                                     | To do  |
| 11  | **Finish**: re-shoot the README's screenshots, update AGENTS §24 and the guide throughout, run a browser sweep at 320, 390, 820 and 1440 in both themes, with `prefers-contrast: more` and reduced motion, then open a pull request into `develop`.                                                                                                                           | To do  |

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
only. Channel pages keep their Discord previews and in-place editing.

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
