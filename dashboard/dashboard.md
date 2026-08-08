# The Testify dashboard

Everything needed to work on the web dashboard: how it is put together, how a screen gets built, how styling
and components work, how the API is reached, how it is built and tested. Written so somebody arriving with no
memory of previous sessions can make a correct change.

> [!IMPORTANT]
> Two companion documents:
>
> - [`../CLAUDE.md`](../CLAUDE.md) §24 — the repo-wide rules. **Where it and this file disagree, it wins.**
>   This file is the practical detail; that one is the contract.
> - [`../dashboard-POC/`](../dashboard-POC/00-INDEX.md) — the design plan, threat model and phase order.
>   `13-ROADMAP-AND-RISKS.md` says what is built and what is next.

---

## Contents

1. [What it is, and what it is not](#1-what-it-is-and-what-it-is-not)
2. [The three workspaces](#2-the-three-workspaces)
3. [Running it](#3-running-it)
4. [Building it](#4-building-it)
5. [Directory layout](#5-directory-layout)
6. [How a screen is wired, end to end](#6-how-a-screen-is-wired-end-to-end)
7. [Adding a screen — the six edits](#7-adding-a-screen--the-six-edits)
8. [The API layer](#8-the-api-layer)
9. [Security](#9-security)
10. [Data fetching and writes](#10-data-fetching-and-writes)
11. [Components](#11-components)
12. [Styling](#12-styling)
13. [Navigation](#13-navigation)
14. [Accessibility](#14-accessibility)
15. [Testing](#15-testing)
16. [Traps that have bitten before](#16-traps-that-have-bitten-before)
17. [Current screens](#17-current-screens)

---

## 1. What it is, and what it is not

A web dashboard for configuring Testify, served **from inside the bot process**. That single fact explains most
of the architecture:

- The API can read the live `discord.js` client cache, so a channel picker can grey out a channel the bot cannot
  post in **before** anybody saves a configuration that would silently do nothing.
- There is no "start the bot" button and there cannot be one — a stopped bot has nothing left to serve it.
- Sessions, OAuth and the bot's token all live in one process, so nothing has to be shared between services.

**It is off by default.** `DASHBOARD_ENABLED` is the switch. While it is false a bot-only install needs none of
the other `DASHBOARD_*` variables. Turning it on without `DISCORD_CLIENT_SECRET`, `DASHBOARD_BASE_URL` and
`DASHBOARD_SESSION_SECRET` fails at startup naming all three at once.

**The dashboard owns no domain logic.** It is a third surface onto the same domain as the slash commands and the
button panels — repositories and `src/lib/*Actions.util.ts`. A validation rule that exists only in a route
handler is how two surfaces start disagreeing.

---

## 2. The three workspaces

```
src/api/       Hono routes, inside the bot process
shared/        @testify/shared — types and zod schemas both surfaces import
dashboard/     Vite + React + Tailwind SPA   ← you are here
```

### `@testify/shared` is a real package, not a path alias

It is **deliberately absent** from the root `tsconfig.json`'s `paths`. `tsc-alias` rewrites every alias in that
map to a relative path inside `dist/`, and nothing outside `src/` is emitted there — with the alias present it
resolved `@testify/shared` to `dist/index.js`, which is the bot's own entry point. That type-checks, and the
only symptom is an empty object at runtime.

Each consumer reads what suits it:

| Consumer          | Reads                     | Needs a build? |
| ----------------- | ------------------------- | -------------- |
| `tsc`             | `types: "src/index.ts"`   | No             |
| Jest              | an explicit source mapper | No             |
| Vite              | an alias to source        | No             |
| The bot's `dist/` | `main: "dist/index.js"`   | **Yes**        |

`prepare` builds it after any install. Editing `shared/src` and then running the **built** bot is the one case
needing `npm run build:shared` by hand.

`shared/` stays dependency-light: **zod and nothing else.** No discord.js, no React.

---

## 3. Running it

| Command                 | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev:all`       | Bot and Vite together. The page is on :5174, the API on :3000 |
| `npm run dashboard:dev` | Vite only — useful when the API is already up                 |
| `npm run check`         | typecheck → lint → format:check → test, both projects         |
| `npm run test:coverage` | Both projects, each against its own thresholds                |

In development Vite proxies `/api` to the bot, so the browser only ever talks to one origin and session cookies
work with **no CORS configuration at all**. In production the API serves `dashboard/dist` from the same port.

**`dev:all` starts Vite only once the API answers.** `startApi` runs after `client.login()`, so for the
twenty-odd seconds the bot spends connecting there is nothing on the port, and the proxy answers every poll in
that window with a stack trace that reads like a broken install. `scripts/waitForApi.ts` polls `/api/health`
first — a `fetch` in a loop rather than a `wait-on` dependency, because one fewer install matters for a
self-hosted bot — and refuses with a sentence naming the cause when `DASHBOARD_ENABLED` is false.

`tsx watch` restarts the bot on every save, which the ordering cannot help with, so the proxy's own error
handler is replaced with one line per outage. Vite registers its handler immediately **after** calling
`configure`, so the replacement waits a tick — that ordering was read out of `vite/dist/node/chunks/node.js`
rather than guessed.

---

## 4. Building it

```
npm run build
  → build:shared     tsc over shared/src
  → build:bot        tsup to dist/, then tsc-alias rewrites the @ specifiers
  → build:dashboard  vite build, then verify:bundle
```

**`npm run verify:bundle` is not optional.** It reads `dashboard/dist/assets` and fails if more than one React
version is in there — see [§16](#16-traps-that-have-bitten-before). `build:dashboard` runs it, so `npm run build`
and CI both do.

`vite.config.ts` does three things worth knowing:

- **`resolve.dedupe` plus explicit `react` / `react-dom` aliases**, resolved through
  `createRequire(import.meta.url)` so they find whichever copy the app itself imports rather than a hardcoded
  path that breaks the day the hoisting changes.
- **`manualChunks`** gives three.js its own ~513 kB chunk. Left in `vendor` it would be in the initial load,
  which is the opposite of lazy.
- An alias from `@testify/shared` to its **source**, so no build step sits between editing shared and seeing it.

---

## 5. Directory layout

Technical role first, then domain — the same rule as the bot.

```
src/
├── main.tsx            Entry. Mounts the router and the query client.
├── routes.tsx          Every route, each page lazily imported.
├── app/
│   ├── AppShell.tsx    Sidebar + content column. The one `gap-6` that sets vertical rhythm.
│   ├── RequireAuth.tsx The sign-in gate.
│   ├── ErrorState.tsx  What a failed query renders.
│   └── layout/         Sidebar, SidebarLink, SidebarSection, MobileNav
├── components/
│   ├── brand/          Logo, LogoTile, BotMark — the mark, inheriting currentColor
│   ├── primitives/     Avatar Badge Button Card DataList EmptyState PageHeader Pager
│   │                   SegmentedControl Skeleton StatTile TabBar Tooltip
│   ├── form/           ChannelPicker CheckList Field RoleChecklist RoleSwatch
│   │                   SavingIndicator Toggle Warning + fieldStyles.ts
│   ├── motion/         Backdrop (three.js), Reveal, AnimatedNumber
│   └── ui/             Reserved for shadcn's CLI. Excluded from coverage — keep your own out.
├── config/
│   ├── navigation.ts   The sidebar, as data
│   └── features.ts     Each bot feature's icon, tint and dashboard path
├── features/<name>/    The page, its components/, use<Name>.ts, <name>.utils.ts, .types.ts
├── hooks/              usePageTitle usePrefersReducedMotion useCountUp useDocumentVisible useDebounced
├── lib/                api cn queries redirect sanitise tint + three/ for the backdrop maths
└── test/               handlers.ts (MSW), setup.ts, renderWithProviders.tsx, axe.ts
```

**A page holds routing, loading and error branches and nothing else.** Anything with a rule in it — which tab a
URL means, what a page count is, which channels can be posted in — belongs in a `.utils.ts` beside it where it
can be tested without rendering. `features/levelling/` is the worked example: a 416-line file became a 45-line
page, four tabs, three shared components and two testable modules.

---

## 6. How a screen is wired, end to end

Take treasure as the shape to copy.

```
shared/src/treasure.ts          TREASURE_LIMITS, TreasureSettings, treasurePatch, treasureProblem
        ↓ imported by both
src/lib/treasureActions.util.ts normaliseTreasure, readTreasure, applyTreasure, resetTreasure
        ↑ also called by src/buttons/treasure.ts (the Discord panel)
src/api/routes/treasure.ts      GET / PATCH / POST /reset — thin, no rules of its own
src/api/routes/guilds.ts        guilds.route("/:guildId/treasure", treasure)
        ↓ HTTP
dashboard/src/features/treasure/
    useTreasure.ts              the query and the mutations
    treasure.utils.ts           draftOf, draftProblem, isDirty, describeRate — pure, tested
    TreasurePage.tsx            routing, loading, error, and the form
    components/NumberField.tsx  anything repeated inside this feature
```

The two things that make this shape work:

- **Limits live in `@testify/shared`.** The browser form and the API validate against the same numbers. The web
  accepting a sixth boost role the Discord panel cannot render is exactly the drift this prevents.
- **`*Actions.util.ts` is the shared floor.** The Discord button handler and the HTTP route call the same
  function, so they cannot build two different things.

---

## 7. Adding a screen — the six edits

In this order. Treasure, tickets and lottery are the three most recent worked examples — copy one rather than
starting from a blank page.

**1. `shared/src/<name>.ts`** — the limits, the response shape, the zod patch schema and a `*Blocked` /
`*Problem` function giving the form its refusal wording. Export it from `shared/src/index.ts`.

Anything the bot already knows (an event list, a label map, a set of defaults) **moves** here and is re-exported
from `src/config/` or `src/lib/`, rather than being copied.

**2. `src/lib/<name>Actions.util.ts`** — `normalise*` (defaults for an unconfigured guild), `read*`, `apply*`.
Point the existing Discord command or button at it in the same commit; that is the deduplication the whole
exercise is for.

**3. `src/api/routes/<name>.ts`** — read and write through the repository or the actions util, `auditChange`
after the write succeeds.

**4. `src/api/routes/guilds.ts`** — one `guilds.route("/:guildId/<name>", <name>)` line so it inherits
`requireGuild`, plus a row in `featuresOf` if the overview grid should show it.

> [!WARNING]
> Step 4 is the one that **fails silently**. An unmounted sub-app falls through to the SPA catch-all and lands
> the browser back on the guild picker. A request cannot tell that apart from a refusal, because `requireGuild`
> answers first — so `tests/api/server.test.ts` reads Hono's route table instead. Add your paths there.

**5. `dashboard/src/features/<name>/`** — `use<Name>.ts`, then `<name>.utils.ts` for the rules, then the page.
Add the query key to `src/lib/queries.ts`.

**6. The registries** — `src/routes.tsx` (one lazy import, one route), `config/navigation.ts` (one entry, in a
section), `config/features.ts` (the overview tile's path), and
`features/commands/commands.utils.ts` (so the command stops counting as Discord-only on `/commands`).

Then: MSW fixture in `src/test/handlers.ts`, a `.utils.test.ts`, a page test, and the API route test.

---

## 8. The API layer

`src/api/` is Hono. Routes: `analytics auditLog auth automod bot commandToggles commands control guilds
health levelling lottery owner settings sticky tickets treasure verification welcome`.

**Every guild-scoped route is mounted under `guilds.ts`** so it inherits `requireGuild`. Owner routes sit behind
`requireOwner`.

The browser reaches it through `src/lib/api.ts`, which:

- prefixes `/api`
- sends `credentials: "include"` so the session cookie goes
- attaches the CSRF token on every mutating verb
- throws `ApiError` carrying the server's `code` and `message`, which pages render directly

```ts
import { api, ApiError } from "@/lib/api";

const settings = await api.get<TreasureSettings>(`/guilds/${guildId}/treasure`);
await api.patch<TreasureSettings>(`/guilds/${guildId}/treasure`, { enabled: false });
await api.delete<StickyList>(`/guilds/${guildId}/sticky/${channelId}`);
```

**`DELETE` carries its key in the path, never a body.** A proxy is free to drop a body on `DELETE` and some do.

---

## 9. Security

Built before the first screen, deliberately: retrofitting a guard into fifteen routes is much harder than
writing it once. Every piece has a test proven able to fail.

| Where                     | What it does                                                                   |
| ------------------------- | ------------------------------------------------------------------------------ |
| `middleware/security.ts`  | CSP, `frame-ancestors 'none'`, `nosniff`, `no-referrer`, `no-store`, HSTS      |
| `middleware/csrf.ts`      | Double-submit on every mutating verb, compared with `timingSafeEqual`          |
| `middleware/rateLimit.ts` | Fixed window per session, falling back to address. Bounded, so it cannot leak  |
| `validate.ts`             | `parseParams` / `parseQuery` / `parseBody`, all zod, all 400 with field issues |
| `cookies.ts`              | The only place a cookie is set, so none can be written without its flags       |
| `errors.ts`               | `ApiProblem` — a status and a stable `code`, never a stack                     |
| `lib/secretBox.util.ts`   | AES-256-GCM over the OAuth tokens, keyed by HKDF from the session secret       |

### `requireGuild` is the security boundary

Five things in it are load-bearing:

1. **The guild id comes from the path parameter only**, shape-checked before it is used to look anything up. A
   handler reads `c.get("guild").id`, **never** a guild id from a body. This is the most likely way one guild's
   data leaks into another's — make it a review rule.
2. **`guild.members.fetch()` is live, every request.** The OAuth guild list is a login-time snapshot, so
   somebody demoted five minutes ago still has it in their session.
3. **404 before 403.** The bot not being in a guild is not a secret, and "here is an invite" is the right
   answer. A 403 for a guild the caller cannot manage carries a code and nothing else — no name, no icon.
4. **Owners skip the member fetch**, and `requireOwner` answers **404** rather than 403, so a manager never
   learns the owner console exists.
5. **`.catch(() => null)` on the fetch.** An unknown member throws, and an unhandled throw would be a 500 that
   looks like a bug rather than a 403 that looks like a denial.

`serveDashboard()` is registered in `startApi` **after** every route, because it is a catch-all — anything
registered behind it silently never runs.

### Rules that are easy to break and silent when broken

- **Nothing reads `c.req.param()` or a raw body.** Everything goes through `validate.ts`, so an unvalidated
  snowflake can never reach a Mongo filter and a page number can never become a negative skip.
- **`script-src` has no `'unsafe-inline'` and no `'unsafe-eval'`.** That single directive makes an injected
  `<script>` or `onerror=` inert. A lint rule bans `dangerouslySetInnerHTML`, `innerHTML`, `eval()` and
  `new Function()` so the CSP is the last line rather than the only one.
- **`returnTo` rejects `//evil.example`.** A protocol-relative URL is absolute to a browser. Backslashes go
  too — browsers normalise them.
- **`Secure` on cookies is conditional on `NODE_ENV`.** Setting it unconditionally breaks every
  `http://localhost` install, the most common self-hosting trip-up there is.
- **`DASHBOARD_BIND` defaults to `127.0.0.1`, `DASHBOARD_TRUST_PROXY` to false.** Binding everywhere puts an
  admin panel on the internet; trusting `x-forwarded-for` with no proxy lets anyone forge their rate-limit
  bucket.
- **Rate limiting counts against the address first, and the session only narrows it.** The session cookie is
  attacker-controlled: keyed on it alone, a flood mints a fresh allowance per request by rotating one header.
  Measured, not theorised — 400 requests once passed a 300-per-minute limit with none refused.
- **Middleware order is load-bearing.** `loadSession` runs **before** `verifyCsrf`, or the session's stored
  secret is always `undefined` there and only the forgeable half of the double-submit is left.
- **Path containment is checked with `relative`, never a string prefix.** A prefix has to spell the separator,
  which is `\\` on Windows.
- **No `GET` may mutate anything.** CSRF protection exempts them.
- **`/eval` is never exposed.** It turns a stolen session cookie into a remote shell.
- **`DISCORD_CLIENT_SECRET` never reaches a browser.**
- **Every free-text field goes through `plainText` / `plainLine`** from `@testify/shared`, and every browser
  input through `sanitiseInput` in `src/lib/sanitise.ts` (DOMPurify, with Discord's `<@123>` / `<#456>` syntax
  held out as placeholders so it survives). The length bound runs **after** the strip, so a value padded to the
  minimum with zero-width spaces is refused rather than stored short.
- **No user IDs in a response that does not need them.** `tests/api/noSecrets.test.ts` sweeps every response for
  secret-shaped keys; the lottery route has its own test that entrant IDs never leave the server.

---

## 10. Data fetching and writes

TanStack Query v5. Keys live in **`src/lib/queries.ts`** and nowhere else, so a rename cannot silently miss one.

```ts
export const keys = {
	guild: (id: string) => ({
		treasure: () => ["guild", id, "treasure"] as const,
		// …
	}),
};
```

### The write-race guard — copy this exactly

Every mutation writing a shared cache key declares the **same `mutationKey`** and guards `setQueryData`:

```ts
return useMutation({
	mutationKey: key,
	mutationFn: send,
	onSuccess: (settings) => {
		// A whole-document answer is only trusted while it is the only write in flight.
		if (client.isMutating({ mutationKey: key }) === 1) client.setQueryData(key, settings);
	},
	onSettled: () => {
		if (client.isMutating({ mutationKey: key }) !== 1) return;
		void client.invalidateQueries({ queryKey: key });
		void client.invalidateQueries({ queryKey: keys.guild(guildId).overview() });
	},
});
```

**Why.** Every write answers with the whole document. The order those answers arrive says nothing about the
order the server applied them — a slow one carries a snapshot taken _before_ a later click and would put that
click's control back where it was. The burst ends in an `invalidateQueries` so a read decides. A mutation counts
as pending across `onMutate`, `onSuccess` and `onSettled` — verified in `@tanstack/query-core`'s `mutation.ts`,
not assumed.

### Three write shapes. Pick by the question, not by which is less code

| Shape                | When                                                   | Example               |
| -------------------- | ------------------------------------------------------ | --------------------- |
| **Write on change**  | Each control is an independent decision                | levelling, settings   |
| **Draft, then Save** | The settings are _one_ decision, half-applied is wrong | audit log, treasure   |
| **Explicit publish** | The write has a side effect in a public channel        | verification, tickets |

The third is the one people get wrong. Choosing a channel must **not** post a panel into it — posting is its own
button carrying `publish: true`, and those pages are never optimistic, because a control that moved before the
server agreed would be claiming a message had been sent that may not have been.

### Other rules

- **A list is replaced whole, not patched.** The control is a multi-select whose value _is_ the list: one
  request, no add-then-remove race between two tabs.
- **A patch is merged onto a fresh read, server-side**, then validated — a patch carrying one half of a min/max
  pair would otherwise store a floor above its own ceiling.
- **A typed-into control does not write the URL per keystroke.** `?q=` uses `replace: true` or Back walks
  through every character, and the request behind it is debounced with `useDebounced`.
- **Every mutation writes an audit record**, after the change succeeds. If the audit write itself fails it is
  logged and the request still succeeds — the change did happen.

---

## 11. Components

**Before writing a local `Row`, `Figure` or picker in a feature directory, check `components/primitives`.**
Three files with their own segmented control is three places to fix an `aria-pressed` bug.

### Primitives

| Component                                                    | Notes                                                                   |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `Card`                                                       | `padding="none" \| "compact" \| "default"`. `cardClass()` for an `<li>` |
| `Button`                                                     | `variant="primary" \| "secondary" \| "ghost" \| "destructive"`          |
| `Badge`                                                      | `tone="neutral" \| "success" \| "warning" \| "danger"`                  |
| `StatTile`                                                   | Takes an **icon component**, not an element: `icon={Coins}`             |
| `PageHeader`                                                 | `title`, `subtitle`, `action` — every page starts with one              |
| `EmptyState`                                                 | Takes an **element**: `icon={<History size={28} />}`                    |
| `Skeleton`                                                   | What `isPending` returns                                                |
| `Avatar`                                                     | Circular image with a lettered fallback — servers and people alike      |
| `Pager`                                                      | Previous / Next with a live page count; renders nothing for one page    |
| `TabBar`, `SegmentedControl`, `DataList`/`Figure`, `Tooltip` |                                                                         |

### Form

| Component                    | Notes                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Field`                      | The one labelled-control wrapper. `htmlFor` given → `<div>` + sibling `<label>`; omitted → wrapping `<label>` |
| `ChannelPicker`              | Filters to postable kinds, disables what the bot cannot post in                                               |
| `RoleChecklist`, `CheckList` | Multi-select lists                                                                                            |
| `Toggle`                     | A real checkbox with `role="switch"`; `hideLabel` for a labelled row                                          |
| `SavingIndicator`            | `savingStateOf(busy, succeeded)`                                                                              |
| `Warning`                    | Every refusal and hierarchy warning                                                                           |
| `fieldStyles.ts`             | `FIELD` `LABEL` `SELECT` `FIELD_GROUP` `CHECK_ROW` `SCROLL_LIST`                                              |

> [!WARNING]
> The class strings are in **`fieldStyles.ts`**, not `field.ts`. `Field.tsx` beside `field.ts` is two files on
> Linux and one on macOS or Windows, so the import resolved to the class strings there and the page died at
> start-up with `does not provide an export named 'Field'`. `tests/core/conventions.test.ts` now fails on any
> two modules differing only by case.

### Tooltips describe, they never name

`Tooltip.tsx` is the only place tooltips are configured. **Anything a tooltip says must be an addition to a
control that already has its own accessible name** — a tooltip is a pointer affordance, and a control labelled
only by one is unreachable to anybody arriving another way. It opens on `focusin` as well as hover, and sets
`aria-describedby`, never `aria-labelledby`.

It drives `tippy.js` directly rather than through `@tippyjs/react`, which reads `element.ref` — removed in
React 19.

---

## 12. Styling

Tailwind v4, CSS-first. **Everything comes from `@theme` in `src/index.css`.**

- **No component writes a colour, a radius or a duration.** They are tokens — including the
  `--color-feature-*` tints and `--radius-card` — which is what makes a fork's rebrand one file. **A hex value
  in a `.tsx` is a review comment.**
- **Nor does one write its own padding.** `Card` takes `padding`, and all three values use the same 24px inline
  padding so every card's content starts on the same column whatever its density. A card reaching for `p-4`
  puts its text 8px left of the rest of the page.
- **Vertical rhythm is one `gap-6`** on the content column in `AppShell`, not a margin per section.
- **A margin between siblings is nearly always the wrong tool** — a flex column with a `gap` cannot leave a
  stray margin behind when a sibling is conditionally absent. The one legitimate margin is inside a CSS
  `columns` layout, where `gap` does not apply between items at all.
- **A grid of panels wants `items-start`** unless the cards genuinely should match heights. Without it the
  shorter card stretches, and the dead space inside its border is the "massive gap" that keeps getting reported.
- **Native controls are restyled once, in `index.css`'s base layer**, never per call site: the scrollbars
  (`scrollbar-width` for Firefox _and_ `::-webkit-scrollbar` for WebKit — both, or a dark page gets a bright
  strip down the side of every list), the checkbox and radio metrics, and the select's chevron. A Tailwind
  utility beats a base-layer rule, so the room for the chevron is the `SELECT` class rather than the base
  `padding-right`.

`cn()` in `src/lib/cn.ts` is clsx + tailwind-merge — use it wherever classes are conditional or merged.

### The WebGL backdrop

`components/motion/Backdrop.tsx` draws a drifting field of points behind every screen. Four things keep an
ornament from costing anything:

- **three is imported dynamically and chunked on its own.**
- **`prefers-reduced-motion` skips the import entirely**, rather than loading three and then sitting still. So
  does a machine with no WebGL; `createStarfield` returns null rather than throwing.
- **Everything testable is out of the three.js file.** `lib/three/field.ts` holds the scatter, easing and
  parallax — pure and unit tested. `starfield.ts` is the one file excluded from coverage.
- **It reads the palette** off `:root` rather than restating it.

The canvas is `aria-hidden` and `pointer-events-none`. It carries no information and must never take a click.

---

## 13. Navigation

`config/navigation.ts` is the sidebar **as data**. A new screen is one entry there and one route; the icon rail,
tooltips, active marker and mobile drawer all follow.

```ts
export interface NavGroup {
	heading?: string;
	items: NavItem[]; // always visible
	sections?: NavSection[]; // collapsible
}
```

A server's screens are grouped into collapsible sections (**Members**, **Moderation**, **Messages**), because a
flat list grew past what one glance takes. `items` stays for the screens that are not a category — Overview and
Settings. Three things are load-bearing:

- **Collapsing only exists where labels do.** At the icon-only rail there is nothing to read and no room for a
  toggle, so the button is `hidden lg:flex` and the items stay flat there whatever the state says. A collapsed
  section at that width would hide the icons and leave nothing to click. The button being `display: none` is
  what keeps `aria-expanded="false"` from contradicting a list the rail is still showing.
- **The section holding the current page opens itself** (`sectionHolds`), so a collapsed section can never hide
  where you are.
- **`allNavItems` reaches into sections.** It is what every flat consumer reads; a screen reachable only from a
  section would otherwise look like it had left the navigation.

### Three widths

A drawer below `md`, an icon-only rail from `md`, the full sidebar from `lg`.

> [!WARNING]
> **At the icon-only width the labels are `sr-only`, never `hidden`.** `hidden` is `display: none`, which
> removes them from the accessibility tree and leaves every navigation link named nothing. jsdom loads no
> stylesheet, so a unit test cannot tell the two apart by computing a name — the unit test pins the class and a
> real browser check confirms the accessible name survives.

---

## 14. Accessibility

`jest-axe` runs on every page-level test through `src/test/axe.ts`, with `color-contrast` disabled — jsdom
computes no styles, so that rule can only report false negatives there. It is a floor, roughly 40% of issues;
`dashboard-POC/10-ACCESSIBILITY.md` lists the manual passes.

Four things it does not catch, all built deliberately:

- **`RouteAnnouncer`** reads the new `document.title` into a polite live region after a navigation. Without it a
  screen reader gets no signal that an SPA changed page at all.
- **Role colours are swatches.** `RoleSwatch` puts the colour on a bordered dot and leaves the name at full
  contrast — a role set to `#1a1a1a` as text is invisible on this background.
- **Sidebar groups are labelled lists, not headings.** A heading there would put the server name into the page's
  heading outline twice.
- **`prefers-contrast: more`** swaps dividers for the interactive border and muted text for white.

`eslint-plugin-jsx-a11y` is deliberately absent: its latest release peers on ESLint ≤9 and this repo is on 10,
so installing it needs `--force` and breaks `npm ci`.

---

## 15. Testing

Jest + Testing Library + MSW. Coverage thresholds **80/80/80/80**.

- **`src/test/handlers.ts`** — the MSW fixtures and default handlers. Add yours here; page tests override with
  `server.use(...)` for the case under test.
- **`src/test/renderWithProviders.tsx`** — `renderWithProviders(<Page />, { route, path })`, returning the
  query `client` so a test can await `client.isMutating()`.
- **`src/test/axe.ts`** — `expectNoViolations(container)`.

What good tests here look like:

- **Test the `.utils.ts`, not the rendering**, wherever the rule can be lifted out.
- **Name the behaviour, not the implementation.**
- **A comment above a test should name the bug it prevents.**
- **Cover the degenerate cases**: empty list, unconfigured server, page past the end, someone else's data.
- **A test must be able to fail.** Introduce the violation, watch it go red, revert. A convention test that
  passes vacuously is worse than none.

> [!NOTE]
> **`npm run check` passing is necessary but not sufficient.** jsdom evaluates no CSS, so every breakpoint,
> `sr-only`-vs-`hidden` and overflow question needs a real browser. Playwright is available:
> `playwright-core` with `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Route `**/api/**` to fixtures,
> listen for `pageerror`, and assert on `getClientRects().length` for "is it actually visible".

---

## 16. Traps that have bitten before

**React gets hoisted, and it breaks the browser silently.** `discord-html-transcripts` needs React 18, so npm
puts **18** at the root and leaves the dashboard's **19** in `dashboard/node_modules`. `@tanstack/react-query`
and `react-router`, hoisted beside it, then resolve 18 while the app renders with 19. Every hook reads a null
dispatcher: `Cannot read properties of null (reading 'useEffect')` and a blank page. It type-checks, it lints,
and the tests pin React themselves — so everything passes against a page that cannot mount.
**`npm run verify:bundle` is the only guard.**

**Two modules differing only by case.** `Field.tsx` beside `field.ts` — one file on macOS and Windows, two on
Linux and CI. Nothing local catches it. `tests/core/conventions.test.ts` walks `src`, `shared/src` and
`dashboard/src` and names the pair.

**An unmounted sub-app looks exactly like a permission refusal.** Forget the `guilds.route(…)` line and the
request falls through to the SPA catch-all. `tests/api/server.test.ts` reads Hono's route table.

**`hidden` at the icon-only rail removes the accessible name.** Use `sr-only`.

**The dashboard's Jest config earns its comments.** Three things there are load-bearing:
`jest-fixed-jsdom` (plain jsdom deletes the `fetch`/`Request`/stream globals MSW needs), a
`transformIgnorePatterns` allowlist (MSW's CommonJS build requires several ESM-only packages), and a
`moduleNameMapper` pinning React to the workspace copy.

**Prettier reflows what a script inserted.** When patching a file programmatically, re-read it afterwards —
indentation you matched on may already have changed.

---

## 17. Current screens

| Route                   | Screen                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `/sign-in`              | One button; also the setup screen for a half-install                                 |
| `/guilds`               | Picker, with an invite card for guilds without the bot                               |
| `/guilds/:id`           | Stat tiles, feature grid, permission warnings, recent changes                        |
| `/guilds/:id/levelling` | Four tabs, optimistic writes, hierarchy warnings                                     |
| `/guilds/:id/welcome`   | Greeting template, live preview, saved on blur                                       |
| `/guilds/:id/audit-log` | Grouped event checklist held as a draft until Save                                   |
| `/guilds/:id/automod`   | Discord's own filters — no database behind it                                        |
| `/guilds/:id/sticky`    | A list keyed by channel; `PUT` upserts                                               |
| `/guilds/:id/treasure`  | Random money drops; ranges validated as pairs                                        |
| `/guilds/:id/tickets`   | Destinations, panel wording, explicit publish                                        |
| `/guilds/:id/lottery`   | Pot, schedule, freeze, and a confirmed end                                           |
| `/guilds/:id/members`   | Money and levels, each as a real table, with a jump to your own page                 |
| `…/members/:userId`     | One member: standing, roles, warnings, softban — and the moderation controls         |
| `/guilds/:id/settings`  | Prefix, nickname, link filtering, roles on join, verification, counting, voice stats |
| `/guilds/:id/commands`  | Per-command switches for this server                                                 |
| `/commands`             | Every command, searchable, with the coverage tile                                    |
| `/terms`, `/privacy`    | Public — outside the sign-in gate, deliberately                                      |
| `/owner`                | Six tabs: fleet, usage, commands, logs, runtime, control                             |

Verification has its own API route and `useVerification.ts` but no page of its own — it is a section of
`/settings`, because a join gate is one control rather than a screen. `features/settings/sections/` is where the
seven sections live.

**A member's page is the first screen that writes to a person rather than to a setting**, and two things follow.
`moderationProblem` is computed by `moderationActions.util.ts` and travels in the response, so the page greys its
controls with the same answer the route refuses by — but the greying is a courtesy and `actOn()` is the gate,
asked again before every write. Clearing a warning record asks for the member's name typed out, because nothing
recovers it. A screen nested under another (`…/members/:userId` under `…/members`) needs `exact: false` on the
parent's nav entry, or the sidebar section collapses the moment you open it.

Four more things about that page are load-bearing:

- **Lifting a softban skips the hierarchy check, and has to.** A softbanned user is banned, so they are not a
  member and have no roles to compare — running `actOn()` there would refuse every lift. `requireGuild` is the
  gate, and there is a test proved to go red if the check is added back.
- **A level change hands out the role rewards it earns.** `changeLevel` writes the number and then calls
  `applyLevelRewards`, the same function the message handler uses. Writing the number alone leaves somebody at
  level 10 without the level-10 role until their next message.
- **Money is `$inc`-ed, never read and written back**, so two managers cannot overwrite each other, and the
  route refuses a subtraction that would leave a negative balance — nothing else in the economy can produce one.
- **A level and an XP change are refused together**, because setting a level rewrites the XP and accepting both
  would silently discard one. `levelBody` enforces it in zod and the form disables both buttons.

### The owner console

Everything behind `requireOwner`, which answers **404** so a manager never learns it is there. Each tab fetches
its own data, deliberately: a failing `/owner/stats` used to blank the whole console, and the logs tab is
precisely the screen you want when something is wrong.

- **Ownership is `DISCORD_OWNER_IDS` and nothing else**, read from env on every request — so removing an ID
  revokes the console on that person's next click, and no flag on the session can grant it.
- **Usage is counted, not logged.** One row per command per server per day per surface, `$inc`-ed in place,
  TTL'd at 90 days. **No user IDs, anywhere** — "what is this bot used for" is the question; "who used it" is
  not.
- **Commands can be switched off** per-server or bot-wide. `checks.ts` is the gate — hiding a switch is not
  access control. Nobody bypasses it, the bot owner included. `ALWAYS_ENABLED` keeps `/help` reachable so a
  server cannot lock itself out.
- **The log ring is in memory and redacts on the way in** — any context key matching
  `token|secret|password|credential|authorization|cookie|session|uri|url|dsn|key$` is replaced before the record
  is stored. A restart clears it, which is the trade for something needing no retention policy.
- **There is no "start the bot".** Pause is a flag `runChecks` honours; shut down really ends the process behind
  a typed confirmation.
- **Testify never phones home.** The runtime tab reports its version and links the releases page; it does not
  check for a newer one.
- **No chart library.** `UsageChart` is a `<span>` per day with a height, and the numbers behind it are a real
  `<table>` in an `sr-only` `<figcaption>`.

### The dashboard wears the bot's face

`GET /api/bot` returns the application's own profile and every brand surface reads it, so a fork looks like its
own bot without a line of CSS. The banner is **not** in the READY payload — `client.user.banner` is undefined
until the user is fetched over REST, so `botIdentity()` fetches once and caches for an hour. Everything falls
back to `components/brand/Logo`; a brand mark is never worth a broken image icon.

---

## What is left

`dashboard-POC/13-ROADMAP-AND-RISKS.md` is authoritative. As of the last commit: **Phase 3 is complete** — every
guild-scoped setting the bot has is editable on the web. Still open:

- **Phase 4** — members, moderation and economy: leaderboards as accessible tables, a member detail page,
  warnings and softbans through `moderationActions.util.ts`, XP grants that also apply role rewards.
- **Phase 5** — leave guild and blacklist on the owner console, and the generated command runner.
