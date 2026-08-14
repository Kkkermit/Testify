# 13. Roadmap and risks

## Phases

Each phase ends with something demonstrable, `npm run check` green, and no half-finished screen behind a feature
flag. Estimates assume one person working in evenings; halve them for full days.

### Phase 0 — Foundations (~1 week) — **done**

Nothing user-visible. Get the plumbing right or every later phase pays for it.

- npm workspaces; `shared/` with zod schemas and `permissions.ts`.
- Hono server in `src/api/`, started after login, closed in the existing shutdown path, with `runRoute` catching
  everything so a route bug cannot kill the bot.
- `dashboardSession` and `dashboardAudit` schemas plus repositories.
- Vite app that renders "hello" and proxies `/api` in development.
- Jest + RTL + MSW wired into the root `npm test`, one passing test each side.
- CI builds both.

**Done when:** `npm run dev:all` gives a React page calling `/api/health` through the proxy, and `npm run check`
passes for both projects.

Two things this phase found that were not in the plan, both recorded in `CLAUDE.md` §24:

- **`@testify/shared` cannot be a `tsconfig.json` path.** `tsc-alias` rewrites every alias in that map to a
  relative path inside `dist/`, and nothing outside `src/` is emitted there — it resolved the package to
  `dist/index.js`, the bot's own entry point. So the workspace ships a real build and resolves like any other
  package, while TypeScript, Jest and Vite all read its source.
- **Jest with MSW needs three pieces of configuration**, none of them guessable: `jest-fixed-jsdom`, a
  `transformIgnorePatterns` allowlist for MSW's ESM-only dependencies, and a React pin, because
  `discord-html-transcripts` puts React 18 in the root `node_modules`.
- **Vite needs the same React pin, and the browser is where it bites.** The hoisted React 18 also captures
  `@tanstack/react-query` and `react-router`, which then run their hooks against a different React than the one
  rendering — a blank page and `Cannot read properties of null (reading 'useEffect')`. `resolve.dedupe` and
  explicit aliases fix it; `npm run verify:bundle` fails the build if a second copy ever returns.

### Phase 1 — Sign in and guild picker (~1 week) — **done**

The riskiest part, so it comes early.

- Full OAuth2 flow with `state` + PKCE, sessions, cookies, CSRF middleware, rate limiting.
- `GET /api/auth/me` and the guild intersection.
- `requireGuild` and `requireOwner`, with the permission tests that prove they can fail.
- `/sign-in`, `/guilds`, `RequireAuth`, the app shell, the design tokens.
- The setup screen for a misconfigured install.

**Done when:** you sign in, see your manageable guilds, and a user without Manage Server gets 403 on their next
request after being demoted — verified live, not just in a test.

Built with the guild overview and the owner console alongside, since both are read-only and fall out of the same
middleware. What this phase turned up, beyond the plan:

- **`serveDashboard` has to be registered after every route.** It is a catch-all, so anything behind it never
  runs — which showed up as routes returning 404 rather than as anything failing loudly.
- **The SPA's path cannot be resolved through `assetPath`.** That lands inside `dist/` after a build, so the
  built bot looked for `dist/dashboard/dist` and served a 404 for every page. Nothing but a real HTTP request
  caught it; there is a test pinning it now.

### Phase 2 — Guild overview and levelling (~1½ weeks) — **done**

The vertical slice that proves the architecture. Levelling first because it is the freshest, richest config and
its rules already live in `src/lib/levelling.util.ts`.

- `/overview`, `/channels`, `/roles` with `canSend` and `assignableByBot`.
- Full levelling routes and page: four tabs, role and channel pickers, hierarchy warnings at configuration time.
- Optimistic updates with rollback; the audit log written and shown on the overview.
- `jest-axe` clean; the manual keyboard pass done.

**Done when:** levelling can be configured end to end from the browser and the change is visible in
`/levelling edit` in Discord.

`jest-axe` is wired in now (see `10-ACCESSIBILITY.md`); the live check against a running bot is still
outstanding, as this sandbox has neither Discord nor a MongoDB binary. What this phase settled:

- **`LEVEL_LIMITS` had to move into `@testify/shared`.** The plan had the shared schemas importing it from
  `src/lib/`, which inverts the dependency — `shared/` is consumed by the browser and cannot reach into the bot.
  It lives in shared now and `levelling.util.ts` re-exports it, so every existing caller is unchanged.
- **Hono does pass a mount-path parameter into a sub-app.** Worth recording because the opposite looked true for
  a while: a 404 during this phase was a trailing slash in a test URL, not the router.

### Phase 3 — The rest of the settings (~2 weeks) — **done**

Repetitive by design — phase 2 built the pattern, this applies it. **Welcome is done** and is the worked example
for the rest: `WELCOME_LIMITS`, the placeholders and `fillTemplate` moved into `@testify/shared`, so the
dashboard's live preview fills the template with the same function the bot posts with, and the API reuses
`normaliseWelcome` rather than reimplementing the migration off the old `isEmbed` flag.

Two shapes worth copying from it:

- **A typed field is not a toggle.** Every other control writes on change; the message template is held in local
  state and saved on blur or on an explicit Save, with Discard beside it. Saving per keystroke would be a write
  per character.
- **"Off" can be the absence of a record.** The welcome document is deleted rather than flagged, so the API
  turns that into `enabled: false` plus the defaults a form needs to render — a 404 would make the screen
  unbuildable.

**Audit logging is done** too, and is the other half of the pattern: where welcome writes per control, this one
holds a draft and writes once, mirroring the panel's Save button. Three things it settled:

- **The event list, its labels and the `all` shorthand moved into `@testify/shared`.** They were declared in
  `src/lib/auditLog.util.ts` and again inside `auditPanel.util.ts`; a third copy in the browser would have been
  the moment the two surfaces started disagreeing about which events a guild logs. `src/lib/` re-exports, so no
  caller changed.
- **`all` has to survive a round trip.** The API expands it for the checklist and collapses a full selection back
  on save, because storing eighteen names would freeze the guild at today's list rather than opting it into
  events added later. The dashboard says so on screen when everything is ticked.
- **Mounting a sub-app is the step that fails silently**, and a request cannot detect it: `requireGuild` refuses
  an anonymous caller before the router decides there is no handler, so a missing `guilds.route(…)` line looks
  exactly like a permission refusal. `tests/api/server.test.ts` reads Hono's route table instead, and that test
  was proved able to fail.

**Prefix, anti-link, roles on join, counting and voice stats are done** as well, and they answered a question
the plan left open: whether every setting needs its own screen. They do not. Five small independent switches on
one **Server settings** page read better than five sidebar entries, and each still has its own endpoint — so a
refusal in one section leaves the other four alone. Two details worth copying:

- **A page of sections is not a page with one Save.** Each section writes on change, because each is an
  independent decision. The one typed field on it, the prefix, is held locally and saved on blur, exactly as the
  welcome template is.
- **Every write answers with the whole settings document.** One response keeps the page consistent, so a section
  that refuses cannot leave the rest of the screen showing a value the bot does not have.

**Per-command switches are done** as well, in both scopes: a server can turn a command off for itself, and the
owner can turn one off everywhere. `checks.ts` is the gate — hiding a switch is not access control — and
`ALWAYS_ENABLED` keeps `/help` reachable so a server cannot lock itself out.

**Verification is done** as a section on the same page, and it settled one thing the earlier sections did not
have to: a write can have a side effect in a public channel. Posting the panel is its own explicit action rather
than something a channel change implies, and that section alone is not optimistic — a control that moved before
the server agreed would be claiming a message had been sent that may not have been. `publishVerifyPanel` moved
into `src/lib/verifyActions.util.ts` so the button and the route post the identical panel.

**Sticky is done**, and it is the first screen here that is a list rather than a form. Two things it settled:

- **A list keyed by something is not a settings section.** One sticky per channel is a unique index underneath,
  so the channel is the identity: `PUT` upserts, and a channel that already has one is dropped from the add
  picker rather than refused after the fact.
- **`DELETE` carries its key in the path.** A proxy is free to drop a body on `DELETE` and some do, so the
  channel is a path parameter and `api.delete` needs no body at all.

**Automod, treasure, tickets and lottery are done** too, each extracting what still lived inside a command
`run()` into a `*Actions.util.ts` on the way (`06-COMMAND-CONTROL.md`). Phase 3 is complete.

**Done when:** every guild-scoped setting the bot has is editable on the web. — **done**

### Phase 4 — Members, moderation, economy (~1½ weeks) — **done**

- Leaderboards as accessible tables; member detail page.
- Warnings, softbans, unban through `moderationActions.util.ts`, with the actor-hierarchy checks added there.
- XP grants and level sets that also apply role rewards.
- Destructive actions behind typed-name confirmation.

**Done when:** a manager can handle a problem member without opening Discord. — **done**

### Phase 5 — Owner console (~1 week) — **done**

- Stats, guild table, leave guild, blacklist.
- The generated command runner over the allowlist.
- The error ring buffer, if you want `/owner/errors`.

**Done when:** you can answer "which of my servers is misconfigured" in one screen. — **done**

**Built:** the seven-tab console — fleet stats and a clickable guild table, command-usage analytics, per-command
switches, a searchable log feed at every level, the bot-wide blacklist, a runtime card, and pause / rename /
shut down. Leaving a server is on the guild detail card, behind its name typed out.
**The generated command runner is built** as an eighth tab, over an allowlist. Three things it settled:

- **The adapter earns its place only here.** `DashboardInteraction` captures replies rather than sending them,
  which works because owner commands are one-shot and embed-based. The panel commands are still promoted to
  their own screens, exactly as `06-COMMAND-CONTROL.md` concluded.
- **Two lists, not one.** `ALLOWED_IN_DASHBOARD` opts a command in and `NEVER_IN_DASHBOARD` refuses one
  regardless — so a mistaken addition to the first cannot expose `/eval`. A test walks the real registry, so a
  name that is not a command fails rather than silently offering nothing.
- **Degrading honestly beats degrading quietly.** A reply's buttons cannot work in a browser, and the response
  says the reply carried some rather than showing less than the command did.

Two things the blacklist and leave settled:

- **A destructive confirmation is checked by the server, not by the form.** The browser asks for the server's
  name because a misclick should be impossible; `confirm !== guild.name` in the route is what makes a
  hand-written request with an empty body impossible too. The same split as every other gate here.
- **A row has to survive the account behind it disappearing.** A blacklisted user is usually in no server the
  bot can see, so the name comes from a REST lookup that is allowed to fail — and the row still renders with
  its id, because an entry nobody can read is an entry nobody can lift.

Two things the control tab settled, both worth recording because they are properties of the architecture rather
than choices:

- **There is no "start the bot".** The HTTP server is inside the bot process, so a stopped bot cannot serve the
  button that would start it. Pause is a flag honoured by `runChecks` and `runMessageHandlers`, which is what
  "stopped" means to a server and is reversible from the same screen; shutting down is real and says plainly
  that only the host can undo it.
- **Discord has no per-guild avatar for bots.** The global name and picture are owner-only; a manager gets a
  per-server nickname and nothing else. A per-guild picture control would be a button that cannot work.

Open question 3 is answered: the ring buffer is worth it, and it turned out to be a pino `logMethod` hook
rather than a transport, which is a dozen lines. Three things it settled:

- **Usage had to be counted, not logged.** A row per invocation grows without bound; one row per command per
  server per day per surface, `$inc`-ed in place with a TTL, answers every question this console asks.
- **No user IDs are stored, and that is a decision rather than an omission.** A self-hoster's analytics turning
  into a per-person activity log is a much worse default than not being able to answer "who ran that".
- **The buffer redacts on the way in, not on the way out.** A dashboard page is easier to read over someone's
  shoulder than a terminal, and a line that was never stored with a connection string in it cannot leak one
  through a future endpoint.

### Phase 6 — Polish (~1 week) — **done, bar what needs a person or a Docker daemon**

Terms and privacy pages are built, and they sit **outside** `RequireAuth`: somebody deciding whether to add the
bot has to be able to read them before signing in. Both are written for a self-hosted bot — the operator is
whoever runs the instance, not the project — and the privacy notice lists what is actually stored, with tests
pinning the four claims the code has to keep true.

- Full accessibility pass — **the checkable half is done and holds**, verified in a real browser rather than
  in jsdom:
  - **Reflow (1.4.10)**: no two-directional scrolling on any of 16 routes at 640 or 320 CSS px.
  - **Reduced motion**: the backdrop canvas is not rendered, the three.js chunk is not fetched at all, nothing
    animates over 50ms, and no screen loses content.
  - **Colour alone (1.4.1)**: every `Badge` states its status in text, and `Warning` and `SavingIndicator`
    each carry an icon plus a word. Colour is redundant everywhere it is used.
  - **Keyboard**: the skip link works, and the mobile drawer sets `aria-expanded`, moves focus inside itself,
    traps Tab and closes on Escape.
  - Still needs a human: a real screen reader, and greyscale judgement on the feature tints.
- Bundle budget check (<200 kB gzipped first load). **Measured at 200 kB**, against 152 kB before i18next.
  three is not in the first load at all, and neither are the Spanish, German and French dictionaries —
  `i18next-resources-to-backend` gives each its own chunk, so a session fetches the one language it reads
  rather than all four. Bundling all four costs 19 kB and takes it over. The budget is now met exactly, so
  the next addition to `vendor` needs a measurement rather than an assumption.
- **Docker image and compose file — done**, with [`../../hosting.md`](../../hosting.md) as the guide. Two
  stages, running as `node`, no secret in a layer, and the dashboard's React tree installed at build time only.
  Two findings worth keeping: `fonts-dejavu-core` is **required**, because `@napi-rs/canvas` statically links
  Skia but resolves font families through the OS, so a slim base renders every card's layout and none of its
  text; and `DASHBOARD_BIND` must be `0.0.0.0` in a container, since the `127.0.0.1` default is the container's
  own loopback and a published port reaches nothing. The image has **not been built** — the environment it was
  written in has no Docker daemon — though the production-only install, the compiled layout and
  `docker compose config` were each verified directly.
- **README screenshots — done.** Five, in [`../screenshots/`](../screenshots/README.md), captured from the
  built bundle against stub responses so no real server or account is in one. Both themes appear deliberately.
  `docs/contributing.md` already carries the dashboard section, including how to add a language.
- **Light theme — done**, and it is not an afterthought: every colour in `index.css` is one `light-dark()` line
  holding both schemes, and `contrast.test.ts` reads **both halves** and checks each against WCAG, so a light
  value nobody looked at fails the build. The switch is `color-scheme` and nothing else.
- **Appearance customisation — done**, beyond what this phase asked for: six accents, a motion override that
  wins in both directions, and the language picker. All three are one `Preference` mechanism — an attribute on
  the root element, a `localStorage` key, and a fallback that _removes_ the attribute so the CSS answers before
  any script runs. Every accent is measured against both backgrounds.
- **Narrow widths — done.** Ten routes at 390 and 820 CSS px carry no horizontal overflow and no page error.
  Two defects that only exist on a phone were fixed there: the owner console's eight-tab strip cut with nothing
  saying five tabs sat past the edge, and landing on a later tab left the strip at its start with none marked.

Roughly eight to nine weeks of evenings. Phases 0–2 are the ones that must not be rushed; 3 is mechanical.

## Risks

| Risk                                            | Likelihood | Impact | Mitigation                                                                                       |
| ----------------------------------------------- | :--------: | :----: | ------------------------------------------------------------------------------------------------ |
| A session leak becomes bot control              |    Low     | Severe | httpOnly + Secure + short TTL, `logout-all`, audit log, **no `/eval`** (`06-COMMAND-CONTROL.md`) |
| An API bug crashes the bot process              |   Medium   |  High  | `runRoute` catches everything; the API starts after login; no synchronous heavy work             |
| Permission check fails open on stale data       |    Low     | Severe | Live `members.fetch` per request; tests that are proven able to fail (`04-PERMISSIONS.md`)       |
| `guildId` read from a body instead of the path  |   Medium   | Severe | One middleware sets `c.get("guild")`; make it a review rule and a lint-able pattern              |
| Two sources of truth for config rules           |    High    | Medium | Shared zod schemas importing `LEVEL_LIMITS` etc. from `src/lib/` (`05-API.md`)                   |
| Scope creep from "control all commands"         |    High    | Medium | The allowlist, and the domain-layer principle instead of an interaction adapter                  |
| Self-hoster exposes the dashboard on plain HTTP |   Medium   |  High  | Off by default, bind to localhost, checklist in the README, `Secure` cookies fail loudly         |
| Bundle bloat                                    |   Medium   |  Low   | Lazy routes, per-icon imports, a stated budget, no chart library                                 |
| Accessibility left to the end                   |   Medium   | Medium | `jest-axe` in CI from phase 1; a manual pass is an exit criterion for every phase                |
| Discord changes OAuth or rate limits            |    Low     | Medium | Standard flow, no undocumented endpoints, version-pinned API path (`/api/v10`)                   |
| Dashboard and Discord panels drift apart        |   Medium   | Medium | Both call the same repositories and the same `*.util.ts` rules                                   |
| Mongo bloat from sessions and audit records     |    Low     |  Low   | TTL index on sessions; capped or TTL'd audit collection                                          |
| Maintenance burden doubles                      |   Medium   | Medium | Accept it. A dashboard is a second product; it is why phases 0–2 build a repeatable pattern      |

## Open questions

Worth deciding before phase 2, because each changes work later.

1. **Moderator-level access.** The POC has two roles. Do you want a third — a per-guild allowlist of roles that
   grant dashboard access without Manage Server? It needs its own storage and its own UI, and it undermines the
   "no second permission system" rule from `04-PERMISSIONS.md`. Recommendation: not in the POC; revisit with real
   demand.
2. **Public or private.** Is this dashboard only for your bot instance, or does every self-hoster run their own?
   The plan assumes the latter, which is what makes "off by default" and the localhost bind correct. A hosted
   multi-tenant deployment would need per-instance secrets and a very different threat model.
3. **The error ring buffer.** It is new bot code (a pino transport or wrapper) and it is the difference between
   "someone says it broke" and "here is the stack". Phase 5, or earlier if support load justifies it.
4. **Kick and ban.** Deliberately excluded (`05-API.md`). Softban covers the reversible case. If you want them,
   they need a stronger confirmation than typing a name.
5. **Light theme.** ~~Phase 6 or never.~~ **Answered: built.** The worry was right — an unverified light theme
   is worse than none — so `contrast.test.ts` reads both halves of every token out of `index.css` and checks
   each against WCAG. Two things it caught are worth keeping in mind: a pair can pass for the wrong reason
   (check the colour the component actually draws, not the token you assume it uses), and elevation cannot
   simply be recoloured — a drop shadow reads as a smudge on near-black, an inset highlight is invisible on
   paper, so `surface-edge` switches technique by theme.
6. **Realtime.** Everything here is request/response. Live member counts or a live audit feed would want SSE
   (simpler than WebSockets, and one-directional is all this needs). Not in the POC; the polling in TanStack
   Query is enough.

## What would make this fail

Named plainly, because each has killed a project like this before:

- **Building the UI before the permission layer.** It is much harder to retrofit `requireGuild` into fifteen
  routes than to write it once in phase 1.
- **Exposing `/eval` "just for now".** It never comes back out, and the entire security posture depends on not
  doing it.
- **Letting the dashboard own logic.** The moment a validation rule exists only in a route handler, the two
  surfaces disagree, and every bug after that lives in the seam.
- **Treating accessibility as a phase.** It is 20% more work done continuously and 200% more work done at the
  end.
- **Shipping a dashboard that needs a second service.** The value proposition for a self-hosted bot is "one
  process, one command". Losing that loses the audience.
