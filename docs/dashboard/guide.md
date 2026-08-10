# The Testify dashboard

Everything needed to work on the web dashboard: how it is put together, how a screen gets built, how styling
and components work, how the API is reached, how it is built and tested. Written so somebody arriving with no
memory of previous sessions can make a correct change.

**Re-skinning it or reworking a flow?** [§18](#18-the-design-system) is the full token reference and the order
to change things in, [§19](#19-user-journeys) is every journey end to end, and [§20](#20-the-58-rules) is the
checklist the rewrite is working through. Those three are the ones to edit.

> [!IMPORTANT]
> **Doing the rewrite? [`re-write.md`](re-write.md) is the plan** — the order to work in, what must not change,
> the measured baseline, and what "better" has to prove before it counts.

> [!IMPORTANT]
> **§18 is a baseline, not a contract.** The design skills vendored in [`.claude/skills`](../../.claude/skills/README.md)
> now lead the dashboard's visual direction — where their guidance and the values recorded in §18 disagree, the
> skill wins and §18 is updated to describe what was built. Three things are architecture rather than aesthetics
> and do not move: tokens stay the single source (no hex in a `.tsx`), the accessibility floor in §14 only ever
> rises, and the CSP and security boundary in §9 are untouchable.

> [!IMPORTANT]
> Two companion documents:
>
> - [`../../CLAUDE.md`](../../CLAUDE.md) §24 — the repo-wide rules. **Where it and this file disagree, it wins.**
>   This file is the practical detail; that one is the contract.
> - [`design-plan/`](design-plan/00-INDEX.md) — the design plan, threat model and phase order.
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
18. [The design system](#18-the-design-system)
19. [User journeys](#19-user-journeys)
20. [The 58 rules](#20-the-58-rules)

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

> [!WARNING]
> **This bit once cost an afternoon.** `tsx` resolves `@testify/shared` to `dist/index.js`, so the **dev** bot
> reads the build too, and `shared/dist` is gitignored — pulling never refreshes it. A new export in
> `shared/src` is then `undefined` at runtime and every route using it 500s with
> `Cannot read properties of undefined (reading 'safeParse')`. `npm run dev` and `npm run dev:all` build shared
> first now, so it cannot recur.

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

**`dev:all` is one supervisor process, and one Ctrl+C stops everything.** `scripts/devAll.ts` replaced
`concurrently` for a reason worth knowing: concurrently spawns every command through a shell — `cmd.exe /s /c`
on Windows, in `dist/lib/spawn.js` — and each of those batch layers stops to ask "Terminate batch job (Y/N)?"
when the console is interrupted. Two children meant two prompts and a bot left running. The supervisor spawns
the real binaries with `shell: false`, so there is no batch layer left to ask; children are `detached` so one
signal reaches the grandchildren `tsx watch` and Vite spawn, and a 5s grace timer kills anything that will not
go. It builds `@testify/shared` before either child starts, for the reason in the warning above.

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
| `PageHeader`                                                 | `title`, `subtitle`, `action`, `eyebrow` — the server, on guild screens |
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
`design-plan/10-ACCESSIBILITY.md` lists the manual passes.

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
| `/owner`                | Eight tabs: fleet, usage, commands, logs, run, blacklist, runtime, control           |

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
- **The blacklist is bot-wide, and one module owns the rule about who may be on it.** `blacklistActions.util.ts`
  holds `blacklistProblem`, which both `/blacklist add` and the route call — an owner able to block another owner
  could lock every one of them out of their own bot.
- **Leaving a server is confirmed by name, and the audit record is written before `guild.leave()`** — afterwards
  the name is no longer readable from the cache and the record would say only that something was left.
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

## 18. The design system

§12 is the short rule — everything comes from `@theme` in `src/index.css`. This section is the reference behind
it: every token that exists, what each one is for, and the order to change them in. **If you are re-skinning the
dashboard, work through [18.10](#1810-re-skinning-the-order-to-do-it-in) rather than grepping for hex values.**

### 18.1 Where each visual decision lives

One place per decision. If you find yourself editing a screen to change how something looks, you are probably in
the wrong file.

| Decision                        | Lives in                                              | Blast radius                            |
| ------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| Any colour                      | `@theme` in `src/index.css`                           | Everything                              |
| Corner radius                   | `--radius-card`, `--radius-field`                     | Everything                              |
| Font family                     | `--font-display`, `--font-mono`                       | Everything                              |
| Animation and easing            | `--animate-*`, `--ease-out-soft`, `@utility motion-*` | Everything                              |
| Card surface, border, padding   | `components/primitives/Card.tsx`                      | Every card                              |
| Button shape and variants       | `components/primitives/Button.tsx`                    | Every button                            |
| Page title size and header slot | `components/primitives/PageHeader.tsx`                | Every page                              |
| Labelled-control spacing        | `components/form/fieldStyles.ts`                      | Every form row                          |
| Page width and vertical rhythm  | `app/AppShell.tsx`                                    | Every page                              |
| A feature's icon and tint       | `config/features.ts`                                  | Overview grid, anywhere a feature shows |
| Sidebar shape and grouping      | `config/navigation.ts`                                | Sidebar, rail, drawer                   |
| Native control appearance       | `@layer base` in `src/index.css`                      | Selects, checkboxes, scrollbars         |

### 18.2 The palette

Names are **roles, not colours**. `--color-destructive` is red today; the name still reads correctly if a fork
makes it orange. Renaming a token to its hue is how a palette stops being swappable.

| Token                        | Value     | What it is for                                                          |
| ---------------------------- | --------- | ----------------------------------------------------------------------- |
| `--color-background`         | `#07070b` | The page. Everything else sits on it                                    |
| `--color-foreground`         | `#ffffff` | Body text, headings, an active icon                                     |
| `--color-muted`              | `#1c1c2a` | A recessed fill: secondary buttons, hover states, icon tiles            |
| `--color-muted-foreground`   | `#a2a2ba` | Secondary text, meta lines, an inactive icon                            |
| `--color-card`               | `#12121c` | Every card and panel surface                                            |
| `--color-popover`            | `#171722` | Anything floating: tooltips, native `<option>` lists                    |
| `--color-border`             | `#262639` | Card borders, dividers, table rules                                     |
| `--color-input`              | `#7676a0` | Field borders — deliberately lighter, so a control looks touchable      |
| `--color-primary`            | `#7c3aed` | The one action colour: primary buttons, the active nav marker           |
| `--color-primary-foreground` | `#ffffff` | Text on primary                                                         |
| `--color-accent`             | `#a78bfa` | **Every violet that is text**: links, the eyebrow rule, the WebGL field |
| `--color-ring`               | `#a78bfa` | The focus ring, and nothing else                                        |
| `--color-success`            | `#3ddc97` | Saved, connected, healthy                                               |
| `--color-warning`            | `#fbbf24` | A missing permission, a hierarchy problem, "nothing set up"             |
| `--color-destructive`        | `#dc2626` | Delete, leave, block — as a **fill**, always with white on it           |
| `--color-destructive-text`   | `#f87171` | The same meaning as **text**. One token cannot be legible as both       |

Two conventions worth keeping:

- **`--color-input` is lighter than `--color-border` on purpose.** A field that borrows the divider colour reads
  as a label. If the two converge in a rewrite, every form goes flat.
- **`--color-ring` is used by exactly one rule** — `:focus-visible` in the base layer. Keeping it separate from
  `--color-accent` means a rebrand can make the focus ring louder than the brand without touching links.

### 18.3 Feature tints

Six hues, used as an icon colour and as a 15% wash behind it. The grouping is by **feel rather than by
subsystem** — audit logging reads the tickets blue because it is an operational screen, not because it is a
ticket. Regroup them freely; the only constraint is the contrast rule below.

| Token                        | Value     | Feature keys that read it (`config/features.ts`)              |
| ---------------------------- | --------- | ------------------------------------------------------------- |
| `--color-feature-levelling`  | `#a78bfa` | `levelling`                                                   |
| `--color-feature-economy`    | `#fbbf24` | `economy`, `lottery`, `treasure`, `games`                     |
| `--color-feature-moderation` | `#f87171` | `moderation`, `automod`, `anti-link`, `verification`, `owner` |
| `--color-feature-welcome`    | `#3ddc97` | `welcome`, `auto-roles`                                       |
| `--color-feature-tickets`    | `#60a5fa` | `tickets`, `audit-logging`, `voice-stats`, `info`             |
| `--color-feature-community`  | `#f472b6` | `sticky`, `counting`, `giveaway`, `community`, `fun`          |

Each is a **text colour at AA on the page background** and is paired with `/15` as a fill. A tint used as a fill
at full strength will not pass contrast for the icon sitting on it — check both if you change one.

`featureLook()` falls back to a neutral icon for a key it has never seen, so the API can ship a feature before
the dashboard knows about it and the grid renders a row rather than a hole. There is a test pinning that.

### 18.4 Type

**Three faces, all self-hosted, 104 kB for the lot.** Before the rewrite `@theme` named `"Inter var"` with no
`@font-face` behind it, so every install had silently been rendering in `system-ui` — the scale below meant
nothing until the faces actually existed.

| Token            | Face           | Job                                                     |
| ---------------- | -------------- | ------------------------------------------------------- |
| `--font-sans`    | Inter          | Everything that is prose or a control                   |
| `--font-display` | Space Grotesk  | The page title, every card heading, the brand — 32 uses |
| `--font-mono`    | JetBrains Mono | Numbers, IDs, the eyebrow, a command name — 42 uses     |

Inter and Space Grotesk are `<link rel="preload">`-ed in `index.html`; mono is not, because it carries small
labels where a swap is much less visible than it would be in a heading. Verified in a production build that
each font is fetched **once** — a preload that does not dedupe is worse than no preload. No external host, so
the CSP is untouched and a self-hosted bot still phones nowhere.

Sizes, measured across `dashboard/src` rather than aspirational: **three do 96% of the work.**

| Size        | Where it is used                                    | Count |
| ----------- | --------------------------------------------------- | ----- |
| `text-2xl`  | The page title in `PageHeader`, the sign-in heading | 2     |
| `text-lg`   | An occasional section lead                          | 3     |
| `text-base` | A card heading — `font-display font-bold`           | 31    |
| `text-sm`   | Body copy, every control, every button, table cells | 108   |
| `text-xs`   | Meta lines, IDs, timestamps, badges                 | 55    |

**Line height is set in three places, and the split matters.** `--text-sm--line-height: 1.55` in `@theme`
loosens body copy past Tailwind's 1.43, which is tight for a multi-line description and is most of the reading
in the app. `h1, h2, h3` take `line-height: 1.2` in the base layer. And `CARD_HEADING` carries its own
`leading-tight`, because **a Tailwind size utility ships a `line-height` and beats both** — the same trap as
the select's chevron room. Set it in `@theme` or the base layer alone and a card heading stays at 1.5, which is
body spacing with a larger font.

Measured on the settings page after the change: 28px @ 1.25, card headings 16px @ 1.25, body 14px @ 1.55.

Rules that hold today and are worth keeping:

- **One `<h1>` per page**, and it is the `PageHeader` title. The browser sweep counts them, and it caught the
  owner console mounting the whole of `CommandsPage` — `PageHeader` and all — inside a tab.
- **A guild screen names its server above that `<h1>`**, in the `eyebrow`. With the drawer closed on a phone
  nothing else on the page says which server the switches belong to. The overview is exempt: its title is the
  name already.
- **Headings never skip a level.** Every card heading is an `<h2>`; two `<h3>`s in the owner console were
  jumping straight from the page's `<h1>` and left a hole in the outline.
- **A card heading is `CARD_HEADING`**, not a string you write out — it was spelled identically in 28 files
  before it had a name, and the line height has to live on it. The step between a page and a card is carried by
  the size _and_ the face; adding a third size in between makes cards compete with the page.
- **A section label is an `Eyebrow`, not a heading you style yourself.** 14 uses, and ten of them were
  hand-rolled copies of the same class string until the primitive grew an `as` prop.
- **An ID is always `font-mono text-xs`** with `--color-muted-foreground`. It is a reference, not a name.
- **Headings carry `text-wrap: balance`** from the base layer, so a title never leaves one word on its own line.
- **`text-xl` appears once** in the whole app. If a rewrite wants it, use it deliberately or delete it.

### 18.5 Surfaces and elevation

**There are no drop shadows anywhere.** On a near-black background a shadow reads as a smudge, not as height.
Depth comes from three things instead:

1. **Surface colour** — `--color-background` → `--color-card` → `--color-popover`, each a step lighter.
2. **A 1px `--color-border`** around a card.
3. **`surface-edge`**, a `@utility` putting a 1px inset white highlight at 6% along the top edge. That single
   line is what stops a card reading as a flat rectangle.

The body also carries a fixed radial wash of `--color-primary` at 14%, top-left, so the page still has depth
when WebGL is unavailable and the backdrop never loads.

### 18.6 Spacing and rhythm

| Level             | Value                                        | Set in                |
| ----------------- | -------------------------------------------- | --------------------- |
| Page column width | `max-w-[1100px]`, centred                    | `AppShell`            |
| Page padding      | `p-4`, `sm:p-6`                              | `AppShell`            |
| Between sections  | one `gap-6` on the content column            | `AppShell`            |
| Card padding      | `p-6` / `px-6 py-4` / `p-0`                  | `Card`, via `padding` |
| Inside a card     | `gap-4` between blocks, `gap-3` between rows | the screen            |
| Inside a row      | `gap-2`, `gap-3`                             | the screen            |

Measured usage: `gap-3` (71), `gap-4` (48), `gap-2` (45), `gap-1` (25), `gap-6` (7). **A screen that reaches for
a sixth value is usually solving a problem that is really about nesting** — the commands page had a `gap-8`
between its category groups, and what it actually needed was one more level of nesting so the shell's own
`gap-6` applied to them.

**`src/test/spacing.test.ts` enforces this.** It fails on any `gap-*` half-step or value outside the five, and
on a `p-*`/`px-*` written beside a `Card`. Half-steps arrive one at a time and each looks harmless: thirteen
files had drifted to `gap-1.5`, `gap-2.5`, `py-1.5` or `px-3.5` before anything checked. The one padding off
the scale is `pl-9`/`pr-9`, which is room for an icon rather than rhythm.

Three rules that came from real complaints:

- **All three card paddings share the same 24px inline value**, so every card's content starts on the same
  column whatever its density. A card reaching for `p-4` puts its text 8px left of the rest of the page.
- **A margin between siblings is nearly always wrong.** A flex column with a `gap` cannot leave a stray margin
  behind when a sibling is conditionally absent. The one legitimate margin is inside a CSS `columns` layout,
  where `gap` does not apply between items at all.
- **A grid of panels wants `items-start`** unless the cards genuinely should match heights. Without it the
  shorter card stretches and the dead space inside its border is the "massive gap" that keeps getting reported.

### 18.7 Radius

`--radius-card` (10px) for cards, buttons and anything the eye reads as a surface. `--radius-field` (8px) for
inputs, selects and tooltips. `rounded-full` for avatars, dots and the scrollbar thumb.

**Buttons use `--radius-card`, not `--radius-field`.** They are surfaces you press, not boxes you type in — and
a button beside an input with a tighter radius looks like part of the input.

### 18.8 Motion

Four animations, all short, all built from one easing token.

| Utility          | Animation                     | Used for                                    |
| ---------------- | ----------------------------- | ------------------------------------------- |
| `motion-reveal`  | 320ms, fade + 6px rise        | A page header, a section arriving           |
| `motion-fade`    | 200ms, opacity only           | The `<main>` outlet on every navigation     |
| `motion-pop`     | 200ms, fade + scale from 0.97 | A card that appears in place, e.g. a detail |
| `skeleton-sheen` | 1.6s linear, infinite         | The highlight sweeping a loading skeleton   |

`--ease-out-soft` is `cubic-bezier(0.22, 1, 0.36, 1)` — fast out, long settle. Everything decelerating uses it.

Three rules:

- **Motion is feedback, never decoration.** `prefers-reduced-motion: reduce` drops every duration to 0.01ms and
  hides the skeleton sheen, and nothing about the dashboard becomes harder to use. If a rewrite adds motion that
  would be _missed_ under that media query, the motion is carrying information it should not be.
- **A press moves.** `active:scale-[0.98]` on `Button` is the cheapest confirmation that a click landed.
- **Transitions are property-scoped** — `transition-[background-color,color,transform]`, never `transition-all`,
  which animates layout properties nobody asked it to.

### 18.9 Iconography

`lucide-react`, imported per icon so the bundle only carries what is used.

| Context                     | Size | Notes                                              |
| --------------------------- | ---- | -------------------------------------------------- |
| Inside a button             | 15   | Beside a label, `aria-hidden`                      |
| Beside a row or list item   | 16   | Beside a label, `aria-hidden`                      |
| A feature tile, empty state | 20   | `EmptyState` takes an **element**, not a component |
| A stat tile                 | —    | `StatTile` takes a **component**: `icon={Coins}`   |

**An icon is never the only label.** An icon-only button carries an `sr-only` span or an `aria-label`; the
browser sweep counts controls whose accessible name is empty and fails on any.

### 18.10 Re-skinning: the order to do it in

Tokens cover almost everything, but not quite. Work in this order and the browser check at the end should come
back clean.

1. **Rewrite the palette in `@theme`.** Keep the role names. Every component follows.
2. **Then the four things that cannot read a token**, because nothing else will:
   - The **select chevron** is an inline SVG data URI in `@layer base` with `stroke='%23a1a1b5'` hardcoded —
     `currentColor` cannot be used inside a `url()`. Change it to the new `--color-muted-foreground` by hand.
   - The **body wash** hardcodes its geometry (`80rem 50rem at 15% -10%`) though not its colour.
   - The **tippy theme block** (`.tippy-box[data-theme~="testify"]`) reads tokens but restates the radius,
     padding and font size. Check it still matches the new field radius.
   - The **`prefers-contrast: more` block** remaps `--color-border` to `--color-input` and muted text to
     foreground. If the new palette changes their relationship, this remap may need inverting.
3. **Check the backdrop.** `lib/three/tokens.ts` reads `--color-accent` off `:root` at runtime and falls back
   rather than rendering a black field, so a token three cannot parse fails quietly. Load a page and look.
4. **Re-check contrast.** Body text, muted text on card, every feature tint as text, and every badge tone. The
   automated axe pass has `color-contrast` **disabled** — jsdom computes no styles, so it can only report false
   negatives. This step is manual and there is no substitute.
5. **Run a real browser sweep** at 1440 / 820 / 390. `design-plan/10-ACCESSIBILITY.md` lists the manual passes;
   the practical script is in §15.
6. **Look at it in `prefers-contrast: more` and `prefers-reduced-motion: reduce`.** Both are one devtools toggle.

> [!WARNING]
> **A hex value in a `.tsx` is a review comment.** The four exceptions above are all in `index.css` and all
> commented in place. If a rewrite adds a fifth, comment it there too — a hardcoded colour nobody knows about is
> the thing that makes the _next_ re-skin look half-finished.

---

## 19. User journeys

What somebody is actually trying to do, in order, and what the screen owes them at each step. **This is the
section to rewrite when a flow feels wrong** — the components are §11, the styling is §18, and this is the shape
of the path between them.

### 19.1 The states every screen owes

Before any specific journey: a screen is not finished until all six exist. Most of the rough edges ever reported
here have been a missing one of these rather than a wrong layout.

| State   | What renders                                                  | Rule                                                      |
| ------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| Loading | `<Skeleton>` roughly the shape of the answer                  | Never a spinner in the middle of an empty page            |
| Empty   | `<EmptyState>` — icon, one sentence, the action that fixes it | "No results" is not an empty state                        |
| Error   | `<ErrorState>`, with a Retry when the failure is retryable    | The request failed. Different from empty and from refused |
| Refused | `<Warning>` **beside the control**                            | The server said no. The page stays, nothing navigates     |
| Saving  | `<SavingIndicator state={savingStateOf(busy, ok)} />`         | In the `PageHeader` action slot                           |
| Busy    | `disabled` on every control that writes                       | A double-click must not send two writes                   |

**A refusal is placed, not announced.** It goes next to the control that caused it, not at the top of the page —
somebody who scrolled to a card at the bottom will never see a banner above the fold.

**Error is the one that goes missing, and it hides as one of the other two.** Every owner console tab had it
wrong in a different way, and none of it looked broken: `isPending || data === undefined` returns the skeleton
for ever once the read fails, `data?.rows ?? []` turns an unread answer into an empty list, and the usage tab
reported a 500 as "No usage yet". Two things to check on any screen with a read:

- **`isPending` is not `data === undefined`.** Branch on `isError` before you branch on the data.
- **A `??` fallback on a read is where empty and failed become the same screen.** With the error branch above it,
  the fallback is unreachable and `no-unnecessary-condition` will say so — that lint error is the tell.

`ErrorState` takes `as="h2"` for a panel inside a screen that already has its own `<h1>`, such as an owner
console tab or `CommandsPage` mounted in one.

### 19.2 First run, and the half-install

**Who:** whoever just turned `DASHBOARD_ENABLED` on.

1. They open the base URL and land on `/sign-in`, which is public.
2. `GET /api/auth/setup` answers first. If `DISCORD_CLIENT_SECRET`, `DASHBOARD_BASE_URL` or
   `DASHBOARD_SESSION_SECRET` is missing, the page becomes `SetupNeeded` — it names **all** the missing values at
   once and shows the exact redirect URI to paste into the Discord developer portal.
3. With those set and the bot restarted, the same URL shows the sign-in button.

**Why it is a screen rather than a startup crash:** the value most likely to be wrong is the redirect URI, and
the only place that can show the exact string to paste is a page served at the URL in question.

### 19.3 Signing in

**Who:** anybody with Manage Server somewhere the bot is.

1. One button — "Sign in with Discord". No form, no second option.
2. OAuth2 with `state` and PKCE; the callback sets the session cookie and redirects to `returnTo`, which is
   validated (`//evil.example` is an absolute URL to a browser, and backslashes are normalised, so a check that
   only looks for a leading `/` is an open redirect).
3. They arrive at `/guilds`, or at whatever page they originally asked for.

**Exits:** the session expires, or `DASHBOARD_SESSION_SECRET` is rotated, and they are back at step 1 with the
page they wanted preserved in `returnTo`.

### 19.4 Choosing a server

**Who:** a signed-in manager.

1. `/guilds` lists every server where they have Manage Server, from the OAuth guild list intersected with the
   bot's own.
2. A server **the bot is not in** still appears, with an invite card rather than being hidden — "the bot is not
   here" is not a secret, and the useful answer is an invite link.
3. A server they cannot manage is not listed at all.
4. Picking one goes to `/guilds/:id`.

**Rough edge, known:** the OAuth guild list is a login-time snapshot, so a server joined five minutes ago is
missing until the next sign-in. The **permission** check is live per request (`guild.members.fetch()`), so this
is a staleness problem in the picker only, never a security one.

### 19.5 Configuring a feature

**Who:** a manager who has picked a server. This is the dominant journey — most screens are this shape.

1. `/guilds/:id` shows stat tiles, a feature grid, permission warnings and recent changes. The grid is the
   navigation: each tile carries the feature's tint and links to its screen where one exists.
2. They open a feature — say `/guilds/:id/levelling`.
3. The screen loads its own data and renders skeletons meanwhile. Tabs are in the URL (`?tab=`), so a link to a
   tab is a link to a tab.
4. They change a control. **What happens next depends on the control's shape** — see 19.8.
5. The `SavingIndicator` in the header says saved. A refusal appears beside the control instead.
6. The change is written to the audit log and shows up in "recent changes" on the overview.

**The check that makes this journey trustworthy:** a channel the bot cannot post in is disabled in the picker
_before_ anybody saves a configuration that would silently do nothing, and a role above the bot's own is warned
about at configuration time rather than at the moment it fails to be assigned.

### 19.6 Handling a problem member

**Who:** a manager dealing with somebody specific. The first journey that writes to a **person** rather than to
a setting.

1. `/guilds/:id/members` — money and levels as real tables, with a "find me" jump to your own page.
2. They open a member, or arrive directly at `…/members/:userId`.
3. The page shows standing, roles, warnings and any live softban. `moderationProblem` travels in the response,
   so if the caller may not act on this member the controls are not rendered and the reason is shown once.
4. Warnings are added with a reason; removed one at a time; **cleared only after typing the member's name**,
   because nothing recovers the record.
5. Money is `$inc`-ed, and the route refuses a subtraction that would leave a negative balance.
6. A level change hands out the role rewards that level earns, using the same function the message handler does.
7. A softban can be lifted even though the member is not in the server — they are banned, so they have no roles
   to compare, and running the hierarchy check there would refuse every lift.

**The greying is a courtesy; `actOn()` is the gate**, asked again before every write.

### 19.7 The owner journeys

All behind `requireOwner`, which answers **404** so a manager never learns the console is there.

| Journey               | Path                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Triage the fleet      | `/owner` → Overview → a server row → the detail card → "Open its settings" or Leave                    |
| Understand usage      | `/owner?tab=usage` → a window (7/30/90 days) → busiest and least-used commands                         |
| Turn a command off    | `/owner?tab=commands` → bot-wide switches; the per-server equivalent is `/guilds/:id/commands`         |
| Find out what broke   | `/owner?tab=logs` → level filter and a search that matches message **and** context                     |
| Run a command         | `/owner?tab=run` → pick one → the form is generated from its own options → the reply is drawn below    |
| Block somebody        | `/owner?tab=blacklist` → paste an ID, give a reason → the row appears with a name if Discord knows one |
| Leave a server        | `/owner` → the server's detail card → type its name → Leave                                            |
| Pause or stop the bot | `/owner?tab=control` → Pause is reversible here; Shut down is typed and final                          |

Three things shape these:

- **Each tab fetches its own data.** A failing `/owner/stats` used to blank the whole console, and the logs tab
  is precisely the screen you want when something is wrong.
- **The blacklist takes an ID, not a picker.** Somebody worth blocking is usually in no server the bot can still
  see, so there is no list to choose from. A row whose account Discord no longer knows still renders with its
  ID — an entry nobody can read is an entry nobody can lift.
- **The runner is an allowlist, and the list is the whole of what it can reach.** `ALLOWED_IN_DASHBOARD` in
  `src/lib/commandRunner.util.ts` opts a command in; `NEVER_IN_DASHBOARD` refuses one even if it somehow reaches
  the first list. The panel commands are not on it and will not be — a Components V2 tree serialised to JSON is
  not a settings page, which is why every other feature has its own screen instead.
- **There is no "start the bot".** The HTTP server is inside the bot process, so a stopped bot cannot serve the
  button that would start it. The Control tab says so in as many words.

### 19.8 When a control writes — the three shapes

Pick by the question being asked, not by which is less code. Getting this wrong is the most common way a screen
feels wrong without looking wrong.

| Shape                   | Writes                             | Use when                                                                              | Built example            |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------ |
| **Apply immediately**   | on every change                    | Each control is an independent decision. Most config                                  | Levelling, settings      |
| **Draft then Save**     | once, on an explicit Save          | The controls are **one** decision, and half of it applied is not a state anyone wants | Audit logging            |
| **Local, save on blur** | when the field is left, or on Save | A typed field. Per-keystroke would be a write per character                           | Welcome template, prefix |

Two corollaries:

- **Re-read before you write.** Every branch that changes data re-reads rather than trusting what the screen was
  rendered with. A balance shown 30 seconds ago may already be spent.
- **A whole-document answer is only trusted while it is the only write in flight** — see §10's write-race guard,
  and copy it exactly.

### 19.9 Confirmations — three tiers

| Tier              | Cost of a misclick                     | Examples                           |
| ----------------- | -------------------------------------- | ---------------------------------- |
| None              | Reversible from the same screen        | Every toggle, every picker, Pause  |
| Typed **name**    | Unrecoverable, but scoped to one thing | Clear all warnings, leave a server |
| Typed **literal** | Ends the process or affects everything | `shut down`                        |

**The server checks it too.** The browser asking for the name is the warning; `confirm !== guild.name` in the
route is what makes a hand-written request with an empty body impossible. A confirmation that exists only in the
form is decoration.

### 19.10 Navigation after an action

- **A destructive action that removes the thing you were looking at closes the card** and refetches the list it
  came from. Leaving a server does this.
- **A refusal never navigates.** The card stays open with the reason beside the control.
- **A value that changes as it is typed writes the URL with `replace: true`**, or Back walks the user through
  every keystroke. `OwnerPage`'s `put(key, value, replace)` is the shape to copy, and the request behind it is
  debounced (`useDebounced`) so a five-character search is one query rather than five.
- **Search params are merged, never replaced wholesale.** Paging with a fresh `URLSearchParams` drops the
  `?tab=` that got you there — there is a test pinning it.
- **A tab is `?tab=`**, so a link to a tab is a link to a tab and Back works between them.

### 19.11 Voice

- **Sentence case everywhere.** Headings, buttons, labels. Not Title Case.
- **A refusal says what to do next**, not what went wrong internally: "A user ID is 17 to 20 digits", not
  "Invalid input".
- **Say what a thing costs before it is done.** "Getting back in needs a fresh invite from someone still inside"
  belongs beside the Leave button, not in a toast afterwards.
- **Never blame.** Write refusals as advice.
- **British spelling**, matching the bot's own copy in `src/config/strings.ts`.
- **Second person.** Never "we" or "our" — this is the reader's bot, not a product team's.
- **A curly apostrophe in prose**, and a real `…` rather than three dots.

**Four of those are enforced.** `src/test/voice.test.ts` walks every `.tsx`, pulls the JSX text nodes and the
props that put a string on screen, and fails on an American spelling, a first person, `...` or a straight
apostrophe. The rest — never blame, say what a thing costs, sentence case — needs a reader, and the file says
so rather than pretending otherwise. It also asserts it found copy at all, so a matcher that stops matching
cannot pass vacuously.

### 19.12 Where to rewrite a journey

| To change…                       | Edit                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| What a screen does, step by step | `features/<name>/<Name>Page.tsx` — routing and states only     |
| A rule inside a journey          | `features/<name>/<name>.utils.ts` — testable without rendering |
| When a control writes            | `features/<name>/use<Name>.ts`                                 |
| The order of screens             | `config/navigation.ts` and `routes.tsx`                        |
| What the overview grid promotes  | `config/features.ts`                                           |
| The words                        | The component — there is no string table on this side          |

A page holds routing, loading and error branches and **nothing else**. Anything with a rule in it — which tab a
URL means, what a page count is, which channels can be posted in — belongs in a `.utils.ts` beside it where it
can be tested without rendering.

---

## 20. The 58 rules

Taras Bakusevych's [58 rules for beautiful UI design](https://uxdesign.cc/58-rules-for-stunning-and-effective-user-interface-design-ea4b93f931f6),
carried here as a working checklist for the rewrite. Almost none of it is covered by the skills in
[`.claude/skills`](../../.claude/skills/README.md) — only typography's kerning rule overlaps — so this is
additional, not a restatement.

Each rule gets a verdict, because a checklist where everything is "todo" is not a checklist:

- **Held** — the dashboard already does this. Do not undo it; §18 or §19 records how.
- **Apply** — a real gap. This is the rewrite's actual worklist.
- **N/A** — deliberately not applicable to a self-hosted admin dashboard, with the reason. Ignoring these is a
  decision, not an oversight; a bot's settings panel is not a consumer app competing for attention, and several
  of these rules assume it is.

### 🫀 Empathy (1–4)

| #   | Rule                            | Verdict | Note                                                                                                                      |
| --- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cultural and societal influence | Held    | Sentence case, British spelling, no idiom, no flags-as-languages. Colour is never the only signal                         |
| 2   | Industry and context of use     | Held    | The context is a Discord server admin at a desk with the bot open in another window                                       |
| 3   | User demographics               | Apply   | The audience is one narrow group — a self-hoster who runs a bot. Write for them specifically, not for a generic "user"    |
| 4   | Tech-savviness                  | Held    | It already assumes somebody who can read an ID and edit a `.env`. §19.2's setup screen is the one place that assumes less |

### 🖼️ Layout (5–10)

| #   | Rule                              | Verdict | Note                                                                                                                                                                         |
| --- | --------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | Negative space                    | Held    | The settings page's dead space was measured, not eyeballed: 48px above a tab with no description, and 276px of page from one card's source order inside a `columns` balancer |
| 6   | Golden ratio or rule of thirds    | N/A     | A settings form is a single column of cards; proportion here is the spacing ladder in §18.6, not a ratio                                                                     |
| 7   | Hierarchy via size, colour, space | Held    | §18.4 — four type sizes, and muted vs foreground carries the rest                                                                                                            |
| 8   | Grid systems                      | Held    | `max-w-[1100px]`, one `gap-6` column, `sm:grid-cols-2` inside cards                                                                                                          |
| 9   | A clear focal point               | Held    | `Card focal` puts an accent hairline on the one card that is the point of a screen, and a browser sweep counts `[data-variant="primary"]` on every route                     |
| 10  | Rhythm to direct attention        | Held    | The F-pattern now holds on every list: recent changes lead with what changed rather than when, and both tables put the identifier left and the figures right                 |

### 🎟 Essentialism (11–16)

| #   | Rule                               | Verdict | Note                                                                                            |
| --- | ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| 11  | Simplicity by reduction            | Held    | §21's "two commands that do one job" is the same instinct applied to the bot                    |
| 12  | Organisation makes many look fewer | Held    | Collapsible sidebar sections, the eight-tab owner console, seven settings sections on one page  |
| 13  | Don't make users think             | Held    | A channel the bot cannot post in is disabled **before** saving, not refused after               |
| 14  | As little design as possible       | Held    | No drop shadows, no chart library, one accent colour                                            |
| 15  | Break big tasks into steps         | N/A     | There is no multi-step task here. The one long flow — OAuth — is Discord's                      |
| 16  | Savings in time feel simple        | Apply   | Debounced search is in; smart defaults and a jump-to-your-own-row exist only on the leaderboard |

### 🧭 Guidance (17–22)

| #   | Rule                       | Verdict | Note                                                                                                                                                                      |
| --- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | Engaging onboarding        | Apply   | §19.2 covers the half-install. A first-run tour of what the dashboard can do does not exist                                                                               |
| 18  | Intuitive flow             | Held    | §19.5 — overview grid to feature screen, and the grid is the navigation                                                                                                   |
| 19  | Contextual hints and tips  | Held    | `Field`'s `hint`, hierarchy warnings, `Tooltip` — which describes, never names (§11)                                                                                      |
| 20  | Progressive disclosure     | Held    | `Disclosure` groups the settings page's seven cards under three questions. A `<details>`, so the fold is keyboard-operable and announced without an `aria-*` to get wrong |
| 21  | Design to encourage action | Held    | Settled with 9 — exactly one primary action per route, verified in a browser rather than by reading                                                                       |
| 22  | Feedback for every action  | Held    | `SavingIndicator`, optimistic writes, a refusal beside its control (§19.1)                                                                                                |

### 💎 Typography and colour (23–34)

| #   | Rule                            | Verdict | Note                                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | Typography hierarchy            | Held    | §18.4                                                                                                                                                                                                                                                                                                   |
| 24  | Prioritise readability          | Held    | Inter, 14px body, `font-mono` reserved for IDs                                                                                                                                                                                                                                                          |
| 25  | Reflect brand mood              | Held    | Three self-hosted faces where there had been none, and the section label is the bot's own boot banner in HTML. The type is no longer anonymous                                                                                                                                                          |
| 26  | Pair fonts wisely               | Held    | Two: Inter and JetBrains Mono, each with one job                                                                                                                                                                                                                                                        |
| 27  | Limit font and style variations | Held    | §18.4 — four sizes carry 96% of the app                                                                                                                                                                                                                                                                 |
| 28  | Line spacing, kerning, height   | Held    | Body is 1.55, headings 1.2, card headings `leading-tight` on `CARD_HEADING` because a size utility beats both `@theme` and the base layer. Measured, not assumed                                                                                                                                        |
| 29  | Contrast is key                 | Held    | **Closed.** Phase 0 computed every pair, found two live AA failures, and split fill from text to fix them. `lib/contrast.ts` reads the tokens out of `index.css` in the test suite, so the table cannot drift from the palette                                                                          |
| 30  | Consistent palette              | Held    | §18.2, and no component may write a colour                                                                                                                                                                                                                                                              |
| 31  | The 60–30–10 rule               | Held    | **Measured** across six screens: 67% ground, 33% surface, 0.2% accent by area. The first two are the rule; the third is deliberately far below 10%, because accent _area_ on an admin tool would be a toy. It appears on every screen — 10 to 26 elements each, as text, borders, icons and small fills |
| 32  | Colour psychology and culture   | Held    | Green/amber/red carry success, warning and destructive, and never alone                                                                                                                                                                                                                                 |
| 33  | Semantic colours for status     | Held    | `Badge` tones, `Warning`, the destructive button variant                                                                                                                                                                                                                                                |
| 34  | Colour to guide action          | Held    | One primary per screen, and the pairs that were never primary-and-secondary — Add/Take, Set level/Change XP — now weigh the same as each other                                                                                                                                                          |

### 🖼 Visual content (35–40)

| #   | Rule                       | Verdict | Note                                                                                                                                                                                                     |
| --- | -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 35  | Content over UI styling    | Held    | The reason there are no shadows and no chart library                                                                                                                                                     |
| 36  | Purposeful imagery         | Held    | The only images are real Discord avatars and icons; `Avatar` falls back to a lettered tile                                                                                                               |
| 37  | Concise text               | Held    | **Measured**: nothing runs to three lines at 1440px, and the four owner-console paragraphs that ran to four at 390px are down to three at 24–26 words. The rest each carry two facts a self-hoster needs |
| 38  | Micro-interactions         | Held    | §18.8 — four short animations, and `prefers-reduced-motion` removes them all                                                                                                                             |
| 39  | Video for storytelling     | N/A     | An admin panel has nothing to narrate, and a video is a dependency and a bundle cost                                                                                                                     |
| 40  | High-quality product shots | N/A     | There is no product to photograph                                                                                                                                                                        |

### 🛸 Novelty (41–46)

| #   | Rule                                 | Verdict | Note                                                                                                                                                      |
| --- | ------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 41  | Originality and uniqueness           | Apply   | Better — a display face, the console voice, a WebGL field. Still recognisably a dashboard, and this one is the reader's call rather than mine             |
| 42  | Leverage the latest technology       | Held    | Tailwind v4 CSS-first, React 19, a WebGL backdrop that costs nothing when unwanted                                                                        |
| 43  | Most advanced, yet acceptable        | Held    | The backdrop is the whole of the risk taken, and it degrades to a CSS wash                                                                                |
| 44  | Inspiration from other industries    | Held    | `Eyebrow` is the terminal boot banner `bannerLines()` prints on every start, rendered as HTML. It looks at the bot itself rather than at other dashboards |
| 45  | Trends, but not blindly              | Held    | No glassmorphism, no neumorphism, no gradient text                                                                                                        |
| 46  | Novelty must enhance, not complicate | Held    | The rule that keeps the backdrop `aria-hidden` and `pointer-events-none`                                                                                  |

### 🎛 Consistency (47–52)

| #   | Rule                            | Verdict | Note                                                                                                                                                 |
| --- | ------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 47  | A comprehensive design system   | Held    | §18 is that document, and `@theme` is its single source                                                                                              |
| 48  | Limit design patterns           | Held    | §19.8 — three write shapes, and you pick by the question rather than inventing a fourth                                                              |
| 49  | Predictable element behaviour   | Held    | One `Field`, one `Button`, one `Card`; `components/primitives` before a local copy                                                                   |
| 50  | Standardised templates          | Held    | §7's six edits, and every page opens with a `PageHeader`                                                                                             |
| 51  | Cross-device consistency        | Held    | §13's three widths, and `sr-only` rather than `hidden` at the rail                                                                                   |
| 52  | Standardised content guidelines | Held    | `src/test/voice.test.ts` enforces the four mechanical rules on every run. The judgement calls stay judgement calls, and the file says which is which |

### 🕹 Engagement (53–58)

| #   | Rule                      | Verdict | Note                                                                                                                                   |
| --- | ------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 53  | Gamification              | N/A     | Points and badges belong in the bot's levelling feature, which the dashboard **configures**. Gamifying the admin panel would be absurd |
| 54  | Personalisation           | N/A     | The panel is already scoped to your servers. A theme picker is §21's open question, not engagement                                     |
| 55  | Storytelling              | N/A     | An admin changing a prefix wants the control, not a narrative                                                                          |
| 56  | Visually display progress | Held    | `SavingIndicator`, `Pager`, the `/commands` coverage tile                                                                              |
| 57  | Variable rewards          | N/A     | Deliberately not. Unpredictable reinforcement in a tool somebody has to use for work is a dark pattern                                 |
| 58  | Social features           | N/A     | There is nothing to share, and the audit log is the opposite of a social feed                                                          |

### What this adds up to

**Forty-five held, four to apply, nine deliberately not applicable** — the rewrite in
[`re-write.md`](re-write.md) closed thirteen, and the three clusters it was aimed at are all shut:

1. **No focal point** (9, 10, 21, 34) — closed. `Card focal` marks the one card that is the point of a screen,
   and a browser sweep counts primary buttons on every route so the rule cannot quietly drift back.
2. **The type and palette are anonymous** (25, 28, 31, 44) — closed. Three self-hosted faces where `@theme`
   had named one with no `@font-face` behind it, a line-height scale where there had been Tailwind's defaults,
   a measured 67/33/0.2 colour balance, and a section label that is the bot's own boot banner rather than a
   borrowed dashboard idiom. 41 stays open and is a judgement call rather than a defect.
3. **Contrast is unverified** (29) — closed. Every pair is computed in the test suite from the tokens
   themselves, and the two live AA failures it found are fixed.

**The four that remain are honestly open**, not quietly downgraded:

- **3** — the copy is written for a self-hoster, but nothing states who the reader is in one place, so each
  screen decides for itself.
- **16, 17** — a first-run tour, and smart defaults beyond the leaderboard's Find me. Both are features rather
  than styling, which is why a restyle did not reach them.
- **41** — better, and still recognisably a dashboard. This one is the reader's call rather than the author's.

---

## What is left

`design-plan/13-ROADMAP-AND-RISKS.md` is authoritative. As of the last commit, **phases 3 and 4 are
complete** — every guild-scoped setting is editable on the web, and a manager can handle a problem member
without opening Discord. Phase 5 is all but done: leaving a server and the bot-wide blacklist are built.

**Phase 5 is complete** too: the owner console now carries the command runner, the blacklist and leaving a
server. `design-plan/06-COMMAND-CONTROL.md`'s conclusion still governs everything after it — the dashboard is
a third surface onto the **domain**, not onto the presentation, and the runner is the one place an adapter is
right because owner commands are one-shot and embed-based. `/eval` is never exposed.

Still open:

- **Phase 6** — a Docker image and compose file, README screenshots, and a light theme if wanted. §18.10 is the
  order to do the last one in. The manual half of the accessibility pass is **done**: reflow at 320px, a visible
  focus indicator on every keyboard stop, `prefers-reduced-motion`, and a tab walk for traps, all run in a real
  browser. [`re-write.md`](re-write.md) §9 records what they found and the exemptions worth keeping.
