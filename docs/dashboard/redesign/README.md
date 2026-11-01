# Dashboard redesign: a proposal

**Status: proposal. Nothing here is built.** It is a brief for one decision: which of three directions the
dashboard should be redrawn in. Once a direction is chosen, the plan at the end says what changes, in what order and
in which files.

The aim is a dashboard that reads as something a person made for running a Discord bot. Today it reads as a
generated template: a dark page with a glow, a starfield, a card around everything and a tinted icon square in
every card. The brief keeps every feature, route and permission exactly as it is. Only the visual design changes.

Each direction is mocked up as static HTML for the same two screens, the server overview and **Welcome and
goodbye**, with the second screen also shown at phone width. The pages use invented data: a server called Testify
HQ with 1,234 members, and people called Orbit, Nova, kate and Juniper.

| Direction                              | Overview                                                        | Welcome and goodbye                                           | Phone                              |
| -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| [A. Plain settings](#a-plain-settings) | [png](a-plain/overview.png) · [html](a-plain/overview.html)     | [png](a-plain/welcome.png) · [html](a-plain/welcome.html)     | [png](a-plain/welcome-phone.png)   |
| [B. Speaks Discord](#b-speaks-discord) | [png](b-discord/overview.png) · [html](b-discord/overview.html) | [png](b-discord/welcome.png) · [html](b-discord/welcome.html) | [png](b-discord/welcome-phone.png) |
| [C. Logbook](#c-logbook)               | [png](c-logbook/overview.png) · [html](c-logbook/overview.html) | [png](c-logbook/welcome.png) · [html](c-logbook/welcome.html) | [png](c-logbook/welcome-phone.png) |

**Recommendation:** build A, and take one thing from B: drawing every message the bot will post the way Discord
draws it, right beside the setting that changes it. The reasons are in [the recommendation](#recommendation).

> [!NOTE]
> The mockups load their fonts from Google Fonts so that they open in a browser with nothing installed. The
> dashboard itself cannot do that, because the CSP allows no outside font host and Testify never phones home. The
> real build self-hosts each font in `dashboard/public/fonts`, as it does today. All three typefaces are under the
> SIL Open Font License.

---

## What makes it read as generated today

Measured against the screenshots in [`../screenshots/`](../screenshots/) and the tokens in
`dashboard/src/index.css`. Each item is a pattern that turns up across generated dashboards. Any one of them on its
own is fine. All of them together are what reads as generated.

1. **Something is always moving behind the page.** Every screen draws a WebGL starfield (`components/motion/
Backdrop.tsx`, mounted in `AppShell` and `SiteShell`). Under it, `body` carries two radial gradients in the
   accent colours (`index.css`, the `body` rule in `@layer base`). The page never sits still on a plain background.
2. **Near-black with a violet glow.** The background is `#07070b`, cards are `#12121c` and the primary is
   `#7c3aed`. A violet accent on near-black is the most common default in generated interfaces.
3. **A card around everything.** The overview is a grid of cards, and so are the settings, the stat tiles and
   the recent changes. When every group is a box, nothing stands out. The `surface-edge` inset highlight on each
   one adds to the effect.
4. **Eyebrows.** `Eyebrow.tsx` draws a short accent rule, then a letter-spaced mono label in capitals
   ("—— FEATURES"). It sits above page headers and section headings. This is the most recognisable generated
   pattern on the page.
5. **An icon in a tinted square.** Each feature has a tint (`config/features.ts`, guide §19.3), drawn as a
   coloured square holding an icon. Six tints, one per kind of feature, so the colours carry no meaning.
6. **Numbers without a sentence.** The overview opens with stat tiles: a large mono number over a small label.
   The reader has to work out what the numbers mean, when the page could say it.
7. **Pills.** On and Off, counts and statuses all use the same rounded badge, so they all carry the same weight.
8. **Type picked to look technical.** Space Grotesk for headings, Inter for body text and JetBrains Mono for
   numbers. Each is a good face, but this pairing is a common default.

What is **not** wrong: the structure. The routes, the sidebar sections, the order of a settings screen, the
permission warnings, the undo and the server switcher are all sound. The problem is the visual layer around them,
which is why this can be done mostly in tokens and primitives.

## Principles the three directions share

- **Rows, not cards.** A setting is a row: what it is and what it does on the left, the control on the right, a
  hairline underneath. A container is used only for something that is a separate object: a preview of a message, a
  warning that needs action, a dialog.
- **Say it in a sentence.** Every screen opens with one sentence describing how things stand right now, for
  example "New members are greeted in #welcome with a picture card." A sentence replaces a row of stat tiles.
- **Speak Discord.** `#channel` and `@role` are drawn the way Discord draws them. A message the bot will post is
  shown as the message itself, not described.
- **Sentence case.** No letter-spaced capitals and no eyebrows. A heading is a heading.
- **Nothing behind the content.** No glow, no starfield and no gradient wash.
- **Colour has a meaning or it isn't used.** Green means on, grey means off, amber means it needs you, red means
  it destroys something. The accent colour marks only actions and where you are.
- **Type chosen for reading.** A humanist sans for everything, and mono only where characters must line up:
  times, IDs and `{placeholders}`.

## What it was compared with

[Mobbin](https://mobbin.com), the screen library the design skills reach for, needed a paid plan, so it was not
used. The rest is split into sources read for this brief and products drawn from memory, and the table says which
is which.

| Source                                                                                                                                                                                                          | What it gave                                                                                                                                                                                                        | Read for this brief?                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [Shopify Polaris, app settings layout](https://polaris.shopify.com/patterns/app-settings-layout)                                                                                                                | The description on the left and the controls on the right, grouped under a plain heading. This is the row in A.                                                                                                     | Yes                                   |
| [GNOME Settings, list rows](https://gitlab.gnome.org/GNOME/gnome-control-center/-/issues/2829)                                                                                                                  | One setting per row inside a list, rather than a card per setting.                                                                                                                                                  | Yes                                   |
| [21st.dev settings component](https://21st.dev/@vijayksingh/components/settings.md)                                                                                                                             | A sample of what a generated settings page looks like today, used as a list of things to avoid.                                                                                                                     | Yes                                   |
| ["I Can Tell AI Built Your Dashboard"](https://usergroups.tableau.com/events/details/tableau-st-louis-tableau-user-group-presents-i-can-tell-ai-built-your-dashboard-and-thats-a-problem/) (Tableau user group) | A talk listing the same marks found above: decoration in place of meaning, and numbers in place of a statement.                                                                                                     | The listing only, not the talk itself |
| Discord's own server settings and channel view                                                                                                                                                                  | The server rail, the settings list grouped like channel categories, the notice strip, the member list, and the way a message and a mention are drawn. The source of B, and of the previews in all three directions. | From memory                           |
| GitHub repository settings                                                                                                                                                                                      | A sidebar of plain words, a heading with a rule under it, and Danger zone as the only coloured section.                                                                                                             | From memory                           |
| macOS System Settings                                                                                                                                                                                           | One sentence under a switch saying what it does.                                                                                                                                                                    | From memory                           |
| Linear, Plausible                                                                                                                                                                                               | Plausible's single sentence at the top in place of tiles, and Linear's restraint with colour.                                                                                                                       | From memory                           |

---

## The three directions

### A. Plain settings

![Direction A, overview](a-plain/overview.png)

**The idea.** The dashboard as a well-kept settings document. It has a light page, a sidebar of plain words, one
readable column, and headings with a rule under them. Every setting is a row. It looks the way GitHub's settings
or Polaris look, and that is intended: people already know how to read that kind of page.

| Role      | Value                  | Use                                                    |
| --------- | ---------------------- | ------------------------------------------------------ |
| Page      | `#ffffff`              | Background of the content                              |
| Side      | `#f5f6f7`              | Sidebar                                                |
| Ink       | `#1c1f24`              | Text                                                   |
| Muted     | `#5c6370`              | Help text, dates (6.0:1 on white)                      |
| Rule      | `#e3e6ea`              | Hairlines between rows                                 |
| Primary   | `#5843d1`              | Links, switches, current item. Violet kept, but deeper |
| On        | `#1d7a4b`              | "On", "Saved"                                          |
| Attention | `#8a5a00` on `#fff7e0` | The one callout that needs action                      |
| Danger    | `#c22a2a`              | Delete, ban, leave                                     |

**Type.** IBM Plex Sans (400, 500, 600) for everything, and IBM Plex Mono for placeholders and IDs. Plex was drawn
for interfaces and reads as engineered without looking futuristic. Sizes: 13 for help, 14 for body, 16 for section
headings and 24 for the page title.

**Layout.**

```
┌────────────┬──────────────────────────────────────────────┐
│ TH Testify │ Servers / Testify HQ                         │
│            │ Testify HQ                                   │
│ Overview   │ 1,234 members … running 2 of 14 features.    │  ← the sentence
│ Insights   │ ┌ Level rewards aren't being handed out … ┐  │  ← only callout
│            │ Features ─────────────────────── Show all 14 │
│ Community  │ Levelling  2 rewards, #general  ● On  Change │  ← rows
│ Welcome    │ Tickets    From #support        ● On  Change │
│ Levelling  │ Recently changed ─────────────── Everything  │
│ …          │ You turned on level-up announcements…  30 Jul│
└────────────┴──────────────────────────────────────────────┘
```

**Signature.** The sentence at the top of every screen. The overview says how many features are running and when
anything last changed. Welcome and goodbye says where new members are greeted and whether anyone is told when
someone leaves. The page answers "how are things set up?" before the reader looks at a single control.

![Direction A, Welcome and goodbye](a-plain/welcome.png)

**What it costs.** It is the least work of the three. The routes and navigation stay as they are, and the data
already exists: the overview's API returns each feature's state (`FeatureDetail`), the missing permissions and the
recent changes. Most of the change is tokens plus five primitives.

**The risk.** Plain can tip into anonymous. This direction depends on the sentences being good and on the Discord
previews, which is why the recommendation adds B's preview to it.

---

### B. Speaks Discord

![Direction B, overview](b-discord/overview.png)

**The idea.** The dashboard arranged the way Discord is arranged, so that someone who runs a server already knows
how to use it. A server rail switches servers. A settings list is grouped like channel categories. The header looks
like a channel's header, with a strip across the top when something needs fixing. Features are listed the way
Discord lists members, under Running and Off.

| Role    | Value                                  | Use                                                              |
| ------- | -------------------------------------- | ---------------------------------------------------------------- |
| Rail    | `#16181b`                              | Server rail                                                      |
| List    | `#1f2125`                              | Settings list, feature list                                      |
| Page    | `#282b30`                              | Content                                                          |
| Field   | `#1b1d21`                              | Inputs                                                           |
| Ink     | `#eceef1`                              | Text                                                             |
| Muted   | `#a2a7b0`                              | Help, times (5.9:1 on page)                                      |
| Rule    | `#383c43`                              | Dividers                                                         |
| Primary | `#23806f`                              | Switches and buttons, a teal of Testify's own (4.8:1 with white) |
| On      | `#3fb27f`                              | Status dot for "running"                                         |
| Notice  | `#8a5a12`                              | The strip across the top (5.9:1 with white)                      |
| Mention | `#c9d0ff` on `rgb(120 140 255 / 0.22)` | `#channel`, `@role`, `@member`                                   |

**Type.** Noto Sans for everything, and Noto Sans Mono for placeholders. Discord's own face, gg sans, is
proprietary. Noto Sans has a similar plain build, which keeps the page close to Discord without copying it.

**Layout.**

```
┌──┬────────────┬───────────────────────────────────┬──────────────┐
│TH│ Testify HQ │ ▓ Testify can't hand out rewards … Show me how ▓ │  ← notice strip
│GN│ Overview   │ Overview │ What Testify has done lately │ Search │
│PC│ Insights   │ ─────────── Today ───────────     │ Running — 2  │
│+ │ ⌄Community │ (T) Testify APP  14:02 in #general│ ● Levelling  │
│  │  Welcome   │     GG @Orbit, you reached level 10│ ● Tickets    │
│  │  Levelling │ ⚠ The reward @Regulars wasn't given│ Off — 12     │
│  │ ⌄Moderation│ → kkk turned on announcements …   │ ○ Welcome    │
│  │ kkk  Sign out                                   │ ○ AutoMod    │
└──┴────────────┴───────────────────────────────────┴──────────────┘
```

**Signature.** What the bot does, drawn as Discord draws it. The overview is a feed of what Testify recently posted
in the server: a level-up with the reward it could not give underneath, a ticket opening, a warning. Each settings
screen sits beside a slice of the channel it posts in, showing the message as members will see it and updating as
you type.

![Direction B, Welcome and goodbye](b-discord/welcome.png)

**What it costs.** It is the most work of the three.

- **New layout.** The three columns replace `AppShell`, `Sidebar`, `SidebarSection` and `MobileNav`.
- **New data.** The overview feed needs data the dashboard does not have. The bot does not record what it posts,
  so level-ups and ticket openings would need a new record or a new read. _This is a functional change, outside
  a visual brief. Flagged for whoever builds it._
- **A light theme.** The light half of every token would need designing from scratch.

**The risk.** The closer it gets to Discord, the more it looks like an imitation, and an imitation of Discord's
own interface is a brand problem as well as a taste one. It must never use Discord's blurple, its logo, gg sans or
its exact greys. The mockup keeps away from all four. The one exception is the small APP tag in a preview, which
Discord itself draws on every bot message.

---

### C. Logbook

![Direction C, overview](c-logbook/overview.png)

**The idea.** The overview is a record of what happened in the server, written as sentences and grouped by day:
who levelled up, who opened a ticket, who joined, which setting a manager changed and which warning a moderator
gave. Settings pages read like a form you fill in. Navigation moves to the top as six places named for what is done
there: Activity, Members, Moderation, Community, Economy and Settings.

| Role      | Value                                                                                               | Use                                                    |
| --------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Page      | `#f7f8fa`                                                                                           | Background                                             |
| Sheet     | `#ffffff`                                                                                           | The one container: the page's main subject             |
| Ink       | `#16181d`                                                                                           | Text                                                   |
| Muted     | `#5f6672`                                                                                           | Help, times (5.4:1 on page)                            |
| Rule      | `#e3e6eb`                                                                                           | Dividers                                               |
| Primary   | `#3046c5`                                                                                           | Links, current sub-page, checkboxes (7.5:1 with white) |
| Attention | `#9a5b00` on `#fff8eb`                                                                              | Needs attention                                        |
| Area dots | `#1a7a50` community, `#c2412d` moderation, `#b7791f` economy, `#3046c5` settings, `#6b7280` members | One colour per area of the log, with a key beside it   |

**Type.** Atkinson Hyperlegible Next for text and Atkinson Hyperlegible Mono for times. The Braille Institute
designed the family so that letters easily confused (I, l and 1; 0 and O) look different, which suits a page full
of usernames and IDs. The visible trade-off is a slashed zero in ordinary text ("310"). Some readers will like it
and some will not.

**Layout.**

```
┌────────────────────────────────────────────────────────────────┐
│ T Testify  [TH Testify HQ ⌄]  Activity  Members  Moderation …  │
├──────────────────────────────────────────┬─────────────────────┤
│ Testify HQ                               │ ▌Needs attention     │
│ A quiet week. About 310 messages a day … │ ▌Level rewards …     │
│ ┌──────────────────────────────────────┐ │                     │
│ │ Everything  Moderation  Members  …   │ │ Running here        │
│ │ Today  Thursday 30 July              │ │ Levelling    Change │
│ │ 14:02 ● Orbit reached level 10 …     │ │ Tickets      Change │
│ │ 11:40 ● Juniper opened ticket 0042 … │ │                     │
│ │ 10:05 ● You turned on announcements… │ │ Dots                │
│ └──────────────────────────────────────┘ │ ● Community …       │
└──────────────────────────────────────────┴─────────────────────┘
```

**Signature.** The log. A server manager's first question is usually "what's been going on?", and this answers
it in sentences, in order, with the time down the side.

![Direction C, Welcome and goodbye](c-logbook/welcome.png)

**What it costs.**

- **Navigation.** It changes the most. Forty-odd screens regroup under six places, each with a second row of
  sub-pages. `config/navigation.ts` and the sidebar give way to a top bar.
- **Data.** The log needs one feed merging records that live in several places today:
  - the dashboard audit and Discord's audit log, which `readServerChanges` already merges;
  - joins and leaves from insights;
  - level-ups, tickets, warnings and lottery draws from their own repositories.

  _This is a functional change, outside a visual brief. Flagged for whoever builds it._

**The risk.** A top bar has room for six places but not forty screens, so the second row carries a lot. On a
phone that row scrolls sideways.

---

## Recommendation

**Build A, add B's message preview, and take the dark theme from B's graphite.**

- **A fixes every item on the list above**, using data the dashboard already has and changes that stay inside
  tokens and primitives. No route, API or permission moves. It is the only one of the three that is purely visual,
  which is what this brief is for.
- **B's preview is what makes it a Discord bot's dashboard.** A screen that posts something should show that
  message as Discord will draw it, right beside the setting that changes it. Welcome and goodbye already has a
  preview (`features/welcome/WelcomePage.tsx`). Restyled and made into one component, it also belongs on
  levelling's announcement, the starboard, the ticket panel, announcements, scheduled messages and birthdays.
- **B's graphite is a better dark theme than near-black.** The dashboard keeps both themes (`light-dark()`). A's
  values become the light half, and B's rail, list and page greys become the dark half, measured by
  `contrast.test.ts` like every other pair.
- **C's log is the best overview of the three, but it needs a new API.** A's "Recently changed" list is the version
  that exists today. The full log is a candidate for later, once somebody decides to build the feed.

---

## The plan

Laid out as the design audit's three phases. Each step names the files it touches. **None of it starts until a
direction is approved**, and each phase is reviewed in a browser before the next one begins. The re-skin follows the
order in [guide §19.10](../guide.md#1910-re-skinning-the-order-to-do-it-in): the palette first, then the things that
cannot read a token, then contrast and a real browser.

### Phase 1: Critical

These are the changes that most affect how the page reads.

1. **Take away what moves behind the page.**
   - Unmount `Backdrop` from `app/AppShell.tsx` and `features/site/SiteShell.tsx`, and delete it with
     `lib/three/` and its tests. The exception is `lib/three/tokens.ts`, which `lib/consoleGreeting.ts` also reads:
     it moves to `lib/`.
   - Remove the three.js chunk from `manualChunks` in `dashboard/vite.config.ts`, and the dependency itself.
   - Delete the two radial gradients in the `body` rule.
   - AGENTS.md §24 "The WebGL backdrop" goes, and so does its line in guide §19.10.
2. **Swap cards for sections and rows.**
   - Add a `Section` primitive (an `h2` with a rule under it, plus an optional link on the right) and a
     `SettingRow` (label and help on the left, the control on the right, a hairline under it).
   - Keep `Card` only for a preview, a callout and a dialog.
   - `Card.test.tsx` and `spacing.test.ts` change with it. The rule that every block of content starts on the same
     column stays, now as the column of the rows.
3. **Rewrite `PageHeader`.**
   - The eyebrow becomes a breadcrumb (`Testify HQ / Community`), which still names the server, so
     `pageHeader.test.ts` keeps its rule with a different element.
   - A `summary` prop takes the opening sentence. Each screen's sentence is built in the page from the data it
     already reads, following the rule that the server sends data and the page words it. Every sentence is an
     `en.json` key with plurals, in all six languages.
   - `Eyebrow` is deleted.
4. **Rebuild the overview** (`features/guild-overview/`):
   - the summary sentence;
   - one callout for missing permissions (`MissingPermissions` already exists);
   - a features list of rows (name, what it is doing, on or off, Change);
   - "Recently changed" as a list.

   `StatTile` and the feature grid go. The data is already in the overview response.

5. **Make the sidebar plain words** (`app/layout/Sidebar.tsx`, `SidebarLink.tsx`, `sidebarStyles.ts`).
   - The current item is marked by weight and a 2px bar.
   - Icons stay only at the icon-only rail width, where they are the only thing to click. They are monochrome and
     16px, with no tile behind them.

### Phase 2: Refinement

These change the palette, type and the smaller pieces.

6. **New palette in `@theme`.**
   - A's values become the light half and B's graphite the dark half. The role names stay, so every component
     follows.
   - The six `--color-feature-*` tints are removed, because status colours are the only colours with a meaning.
   - The twelve accents on Appearance stay. Each block is re-measured against the new backgrounds by
     `contrast.test.ts`, and any that fail are darkened until they pass.
   - Then the four things that cannot read a token (guide §19.10, step 2): the select chevron, the body wash (now
     gone), the tippy theme block and the `prefers-contrast: more` block.
7. **New type.**
   - IBM Plex Sans and IBM Plex Mono, self-hosted as `woff2` in `dashboard/public/fonts`, replace Space Grotesk,
     Inter and JetBrains Mono.
   - `--font-display` is removed, so the scale is one family: 13, 14, 16 and 24.
   - The canvas fonts the bot draws its cards with (`assets/fonts`) are a separate set and are not touched.
8. **Status as text with a dot, not a pill.**
   - `Badge` is used only for counts.
   - On, Off, Needs attention and Failed become a dot and a word, in the status colour.
9. **A `Mention` primitive** draws `#channel`, `@role` and `@member` the way Discord does. It is used in
   sentences, previews and the changes list. `RoleSwatch` stays for a role's own colour.
10. **Ban the generated tells with a test.** A sweep like `radius.test.ts` fails on:
    - `uppercase` combined with a `tracking-` class;
    - `bg-gradient` or `radial-gradient` outside `index.css`;
    - an icon inside a tinted square.

    It must be proved able to fail, as every enforcement test here is.

### Phase 3: Polish

These are previews, motion and the empty, loading and error states.

11. **One `DiscordPreview` component.**
    - It draws a message with the bot's avatar and name, the APP tag, the time, mentions, an embed and the picture
      card.
    - It is used on every screen that posts something: welcome and goodbye, the level-up announcement, the
      starboard, the ticket panel, announcements, scheduled messages and birthdays.
    - It updates as the reader types and pings nobody, since it is a picture of a message, not a message.
12. **Empty states are one sentence and one action.**
    - Example: "No warnings yet. Warn someone from their member page."
    - `EmptyState` drops its icon tile.
13. **Loading looks like the rows it becomes.** `Skeleton` draws rows of the same height, so nothing jumps when
    the data lands.
14. **Motion only where something changed.**
    - Switches slide, and "Saved" appears and fades, in 150ms.
    - `Reveal` on page load and `AnimatedNumber` go.
    - `prefers-reduced-motion` turns the rest off, as it does today.
15. **On a phone, rows stack.** The label goes above the control, the summary stays first, and the preview follows
    the form, as the phone mockups show. Check at 320, 390 and 820 against guide §22.
16. **Later, if wanted: C's activity log** as the overview, once the feed exists. This is a functional change.

### What does not move

- **The CSP and self-hosted fonts.** Nothing is loaded from an outside host.
- **Tokens as the single source**, in `light-dark()` pairs. There are still no hex values in a `.tsx`, and the four
  radius tokens stay. Cards use theirs far less often.
- **The accessibility floor:**
  - axe on every page;
  - `contrast.test.ts` over both themes and every accent;
  - one `h1` per page;
  - the server named on every server screen;
  - visible focus;
  - the tooltip rules;
  - `RouteAnnouncer`.
- **Every string through i18next.** The new summary sentences included, in all six languages, with
  `untranslated.test.ts` and `locales.test.ts` as they are.
- **The owner chunk rule, routes, gates and permission checks.** This brief touches none of them.

### Documentation that changes with it

- **AGENTS.md §24:**
  - the backdrop section goes;
  - "Two themes, one token per line" gets the new palette;
  - the card padding paragraph becomes the row and section rule;
  - the radius paragraph changes as the use of `--radius-card` shrinks.
- **[`guide.md`](../guide.md) §11, §12 and §19** are rewritten to the chosen direction, and become the new
  baseline that §24 says skills may rewrite against.
- **The README's screenshots** are re-shot once the work is done.
